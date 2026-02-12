export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  maxConcurrentQueries: number;
  createdAt: string;
}

export interface ApiCredential {
  id: string;
  userId: string;
  userName: string;
  apiKey: string;
  systemName: string;
  permissions: string[];
  rateLimit: number;
  status: 'active' | 'revoked';
  lastUsed: string | null;
  createdAt: string;
}

export interface IngestionJob {
  id: string;
  source: 'upload' | 'link';
  url?: string;
  fileName?: string;
  fileType: string;
  status: 'pending' | 'downloading' | 'extracting' | 'processing' | 'completed' | 'error';
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Empresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  dataSituacaoCadastral: string;
  naturezaJuridica: string;
  cnaesPrincipal: string;
  cnaesSecundarios: string[];
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  socios: Socio[];
}

export interface Socio {
  nome: string;
  cpfCnpj: string;
  qualificacao: string;
  dataEntrada: string;
}

export interface DashboardStats {
  totalEmpresas: number;
  totalConsultas: number;
  totalUsuarios: number;
  totalCredenciais: number;
  consultasHoje: number;
  ultimaAtualizacao: string;
}

export interface SearchFilters {
  cnpj?: string;
  razaoSocial?: string;
  cnae?: string;
  municipio?: string;
  uf?: string;
  situacaoCadastral?: string;
  page: number;
  limit: number;
}
