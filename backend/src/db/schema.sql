-- =============================================
-- CNPJ Data System - Database Schema
-- PostgreSQL
-- =============================================

-- Tabelas de referência da Receita Federal
CREATE TABLE IF NOT EXISTS municipios (
    codigo VARCHAR(4) PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS paises (
    codigo VARCHAR(3) PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS naturezas_juridicas (
    codigo VARCHAR(4) PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS qualificacoes (
    codigo VARCHAR(2) PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS cnaes (
    codigo VARCHAR(7) PRIMARY KEY,
    descricao VARCHAR(500) NOT NULL
);

-- Tabela principal de empresas
CREATE TABLE IF NOT EXISTS empresas (
    cnpj_basico VARCHAR(8) PRIMARY KEY,
    razao_social VARCHAR(200),
    natureza_juridica VARCHAR(4) REFERENCES naturezas_juridicas(codigo),
    qualificacao_responsavel VARCHAR(2),
    capital_social DECIMAL(15,2),
    porte_empresa VARCHAR(2),
    ente_federativo VARCHAR(200)
);

-- Estabelecimentos (cada CNPJ completo)
CREATE TABLE IF NOT EXISTS estabelecimentos (
    cnpj_basico VARCHAR(8) NOT NULL,
    cnpj_ordem VARCHAR(4) NOT NULL,
    cnpj_dv VARCHAR(2) NOT NULL,
    identificador_matriz_filial VARCHAR(1),
    nome_fantasia VARCHAR(200),
    situacao_cadastral VARCHAR(2),
    data_situacao_cadastral VARCHAR(8),
    motivo_situacao_cadastral VARCHAR(2),
    nome_cidade_exterior VARCHAR(200),
    pais VARCHAR(3),
    data_inicio_atividade VARCHAR(8),
    cnae_principal VARCHAR(7),
    cnae_secundario TEXT,
    tipo_logradouro VARCHAR(20),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(200),
    bairro VARCHAR(200),
    cep VARCHAR(8),
    uf VARCHAR(2),
    municipio VARCHAR(4),
    ddd1 VARCHAR(4),
    telefone1 VARCHAR(10),
    ddd2 VARCHAR(4),
    telefone2 VARCHAR(10),
    ddd_fax VARCHAR(4),
    fax VARCHAR(10),
    email VARCHAR(200),
    situacao_especial VARCHAR(200),
    data_situacao_especial VARCHAR(8),
    PRIMARY KEY (cnpj_basico, cnpj_ordem, cnpj_dv)
);

CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cnae ON estabelecimentos(cnae_principal);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_municipio ON estabelecimentos(municipio);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_uf ON estabelecimentos(uf);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_situacao ON estabelecimentos(situacao_cadastral);

-- Sócios
CREATE TABLE IF NOT EXISTS socios (
    cnpj_basico VARCHAR(8) NOT NULL,
    identificador_socio VARCHAR(1),
    nome_socio VARCHAR(200),
    cpf_cnpj_socio VARCHAR(14),
    qualificacao_socio VARCHAR(2),
    data_entrada VARCHAR(8),
    pais VARCHAR(3),
    representante_legal VARCHAR(14),
    nome_representante VARCHAR(200),
    qualificacao_representante VARCHAR(2),
    faixa_etaria VARCHAR(1)
);

CREATE INDEX IF NOT EXISTS idx_socios_cnpj ON socios(cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_socios_nome ON socios(nome_socio);

-- =============================================
-- Tabelas do sistema
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    max_concurrent_queries INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key VARCHAR(200) UNIQUE NOT NULL,
    system_name VARCHAR(200) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['search'],
    rate_limit INT DEFAULT 500,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_credentials_key ON api_credentials(api_key);

CREATE TABLE IF NOT EXISTS query_logs (
    id BIGSERIAL PRIMARY KEY,
    credential_id UUID REFERENCES api_credentials(id),
    endpoint VARCHAR(200),
    query_params JSONB,
    response_time_ms INT,
    status_code INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_credential ON query_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs(created_at);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL CHECK (source IN ('upload', 'link')),
    url TEXT,
    file_name VARCHAR(500),
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'extracting', 'processing', 'completed', 'error')),
    progress INT DEFAULT 0,
    records_processed BIGINT DEFAULT 0,
    total_records BIGINT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    level VARCHAR(10) DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_job ON ingestion_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_level ON ingestion_logs(level);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_created ON ingestion_logs(created_at DESC);

-- Configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Valores padrão
INSERT INTO system_settings (key, value) VALUES
    ('site_name', 'CNPJ Data'),
    ('site_subtitle', 'Receita Federal'),
    ('site_description', 'Plataforma de consulta de dados CNPJ da Receita Federal')
ON CONFLICT (key) DO NOTHING;

-- Enable pg_trgm extension for fuzzy search (optional, may not be available)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_empresas_razao_social_trgm 
      ON empresas USING gin (razao_social gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm not available, skipping fuzzy search index';
END;
$$;
