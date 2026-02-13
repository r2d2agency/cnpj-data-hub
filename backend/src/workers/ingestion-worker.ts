import axios from 'axios';
import * as unzipper from 'unzipper';
import csv from 'csv-parser';
import fs from 'fs';
import { pool } from '../db/pool';
import { Readable } from 'stream';

// =============================================
// Receita Federal Ingestion Worker
// Downloads ZIPs, extracts CSVs, inserts into PostgreSQL
// =============================================

const BATCH_SIZE = 5000;

// Structured logger that writes to DB
async function log(jobId: string, level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: string) {
  const icon = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
  console[level === 'error' ? 'error' : 'log'](`${icon} [${jobId.slice(0, 8)}] ${message}`);
  try {
    await pool.query(
      'INSERT INTO ingestion_logs (job_id, level, message, details) VALUES ($1, $2, $3, $4)',
      [jobId, level, message, details || null]
    );
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

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
    zipCount: 10,
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
    conflictKey: '',
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
    const valuePlaceholders: string[] = [];
    const allValues: any[] = [];
    let paramIdx = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (let i = 0; i < cols.length; i++) {
        rowPlaceholders.push(`$${paramIdx}`);
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
      query = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    }

    await client.query(query, allValues);

    const newTotal = currentTotal + batch.length;
    if (newTotal % (BATCH_SIZE * 5) === 0 || batch.length < BATCH_SIZE) {
      await updateJobStatus(jobId, 'processing', -1, { records_processed: newTotal });
      await log(jobId, 'debug', `Processados ${newTotal.toLocaleString('pt-BR')} registros na tabela ${config.table}`);
    }

    return batch.length;
  } catch (err: any) {
    await log(jobId, 'error', `Erro ao inserir batch na tabela ${config.table}`, err.message?.substring(0, 500));
    throw err;
  } finally {
    client.release();
  }
}

async function downloadAndProcessZip(zipUrl: string, config: typeof FILE_CONFIGS[string], jobId: string): Promise<number> {
  await log(jobId, 'info', `Iniciando download: ${zipUrl}`);
  await updateJobStatus(jobId, 'downloading', 10);

  const response = await axios({
    method: 'get',
    url: zipUrl,
    responseType: 'stream',
    timeout: 600000,
    maxRedirects: 10,
  });

  // Validate we got a binary file, not an HTML page
  const contentType = response.headers['content-type'] || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Download retornou HTML ao invés de ZIP. URL pode estar incorreta: ${zipUrl}`);
  }

  const contentLength = response.headers['content-length'];
  if (contentLength) {
    await log(jobId, 'info', `Download iniciado — tamanho: ${(Number(contentLength) / 1024 / 1024).toFixed(1)} MB`);
  }

  await updateJobStatus(jobId, 'extracting', 30);
  await log(jobId, 'info', `Extraindo ZIP: ${zipUrl.split('/').pop()}`);

  const zip = response.data.pipe(unzipper.Parse({ forceStream: true }));
  let totalRecords = 0;

  for await (const entry of zip) {
    const fileName = (entry as any).path as string;
    if (fileName.toUpperCase().endsWith('.CSV') || fileName.toUpperCase().endsWith('.ESTABELE') || !fileName.includes('.')) {
      await log(jobId, 'info', `Processando CSV: ${fileName}`);
      await updateJobStatus(jobId, 'processing', 50);
      totalRecords += await processCSVStream(entry as any, config, jobId);
    } else {
      await log(jobId, 'debug', `Ignorando arquivo: ${fileName}`);
      (entry as any).autodrain();
    }
  }

  await log(jobId, 'info', `ZIP concluído: ${totalRecords.toLocaleString('pt-BR')} registros`);
  return totalRecords;
}

export async function processJob(jobId: string, fileType: string, baseUrl: string) {
  const config = FILE_CONFIGS[fileType];
  if (!config) {
    await updateJobStatus(jobId, 'error', 0, { error_message: `Unknown file type: ${fileType}` });
    await log(jobId, 'error', `Tipo de arquivo desconhecido: ${fileType}`);
    return;
  }

  try {
    await log(jobId, 'info', `Iniciando ingestão para ${fileType}`);

    if (!config.conflictKey) {
      await log(jobId, 'warn', `Truncando tabela ${config.table} antes da reimportação`);
      await pool.query(`TRUNCATE TABLE ${config.table}`);
    }

    let totalRecords = 0;

    for (let i = 0; i < config.zipCount; i++) {
      const zipName = config.zipCount === 1
        ? `${config.zipPrefix}.zip`
        : `${config.zipPrefix}${i}.zip`;

      // Simple append — URL already points to the correct WebDAV directory
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const zipUrl = `${cleanBase}/${zipName}`;

      try {
        const records = await downloadAndProcessZip(zipUrl, config, jobId);
        totalRecords += records;
        await log(jobId, 'info', `${zipName}: ${records.toLocaleString('pt-BR')} registros processados`);
      } catch (err: any) {
        if (err.response?.status === 404) {
          await log(jobId, 'warn', `${zipName} não encontrado (404), pulando`);
          continue;
        }
        const errorDetail = err.response
          ? `HTTP ${err.response.status}: ${err.response.statusText}`
          : err.code || err.message;
        await log(jobId, 'error', `Falha ao processar ${zipName}: ${errorDetail}`, err.stack?.substring(0, 500));
        throw err;
      }

      const progress = Math.round(50 + (50 * (i + 1) / config.zipCount));
      await updateJobStatus(jobId, 'processing', Math.min(progress, 99), {
        records_processed: totalRecords,
      });
    }

    await updateJobStatus(jobId, 'completed', 100, {
      records_processed: totalRecords,
      total_records: totalRecords,
    });

    await log(jobId, 'info', `✅ Concluído: ${totalRecords.toLocaleString('pt-BR')} registros para ${fileType}`);
  } catch (error: any) {
    const errMsg = error.message?.substring(0, 500) || 'Erro desconhecido';
    await updateJobStatus(jobId, 'error', 0, { error_message: errMsg });
    await log(jobId, 'error', `Job falhou: ${errMsg}`, error.stack?.substring(0, 1000));
  }
}

// Process a manually uploaded ZIP file
export async function processUploadedZip(jobId: string, fileType: string, filePath: string) {
  const config = FILE_CONFIGS[fileType];
  if (!config) {
    await updateJobStatus(jobId, 'error', 0, { error_message: `Unknown file type: ${fileType}` });
    await log(jobId, 'error', `Tipo de arquivo desconhecido: ${fileType}`);
    return;
  }

  try {
    await log(jobId, 'info', `Processando upload manual para ${fileType}: ${filePath.split('/').pop()}`);

    if (!config.conflictKey) {
      await log(jobId, 'warn', `Truncando tabela ${config.table} antes da reimportação`);
      await pool.query(`TRUNCATE TABLE ${config.table}`);
    }

    await updateJobStatus(jobId, 'extracting', 20);
    await log(jobId, 'info', `Extraindo ZIP do upload...`);

    const fileStream = fs.createReadStream(filePath);
    const zip = fileStream.pipe(unzipper.Parse({ forceStream: true }));
    let totalRecords = 0;

    for await (const entry of zip) {
      const fileName = (entry as any).path as string;
      if (fileName.toUpperCase().endsWith('.CSV') || fileName.toUpperCase().endsWith('.ESTABELE') || !fileName.includes('.')) {
        await log(jobId, 'info', `Processando CSV: ${fileName}`);
        await updateJobStatus(jobId, 'processing', 50);
        totalRecords += await processCSVStream(entry as any, config, jobId);
      } else {
        await log(jobId, 'debug', `Ignorando arquivo: ${fileName}`);
        (entry as any).autodrain();
      }
    }

    await updateJobStatus(jobId, 'completed', 100, {
      records_processed: totalRecords,
      total_records: totalRecords,
    });

    await log(jobId, 'info', `✅ Upload concluído: ${totalRecords.toLocaleString('pt-BR')} registros para ${fileType}`);
  } catch (error: any) {
    const errMsg = error.message?.substring(0, 500) || 'Erro desconhecido';
    await updateJobStatus(jobId, 'error', 0, { error_message: errMsg });
    await log(jobId, 'error', `Upload falhou: ${errMsg}`, error.stack?.substring(0, 1000));
  }
}
