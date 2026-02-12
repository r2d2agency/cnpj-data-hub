import axios from 'axios';
import * as unzipper from 'unzipper';
import csv from 'csv-parser';
import { pool } from '../db/pool';
import { Readable } from 'stream';

// =============================================
// Receita Federal Ingestion Worker
// Downloads ZIPs, extracts CSVs, inserts into PostgreSQL
// =============================================

const BATCH_SIZE = 5000;

// Column mappings for each RF file type (CSV has no headers, uses ; delimiter)
const FILE_CONFIGS: Record<string, {
  zipPrefix: string;
  zipCount: number;
  table: string;
  columns: string[];
  conflictKey: string;
}> = {
  empresas: {
    zipPrefix: 'Empresas',
    zipCount: 10, // Empresas0.zip to Empresas9.zip
    table: 'empresas',
    columns: ['cnpj_basico', 'razao_social', 'natureza_juridica', 'qualificacao_responsavel', 'capital_social', 'porte_empresa', 'ente_federativo'],
    conflictKey: 'cnpj_basico',
  },
  estabelecimentos: {
    zipPrefix: 'Estabelecimentos',
    zipCount: 10,
    table: 'estabelecimentos',
    columns: [
      'cnpj_basico', 'cnpj_ordem', 'cnpj_dv', 'identificador_matriz_filial',
      'nome_fantasia', 'situacao_cadastral', 'data_situacao_cadastral',
      'motivo_situacao_cadastral', 'nome_cidade_exterior', 'pais',
      'data_inicio_atividade', 'cnae_principal', 'cnae_secundario',
      'tipo_logradouro', 'logradouro', 'numero', 'complemento', 'bairro',
      'cep', 'uf', 'municipio', 'ddd1', 'telefone1', 'ddd2', 'telefone2',
      'ddd_fax', 'fax', 'email', 'situacao_especial', 'data_situacao_especial',
    ],
    conflictKey: 'cnpj_basico, cnpj_ordem, cnpj_dv',
  },
  socios: {
    zipPrefix: 'Socios',
    zipCount: 10,
    table: 'socios',
    columns: [
      'cnpj_basico', 'identificador_socio', 'nome_socio', 'cpf_cnpj_socio',
      'qualificacao_socio', 'data_entrada', 'pais', 'representante_legal',
      'nome_representante', 'qualificacao_representante', 'faixa_etaria',
    ],
    conflictKey: '', // socios has no unique constraint, we truncate + insert
  },
  municipios: {
    zipPrefix: 'Municipios',
    zipCount: 1,
    table: 'municipios',
    columns: ['codigo', 'descricao'],
    conflictKey: 'codigo',
  },
  naturezas: {
    zipPrefix: 'Naturezas',
    zipCount: 1,
    table: 'naturezas_juridicas',
    columns: ['codigo', 'descricao'],
    conflictKey: 'codigo',
  },
  qualificacoes: {
    zipPrefix: 'Qualificacoes',
    zipCount: 1,
    table: 'qualificacoes',
    columns: ['codigo', 'descricao'],
    conflictKey: 'codigo',
  },
  paises: {
    zipPrefix: 'Paises',
    zipCount: 1,
    table: 'paises',
    columns: ['codigo', 'descricao'],
    conflictKey: 'codigo',
  },
  cnaes: {
    zipPrefix: 'Cnaes',
    zipCount: 1,
    table: 'cnaes',
    columns: ['codigo', 'descricao'],
    conflictKey: 'codigo',
  },
};

async function updateJobStatus(jobId: string, status: string, progress: number, extra: Record<string, any> = {}) {
  const sets = ['status = $2', 'progress = $3'];
  const values: any[] = [jobId, status, progress];
  let idx = 4;

  if (extra.records_processed !== undefined) {
    sets.push(`records_processed = $${idx}`);
    values.push(extra.records_processed);
    idx++;
  }
  if (extra.total_records !== undefined) {
    sets.push(`total_records = $${idx}`);
    values.push(extra.total_records);
    idx++;
  }
  if (extra.error_message !== undefined) {
    sets.push(`error_message = $${idx}`);
    values.push(extra.error_message);
    idx++;
  }
  if (status === 'completed' || status === 'error') {
    sets.push(`completed_at = NOW()`);
  }

  await pool.query(`UPDATE ingestion_jobs SET ${sets.join(', ')} WHERE id = $1`, values);
}

async function processCSVStream(stream: Readable, config: typeof FILE_CONFIGS[string], jobId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let batch: any[][] = [];
    let totalProcessed = 0;

    const csvStream = stream.pipe(csv({
      separator: ';',
      headers: false,
      quote: '"',
    }));

    csvStream.on('data', (row: any) => {
      // csv-parser with headers:false gives { '0': val, '1': val, ... }
      const values = config.columns.map((_, i) => {
        const val = row[String(i)] || '';
        return val.trim();
      });
      batch.push(values);

      if (batch.length >= BATCH_SIZE) {
        csvStream.pause();
        insertBatch(config, batch, jobId, totalProcessed)
          .then((count) => {
            totalProcessed += count;
            batch = [];
            csvStream.resume();
          })
          .catch(reject);
      }
    });

    csvStream.on('end', async () => {
      try {
        if (batch.length > 0) {
          totalProcessed += await insertBatch(config, batch, jobId, totalProcessed);
        }
        resolve(totalProcessed);
      } catch (err) {
        reject(err);
      }
    });

    csvStream.on('error', reject);
  });
}

async function insertBatch(config: typeof FILE_CONFIGS[string], batch: any[][], jobId: string, currentTotal: number): Promise<number> {
  if (batch.length === 0) return 0;

  const client = await pool.connect();
  try {
    const cols = config.columns;
    // Build parameterized multi-row INSERT
    const valuePlaceholders: string[] = [];
    const allValues: any[] = [];
    let paramIdx = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (let i = 0; i < cols.length; i++) {
        rowPlaceholders.push(`$${paramIdx}`);
        // Handle capital_social as numeric
        if (cols[i] === 'capital_social') {
          const numStr = (row[i] || '0').replace(',', '.');
          allValues.push(parseFloat(numStr) || 0);
        } else {
          allValues.push(row[i] || null);
        }
        paramIdx++;
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    let query: string;
    if (config.conflictKey) {
      const updateCols = cols
        .filter(c => !config.conflictKey.split(', ').includes(c))
        .map(c => `${c} = EXCLUDED.${c}`)
        .join(', ');
      query = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT (${config.conflictKey}) DO UPDATE SET ${updateCols}`;
    } else {
      // For socios (no unique key), just insert
      query = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    }

    await client.query(query, allValues);

    // Update progress periodically
    const newTotal = currentTotal + batch.length;
    if (newTotal % (BATCH_SIZE * 5) === 0 || batch.length < BATCH_SIZE) {
      await updateJobStatus(jobId, 'processing', -1, { records_processed: newTotal });
    }

    return batch.length;
  } finally {
    client.release();
  }
}

async function downloadAndProcessZip(zipUrl: string, config: typeof FILE_CONFIGS[string], jobId: string): Promise<number> {
  console.log(`📥 Downloading: ${zipUrl}`);
  await updateJobStatus(jobId, 'downloading', 10);

  const response = await axios({
    method: 'get',
    url: zipUrl,
    responseType: 'stream',
    timeout: 600000, // 10 min timeout for large files
  });

  await updateJobStatus(jobId, 'extracting', 30);
  console.log(`📦 Extracting: ${zipUrl}`);

  const zip = response.data.pipe(unzipper.Parse({ forceStream: true }));
  let totalRecords = 0;

  for await (const entry of zip) {
    const fileName = (entry as any).path as string;
    if (fileName.toUpperCase().endsWith('.CSV') || fileName.toUpperCase().endsWith('.ESTABELE') || !fileName.includes('.')) {
      console.log(`📄 Processing CSV: ${fileName}`);
      await updateJobStatus(jobId, 'processing', 50);
      totalRecords += await processCSVStream(entry as any, config, jobId);
    } else {
      (entry as any).autodrain();
    }
  }

  return totalRecords;
}

export async function processJob(jobId: string, fileType: string, baseUrl: string) {
  const config = FILE_CONFIGS[fileType];
  if (!config) {
    await updateJobStatus(jobId, 'error', 0, { error_message: `Unknown file type: ${fileType}` });
    return;
  }

  try {
    console.log(`🚀 Starting ingestion job ${jobId} for ${fileType}`);

    // For socios (no unique constraint), truncate before re-import
    if (!config.conflictKey) {
      console.log(`🗑️ Truncating ${config.table} before re-import...`);
      await pool.query(`TRUNCATE TABLE ${config.table}`);
    }

    let totalRecords = 0;

    for (let i = 0; i < config.zipCount; i++) {
      const zipName = config.zipCount === 1
        ? `${config.zipPrefix}.zip`
        : `${config.zipPrefix}${i}.zip`;

      const zipUrl = `${baseUrl}/${zipName}`;

      try {
        const records = await downloadAndProcessZip(zipUrl, config, jobId);
        totalRecords += records;
        console.log(`✅ ${zipName}: ${records} records`);
      } catch (err: any) {
        // Some numbered ZIPs may not exist (e.g., only 0-9), skip 404s
        if (err.response?.status === 404) {
          console.log(`⏭️ ${zipName} not found, skipping`);
          continue;
        }
        throw err;
      }

      // Update progress based on ZIP file index
      const progress = Math.round(50 + (50 * (i + 1) / config.zipCount));
      await updateJobStatus(jobId, 'processing', Math.min(progress, 99), {
        records_processed: totalRecords,
      });
    }

    await updateJobStatus(jobId, 'completed', 100, {
      records_processed: totalRecords,
      total_records: totalRecords,
    });

    console.log(`🎉 Job ${jobId} completed: ${totalRecords} records for ${fileType}`);
  } catch (error: any) {
    console.error(`❌ Job ${jobId} failed:`, error.message);
    await updateJobStatus(jobId, 'error', 0, {
      error_message: error.message?.substring(0, 500),
    });
  }
}
