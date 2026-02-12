import { useState } from 'react';
import { Search, Building2, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchEmpresas } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('razao_social');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { [filterType]: query, limit: '50' };
      const data = await searchEmpresas(params);
      setResults(data.data || []);
      setTotal(data.total || 0);
      setSelected(null);
    } catch (err: any) {
      toast({ title: 'Erro na busca', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCnpj = (r: any) => {
    const b = r.cnpj_basico || '';
    const o = r.cnpj_ordem || '';
    const d = r.cnpj_dv || '';
    return `${b}/${o}-${d}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consulta CNPJ</h1>
        <p className="text-sm text-muted-foreground mt-1">Pesquise empresas por CNPJ, nome, CNAE ou município</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="razao_social">Razão Social</SelectItem>
              <SelectItem value="cnae">CNAE</SelectItem>
              <SelectItem value="municipio">Município</SelectItem>
              <SelectItem value="uf">UF</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={filterType === 'cnpj' ? '00000000000191' : filterType === 'uf' ? 'SP' : 'Digite...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Pesquisar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {total} resultados encontrados
          </p>
          {results.map((r: any, i: number) => (
            <button
              key={i}
              onClick={() => setSelected(r)}
              className={`w-full text-left rounded-lg border bg-card p-4 transition-all hover:shadow-md ${
                selected === r ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-primary font-semibold">{formatCnpj(r)}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{r.razao_social}</p>
                  {r.nome_fantasia && <p className="text-xs text-muted-foreground">{r.nome_fantasia}</p>}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {r.municipio_nome || '-'}/{r.uf || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {r.cnae_principal || '-'}
                </span>
              </div>
            </button>
          ))}
          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Use a barra acima para pesquisar
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          {selected ? (
            <div className="space-y-4 animate-fade-in">
              <div>
                <p className="text-xs font-mono text-primary font-semibold">{formatCnpj(selected)}</p>
                <h2 className="text-base font-bold text-foreground mt-1">{selected.razao_social}</h2>
                {selected.nome_fantasia && <p className="text-sm text-muted-foreground">{selected.nome_fantasia}</p>}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>
                <dl className="space-y-1.5 text-sm">
                  {selected.natureza_descricao && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Natureza</dt>
                      <dd className="font-medium text-right text-xs max-w-[60%]">{selected.natureza_descricao}</dd>
                    </div>
                  )}
                  {selected.cnae_descricao && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">CNAE</dt>
                      <dd className="font-medium text-right text-xs max-w-[60%]">{selected.cnae_descricao}</dd>
                    </div>
                  )}
                  {selected.capital_social && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Capital Social</dt>
                      <dd className="font-medium font-mono">R$ {Number(selected.capital_social).toLocaleString('pt-BR')}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
                <p className="text-sm">
                  {selected.logradouro}{selected.numero ? `, ${selected.numero}` : ''}
                  <br />
                  {selected.bairro} - {selected.municipio_nome}/{selected.uf}
                  {selected.cep && <><br /><span className="font-mono text-xs">{selected.cep}</span></>}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center py-20">
              <div>
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Selecione um resultado para ver os detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
