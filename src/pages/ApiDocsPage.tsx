import { useState } from 'react';
import { Copy, Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-600',
  POST: 'bg-blue-500/15 text-blue-600',
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params: { name: string; type: string; required?: boolean; description: string }[];
  bodyExample?: string;
  responseExample: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/cnpj/:cnpj',
    description: 'Consulta completa de uma empresa por CNPJ (14 dígitos). Retorna dados da empresa, estabelecimento e sócios.',
    params: [{ name: 'cnpj', type: 'path', required: true, description: 'CNPJ com 14 dígitos (apenas números). Ex: 00000000000191' }],
    responseExample: `{
  "empresa": {
    "cnpj_basico": "00000000",
    "razao_social": "EMPRESA EXEMPLO SA",
    "capital_social": "1000000.00",
    "natureza_descricao": "Sociedade Anônima Aberta"
  },
  "estabelecimento": {
    "cnpj_ordem": "0001",
    "cnpj_dv": "91",
    "nome_fantasia": "EXEMPLO",
    "situacao_cadastral": "02",
    "data_inicio_atividade": "19660101",
    "cnae_principal": "6422100",
    "logradouro": "RUA EXEMPLO",
    "numero": "100",
    "bairro": "CENTRO",
    "cep": "70000000",
    "municipio": "7107",
    "uf": "DF",
    "municipio_nome": "BRASÍLIA"
  },
  "socios": [
    {
      "nome_socio": "JOÃO DA SILVA",
      "qualificacao_descricao": "Sócio-Administrador",
      "data_entrada": "20200101"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/search',
    description: 'Pesquisa avançada de empresas com múltiplos filtros combinados. Retorna resultados paginados. Ideal para encontrar empresas por CNAE em determinado município e período de abertura. O filtro de data permite no máximo 1 ano de intervalo.',
    params: [
      { name: 'cnae', type: 'query', description: 'Filtrar por código CNAE (prefixo). Ex: 6201 retorna todos que começam com 6201' },
      { name: 'municipio', type: 'query', description: 'Filtrar por nome do município (busca parcial, case-insensitive). Ex: SAO PAULO' },
      { name: 'uf', type: 'query', description: 'Filtrar por UF (2 caracteres). Ex: SP, RJ, MG' },
      { name: 'razao_social', type: 'query', description: 'Filtrar por razão social (busca parcial, case-insensitive). Ex: PETROBRAS' },
      { name: 'situacao', type: 'query', description: 'Filtrar por situação cadastral. 02 = Ativa, 03 = Suspensa, 04 = Inapta, 08 = Baixada' },
      { name: 'data_abertura_gte', type: 'query', description: 'Data de abertura mínima no formato YYYYMMDD. Ex: 20240101' },
      { name: 'data_abertura_lte', type: 'query', description: 'Data de abertura máxima no formato YYYYMMDD. Ex: 20241231. Intervalo máximo: 1 ano (366 dias)' },
      { name: 'page', type: 'query', description: 'Número da página (padrão: 1)' },
      { name: 'limit', type: 'query', description: 'Resultados por página (máx: 100, padrão: 20)' },
    ],
    responseExample: `{
  "total": 1284,
  "page": 1,
  "limit": 20,
  "pages": 65,
  "data": [
    {
      "cnpj_basico": "00000000",
      "cnpj_ordem": "0001",
      "cnpj_dv": "91",
      "razao_social": "EMPRESA SA",
      "capital_social": "500000.00",
      "nome_fantasia": "EXEMPLO",
      "situacao_cadastral": "02",
      "cnae_principal": "6201501",
      "cnae_descricao": "Desenvolvimento de programas de computador sob encomenda",
      "data_inicio_atividade": "20240315",
      "logradouro": "AV PAULISTA",
      "numero": "1000",
      "bairro": "BELA VISTA",
      "cep": "01310100",
      "uf": "SP",
      "municipio_nome": "SAO PAULO",
      "natureza_descricao": "Sociedade Empresária Limitada"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/bulk-search',
    description: 'Consulta em lote de até 100 CNPJs de uma só vez. Retorna dados básicos da empresa e estabelecimento matriz.',
    params: [
      { name: 'cnpjs', type: 'body', required: true, description: 'Array de CNPJs com 14 dígitos (apenas números). Mínimo: 1, máximo: 100' },
    ],
    bodyExample: `{
  "cnpjs": [
    "00000000000191",
    "33000167000101"
  ]
}`,
    responseExample: `{
  "results": [
    {
      "cnpj_basico": "00000000",
      "razao_social": "BANCO DO BRASIL SA",
      "nome_fantasia": "BANCO DO BRASIL",
      "situacao_cadastral": "02",
      "cnae_principal": "6422100",
      "uf": "DF"
    }
  ],
  "found": 2,
  "not_found": 0
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/cnaes',
    description: 'Lista todos os códigos CNAE disponíveis na base. Útil para descobrir os códigos corretos antes de usar o filtro de CNAE no endpoint /search.',
    params: [],
    responseExample: `{
  "data": [
    { "codigo": "0111301", "descricao": "Cultivo de arroz" },
    { "codigo": "6201501", "descricao": "Desenvolvimento de programas de computador sob encomenda" },
    { "codigo": "6422100", "descricao": "Bancos múltiplos, com carteira comercial" }
  ]
}`,
  },
];

function EndpointTester({ endpoint }: { endpoint: Endpoint }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const buildUrl = () => {
    let url = `${baseUrl}${endpoint.path}`;
    const queryParams: string[] = [];

    endpoint.params.forEach(p => {
      const val = paramValues[p.name];
      if (!val) return;
      if (p.type === 'path') {
        url = url.replace(`:${p.name}`, val);
      } else if (p.type === 'query') {
        queryParams.push(`${p.name}=${encodeURIComponent(val)}`);
      }
    });

    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return url;
  };

  const buildCurl = () => {
    const url = buildUrl();
    let cmd = `curl -H "Authorization: Bearer ${apiKey || 'SUA_API_KEY'}"`;
    if (endpoint.method === 'POST') {
      const body = endpoint.bodyExample || '{}';
      cmd += ` -X POST -H "Content-Type: application/json" -d '${body}'`;
    }
    cmd += ` "${url}"`;
    return cmd;
  };

  const handleSend = async () => {
    if (!apiKey) { toast({ title: 'Informe a API Key', variant: 'destructive' }); return; }
    setLoading(true);
    setResponse(null);
    try {
      const url = buildUrl();
      const opts: RequestInit = {
        method: endpoint.method,
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      };
      if (endpoint.method === 'POST' && endpoint.bodyExample) {
        opts.body = endpoint.bodyExample;
      }
      const res = await fetch(url, opts);
      setStatusCode(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponse(`Erro: ${err.message}`);
      setStatusCode(0);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="params" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="params" className="text-xs h-7">Parâmetros</TabsTrigger>
          <TabsTrigger value="curl" className="text-xs h-7">cURL</TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="space-y-3">
          <div>
            <Label className="text-xs">Base URL</Label>
            <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="mt-1 text-xs font-mono" placeholder="https://seu-servidor.com" />
          </div>
          <div>
            <Label className="text-xs">API Key</Label>
            <Input value={apiKey} onChange={e => setApiKey(e.target.value)} className="mt-1 text-xs font-mono" placeholder="cnpj_live_sk_..." type="password" />
          </div>
          {endpoint.params.filter(p => p.type !== 'body').map(p => (
            <div key={p.name}>
              <Label className="text-xs">
                {p.name} {p.required && <span className="text-destructive">*</span>}
                <span className="text-muted-foreground font-normal ml-1">({p.type})</span>
              </Label>
              <Input
                value={paramValues[p.name] || ''}
                onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                className="mt-1 text-xs"
                placeholder={p.description}
              />
            </div>
          ))}
          {endpoint.bodyExample && (
            <div>
              <Label className="text-xs">Body (JSON)</Label>
              <pre className="mt-1 bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre">
                {endpoint.bodyExample}
              </pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="curl">
          <div className="relative">
            <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{buildCurl()}</pre>
            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => copyToClipboard(buildCurl())}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSend} disabled={loading} size="sm" className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        Enviar Requisição
      </Button>

      {response && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Resposta</span>
            <Badge variant={statusCode && statusCode < 400 ? 'default' : 'destructive'} className="text-[10px]">
              {statusCode}
            </Badge>
          </div>
          <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-80 overflow-y-auto">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  const [openEndpoints, setOpenEndpoints] = useState<Set<number>>(new Set([0]));

  const toggleEndpoint = (i: number) => {
    setOpenEndpoints(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentação da API</h1>
        <p className="text-sm text-muted-foreground mt-1">Referência interativa — teste os endpoints diretamente</p>
      </div>

      {/* Auth Info */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Autenticação</h2>
        <p className="text-sm text-muted-foreground">
          Todas as requisições devem incluir o header <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer SUA_API_KEY</code>.
        </p>
        <p className="text-sm text-muted-foreground">
          Crie API keys na seção <strong>Credenciais API</strong> do painel administrativo. O rate limit é controlado por credencial.
        </p>
      </div>

      {/* Usage Examples */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Exemplos de Uso</h2>
        <p className="text-sm text-muted-foreground mb-3">Combinações de filtros mais comuns:</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Empresas de TI em São Paulo abertas em 2024:</p>
            <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">GET /api/v1/search?cnae=6201&municipio=SAO%20PAULO&uf=SP&data_abertura_gte=20240101&data_abertura_lte=20241231</pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Restaurantes ativos no Rio de Janeiro:</p>
            <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">GET /api/v1/search?cnae=5611&municipio=RIO%20DE%20JANEIRO&situacao=02</pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Buscar por nome e filtrar por estado:</p>
            <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">GET /api/v1/search?razao_social=PETROBRAS&uf=RJ&limit=50</pre>
          </div>
        </div>
      </div>

      {/* Limits Info */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Limites e Restrições</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>O filtro de data de abertura aceita no máximo <strong>1 ano (366 dias)</strong> de intervalo</li>
          <li>Paginação: máximo de <strong>100 resultados</strong> por página</li>
          <li>Consulta em lote: máximo de <strong>100 CNPJs</strong> por requisição</li>
          <li>Rate limit controlado por API Key (configurável por credencial)</li>
        </ul>
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {endpoints.map((ep, i) => (
          <div key={i} className="rounded-lg border bg-card overflow-hidden">
            <button onClick={() => toggleEndpoint(i)} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              {openEndpoints.has(i) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className={`badge-status font-mono font-bold text-xs px-2 py-0.5 rounded ${methodColors[ep.method]}`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono font-semibold text-foreground">{ep.path}</code>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{ep.description.split('.')[0]}</span>
            </button>

            {openEndpoints.has(i) && (
              <div className="border-t p-5 space-y-4">
                <p className="text-sm text-muted-foreground">{ep.description}</p>

                {ep.params.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parâmetros</h4>
                    <div className="rounded border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 font-medium">Nome</th>
                            <th className="text-left p-2 font-medium">Tipo</th>
                            <th className="text-left p-2 font-medium">Obrigatório</th>
                            <th className="text-left p-2 font-medium">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ep.params.map(p => (
                            <tr key={p.name} className="border-t">
                              <td className="p-2 font-mono font-medium">{p.name}</td>
                              <td className="p-2"><Badge variant="outline" className="text-[10px]">{p.type}</Badge></td>
                              <td className="p-2">{p.required ? '✓' : '-'}</td>
                              <td className="p-2 text-muted-foreground">{p.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exemplo de Resposta</h4>
                  <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre max-h-48 overflow-y-auto">
                    {ep.responseExample}
                  </pre>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🧪 Testar Endpoint</h4>
                  <EndpointTester endpoint={ep} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
