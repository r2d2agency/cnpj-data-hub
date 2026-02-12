import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { apiKeyAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/cnpj/:cnpj - Consulta por CNPJ completo
router.get('/cnpj/:cnpj', apiKeyAuth, async (req: AuthRequest, res: Response) => {
  const start = Date.now();
  const cnpj = req.params.cnpj.replace(/\D/g, '');

  if (cnpj.length !== 14) {
    return res.status(400).json({ error: 'CNPJ must have 14 digits' });
  }

  const cnpjBasico = cnpj.substring(0, 8);
  const cnpjOrdem = cnpj.substring(8, 12);
  const cnpjDv = cnpj.substring(12, 14);

  try {
    // Get empresa
    const empresa = await pool.query(
      `SELECT e.*, n.descricao as natureza_descricao
       FROM empresas e
       LEFT JOIN naturezas_juridicas n ON e.natureza_juridica = n.codigo
       WHERE e.cnpj_basico = $1`,
      [cnpjBasico]
    );

    if (empresa.rows.length === 0) {
      return res.status(404).json({ error: 'CNPJ not found' });
    }

    // Get estabelecimento
    const estab = await pool.query(
      `SELECT est.*, m.descricao as municipio_nome
       FROM estabelecimentos est
       LEFT JOIN municipios m ON est.municipio = m.codigo
       WHERE est.cnpj_basico = $1 AND est.cnpj_ordem = $2 AND est.cnpj_dv = $3`,
      [cnpjBasico, cnpjOrdem, cnpjDv]
    );

    // Get sócios
    const socios = await pool.query(
      `SELECT s.*, q.descricao as qualificacao_descricao
       FROM socios s
       LEFT JOIN qualificacoes q ON s.qualificacao_socio = q.codigo
       WHERE s.cnpj_basico = $1`,
      [cnpjBasico]
    );

    const responseTime = Date.now() - start;

    // Log query
    await pool.query(
      `INSERT INTO query_logs (credential_id, endpoint, query_params, response_time_ms, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.credentialId, '/cnpj/:cnpj', JSON.stringify({ cnpj }), responseTime, 200]
    );

    res.json({
      empresa: empresa.rows[0],
      estabelecimento: estab.rows[0] || null,
      socios: socios.rows,
    });
  } catch (error) {
    console.error('CNPJ query error:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET /api/v1/search - Pesquisa avançada
router.get('/search', apiKeyAuth, async (req: AuthRequest, res: Response) => {
  const start = Date.now();
  const { cnae, municipio, uf, razao_social, situacao, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (cnae) {
    conditions.push(`est.cnae_principal LIKE $${paramIndex++}`);
    params.push(`${cnae}%`);
  }
  if (municipio) {
    conditions.push(`m.descricao ILIKE $${paramIndex++}`);
    params.push(`%${municipio}%`);
  }
  if (uf) {
    conditions.push(`est.uf = $${paramIndex++}`);
    params.push((uf as string).toUpperCase());
  }
  if (razao_social) {
    conditions.push(`e.razao_social ILIKE $${paramIndex++}`);
    params.push(`%${razao_social}%`);
  }
  if (situacao) {
    conditions.push(`est.situacao_cadastral = $${paramIndex++}`);
    params.push(situacao);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countQuery = `
      SELECT COUNT(*) FROM estabelecimentos est
      JOIN empresas e ON est.cnpj_basico = e.cnpj_basico
      LEFT JOIN municipios m ON est.municipio = m.codigo
      ${where}
    `;

    const dataQuery = `
      SELECT e.cnpj_basico, e.razao_social, e.capital_social,
             est.cnpj_ordem, est.cnpj_dv, est.nome_fantasia, est.situacao_cadastral,
             est.cnae_principal, est.logradouro, est.numero, est.bairro, est.cep, est.uf,
             m.descricao as municipio_nome,
             n.descricao as natureza_descricao,
             c.descricao as cnae_descricao
      FROM estabelecimentos est
      JOIN empresas e ON est.cnpj_basico = e.cnpj_basico
      LEFT JOIN municipios m ON est.municipio = m.codigo
      LEFT JOIN naturezas_juridicas n ON e.natureza_juridica = n.codigo
      LEFT JOIN cnaes c ON est.cnae_principal = c.codigo
      ${where}
      ORDER BY e.razao_social
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limitNum, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const responseTime = Date.now() - start;

    await pool.query(
      `INSERT INTO query_logs (credential_id, endpoint, query_params, response_time_ms, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.credentialId, '/search', JSON.stringify(req.query), responseTime, 200]
    );

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      data: dataResult.rows,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/v1/bulk-search - Consulta em lote
router.post('/bulk-search', apiKeyAuth, async (req: AuthRequest, res: Response) => {
  const { cnpjs } = req.body;

  if (!Array.isArray(cnpjs) || cnpjs.length === 0 || cnpjs.length > 100) {
    return res.status(400).json({ error: 'Provide 1-100 CNPJs' });
  }

  try {
    const basicos = cnpjs.map((c: string) => c.replace(/\D/g, '').substring(0, 8));

    const result = await pool.query(
      `SELECT e.*, est.nome_fantasia, est.situacao_cadastral, est.cnae_principal,
              est.logradouro, est.municipio, est.uf
       FROM empresas e
       JOIN estabelecimentos est ON e.cnpj_basico = est.cnpj_basico AND est.identificador_matriz_filial = '1'
       WHERE e.cnpj_basico = ANY($1)`,
      [basicos]
    );

    res.json({
      results: result.rows,
      found: result.rows.length,
      not_found: cnpjs.length - result.rows.length,
    });
  } catch (error) {
    console.error('Bulk search error:', error);
    res.status(500).json({ error: 'Bulk search failed' });
  }
});

// GET /api/v1/cnaes - Lista CNAEs
router.get('/cnaes', apiKeyAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM cnaes ORDER BY codigo');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CNAEs' });
  }
});

export default router;
