import { DashboardStats, User, ApiCredential, IngestionJob, Empresa } from './types';

export const mockStats: DashboardStats = {
  totalEmpresas: 54_283_491,
  totalConsultas: 1_284_392,
  totalUsuarios: 47,
  totalCredenciais: 23,
  consultasHoje: 12_847,
  ultimaAtualizacao: '2026-01-15T03:00:00Z',
};

export const mockUsers: User[] = [
  { id: '1', name: 'Carlos Silva', email: 'carlos@empresa.com', role: 'admin', status: 'active', maxConcurrentQueries: 10, createdAt: '2025-06-01' },
  { id: '2', name: 'Ana Souza', email: 'ana@sistema.com.br', role: 'user', status: 'active', maxConcurrentQueries: 5, createdAt: '2025-08-15' },
  { id: '3', name: 'Roberto Lima', email: 'roberto@plataforma.io', role: 'user', status: 'inactive', maxConcurrentQueries: 3, createdAt: '2025-09-20' },
  { id: '4', name: 'Maria Santos', email: 'maria@consultoria.com', role: 'viewer', status: 'active', maxConcurrentQueries: 2, createdAt: '2025-11-01' },
];

export const mockCredentials: ApiCredential[] = [
  { id: '1', userId: '1', userName: 'Carlos Silva', apiKey: 'cnpj_live_sk_abc123...def', systemName: 'ERP Principal', permissions: ['search', 'bulk_search', 'export'], rateLimit: 1000, status: 'active', lastUsed: '2026-02-12T10:30:00Z', createdAt: '2025-06-01' },
  { id: '2', userId: '2', userName: 'Ana Souza', apiKey: 'cnpj_live_sk_xyz789...ghi', systemName: 'CRM Vendas', permissions: ['search'], rateLimit: 500, status: 'active', lastUsed: '2026-02-11T18:00:00Z', createdAt: '2025-08-15' },
  { id: '3', userId: '3', userName: 'Roberto Lima', apiKey: 'cnpj_live_sk_qwe456...jkl', systemName: 'Sistema Legado', permissions: ['search'], rateLimit: 100, status: 'revoked', lastUsed: null, createdAt: '2025-09-20' },
];

export const mockJobs: IngestionJob[] = [
  { id: '1', source: 'link', url: 'https://arquivos.receitafederal.gov.br/.../Empresas0.zip', fileType: 'empresas', status: 'completed', progress: 100, recordsProcessed: 5_420_000, totalRecords: 5_420_000, createdAt: '2026-01-16T02:00:00Z', completedAt: '2026-01-16T04:30:00Z' },
  { id: '2', source: 'link', url: 'https://arquivos.receitafederal.gov.br/.../Socios0.zip', fileType: 'socios', status: 'processing', progress: 67, recordsProcessed: 3_200_000, totalRecords: 4_800_000, createdAt: '2026-02-12T02:00:00Z' },
  { id: '3', source: 'upload', fileName: 'Estabelecimentos5.zip', fileType: 'estabelecimentos', status: 'extracting', progress: 23, recordsProcessed: 0, totalRecords: 0, createdAt: '2026-02-12T10:00:00Z' },
  { id: '4', source: 'link', url: 'https://arquivos.receitafederal.gov.br/.../Municipios.zip', fileType: 'municipios', status: 'pending', progress: 0, recordsProcessed: 0, totalRecords: 0, createdAt: '2026-02-12T10:05:00Z' },
];

export const mockEmpresas: Empresa[] = [
  {
    cnpj: '00.000.000/0001-91',
    razaoSocial: 'BANCO DO BRASIL SA',
    nomeFantasia: 'BANCO DO BRASIL',
    situacaoCadastral: 'ATIVA',
    dataSituacaoCadastral: '2005-11-03',
    naturezaJuridica: '2038 - Sociedade de Economia Mista',
    cnaesPrincipal: '6422-1/00 - Bancos múltiplos, com carteira comercial',
    cnaesSecundarios: ['6423-9/00', '6424-7/01'],
    endereco: { logradouro: 'SAUN QUADRA 5 LOTE B', numero: 'S/N', complemento: 'TORRE I', bairro: 'ASA NORTE', municipio: 'BRASÍLIA', uf: 'DF', cep: '70040-912' },
    socios: [
      { nome: 'TARCIANA PAULA GOMES MEDEIROS', cpfCnpj: '***456789**', qualificacao: 'Presidente', dataEntrada: '2023-01-16' },
    ],
  },
  {
    cnpj: '33.000.167/0001-01',
    razaoSocial: 'PETROLEO BRASILEIRO S A PETROBRAS',
    nomeFantasia: 'PETROBRAS',
    situacaoCadastral: 'ATIVA',
    dataSituacaoCadastral: '2005-11-03',
    naturezaJuridica: '2038 - Sociedade de Economia Mista',
    cnaesPrincipal: '0600-0/01 - Extração de petróleo e gás natural',
    cnaesSecundarios: ['1921-7/00', '3520-4/01'],
    endereco: { logradouro: 'AV REPUBLICA DO CHILE', numero: '65', complemento: '', bairro: 'CENTRO', municipio: 'RIO DE JANEIRO', uf: 'RJ', cep: '20031-912' },
    socios: [
      { nome: 'MAGDA MARIA DE REGINA CHAMBRIARD', cpfCnpj: '***123456**', qualificacao: 'Presidente', dataEntrada: '2024-06-20' },
    ],
  },
];
