import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/cnpj/:cnpj',
    description: 'Consulta completa por CNPJ',
    example: `curl -H "Authorization: Bearer cnpj_live_sk_..." \\
  https://api.seudominio.com/api/v1/cnpj/00000000000191`,
    response: `{
  "cnpj": "00.000.000/0001-91",
  "razao_social": "BANCO DO BRASIL SA",
  "nome_fantasia": "BANCO DO BRASIL",
  "situacao_cadastral": "ATIVA",
  "cnae_principal": "6422-1/00",
  "endereco": { "municipio": "BRASÍLIA", "uf": "DF" },
  "socios": [...]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/search',
    description: 'Pesquisa avançada com filtros',
    example: `curl -H "Authorization: Bearer cnpj_live_sk_..." \\
  "https://api.seudominio.com/api/v1/search?cnae=6422&municipio=BRASILIA&page=1&limit=20"`,
    response: `{
  "total": 1284,
  "page": 1,
  "limit": 20,
  "data": [...]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/bulk-search',
    description: 'Consulta em lote (até 100 CNPJs)',
    example: `curl -X POST -H "Authorization: Bearer cnpj_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"cnpjs": ["00000000000191", "33000167000101"]}' \\
  https://api.seudominio.com/api/v1/bulk-search`,
    response: `{
  "results": [...],
  "found": 2,
  "not_found": 0
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/cnaes',
    description: 'Lista todos os CNAEs disponíveis',
    example: `curl -H "Authorization: Bearer cnpj_live_sk_..." \\
  https://api.seudominio.com/api/v1/cnaes`,
    response: `{
  "data": [
    { "codigo": "6422-1/00", "descricao": "Bancos múltiplos..." },
    ...
  ]
}`,
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-success/15 text-success',
  POST: 'bg-primary/15 text-primary',
  PUT: 'bg-warning/15 text-warning',
  DELETE: 'bg-destructive/15 text-destructive',
};

export default function ApiDocsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentação da API</h1>
        <p className="text-sm text-muted-foreground mt-1">Referência completa dos endpoints disponíveis</p>
      </div>

      {/* Auth */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Autenticação</h2>
        <p className="text-sm text-muted-foreground">
          Todas as requisições devem incluir o header <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> com sua API key.
        </p>
        <div className="bg-muted rounded p-3 font-mono text-xs">
          Authorization: Bearer cnpj_live_sk_sua_chave_aqui
        </div>
        <p className="text-sm text-muted-foreground">
          Rate limiting: as requisições são limitadas de acordo com o plano da credencial. O header <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">X-RateLimit-Remaining</code> indica o saldo restante.
        </p>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {endpoints.map((ep, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`badge-status font-mono font-bold text-xs ${methodColors[ep.method]}`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono font-semibold text-foreground">{ep.path}</code>
            </div>
            <p className="text-sm text-muted-foreground">{ep.description}</p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exemplo</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre">
                {ep.example}
              </pre>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resposta</span>
              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre mt-1">
                {ep.response}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
