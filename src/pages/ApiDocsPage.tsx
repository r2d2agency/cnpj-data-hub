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
    params: [{ name: 'cnpj', type: 'path', required: true, description: 'CNPJ com 14 dígitos (apenas números)' }],
    responseExample: `{
  "empresa": {
    "cnpj_basico": "00000000",
    "razao_social": "EMPRESA EXEMPLO SA",
    "capital_social": "1000000.00"
  },
  "estabelecimento": {
    "nome_fantasia": "EXEMPLO",
    "situacao_cadastral": "02",
    "logradouro": "RUA EXEMPLO",
    "municipio": "7107",
    "uf": "SP"
  },
  "socios": [
    { "nome_socio": "JOÃO DA SILVA", "qualificacao_descricao": "Sócio-Administrador" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/search',
    description: 'Pesquisa avançada de empresas com filtros. Retorna resultados paginados.',
    params: [
      { name: 'cnae', type: 'query', description: 'Filtrar por código CNAE (prefixo)' },
      { name: 'municipio', type: 'query', description: 'Filtrar por nome do município' },
      { name: 'uf', type: 'query', description: 'Filtrar por UF (2 caracteres)' },
      { name: 'razao_social', type: 'query', description: 'Filtrar por razão social (busca parcial)' },
      { name: 'situacao', type: 'query', description: 'Filtrar por situação cadastral' },
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
      "razao_social": "EMPRESA SA",
      "nome_fantasia": "EXEMPLO",
      "situacao_cadastral": "02",
      "cnae_principal": "6422100",
      "municipio_nome": "BRASÍLIA",
      "uf": "DF"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/bulk-search',
    description: 'Consulta em lote de até 100 CNPJs de uma só vez.',
    params: [
      { name: 'cnpjs', type: 'body', required: true, description: 'Array de CNPJs (apenas números, até 100)' },
    ],
    bodyExample: `{
  "cnpjs": [
    "00000000000191",
    "33000167000101"
  ]
}`,
    responseExample: `{
  "results": [...],
  "found": 2,
  "not_found": 0
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/cnaes',
    description: 'Lista todos os códigos CNAE disponíveis na base.',
    params: [],
    responseExample: `{
  "data": [
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
