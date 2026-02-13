import { useState } from 'react';
import { Search, Building2, MapPin, Loader2, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { searchEmpresas } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function SearchPage() {
  const [cnae, setCnae] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [dataAberturaGte, setDataAberturaGte] = useState('');
  const [dataAberturaLte, setDataAberturaLte] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const handleSearch = async () => {
    if (!cnae && !municipio && !uf && !razaoSocial && !cnpj) {
      toast({ title: 'Filtro obrigatório', description: 'Preencha pelo menos um filtro (CNAE, Município, UF, Razão Social ou CNPJ).', variant: 'destructive' });
      return;
    }

    // Validate date range max 1 year
    if (dataAberturaGte && dataAberturaLte) {
      const gte = new Date(dataAberturaGte);
      const lte = new Date(dataAberturaLte);
      const diffDays = (lte.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) {
        toast({ title: 'Data inválida', description: 'A data inicial deve ser anterior à data final.', variant: 'destructive' });
        return;
      }
      if (diffDays > 366) {
        toast({ title: 'Período muito longo', description: 'O período máximo de consulta é 1 ano (366 dias).', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (cnae) params.cnae = cnae;
      if (municipio) params.municipio = municipio;
      if (uf) params.uf = uf;
      if (razaoSocial) params.razao_social = razaoSocial;
      if (cnpj) params.cnpj = cnpj;
      if (dataAberturaGte) params.data_abertura_gte = dataAberturaGte.replace(/-/g, '');
      if (dataAberturaLte) params.data_abertura_lte = dataAberturaLte.replace(/-/g, '');

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

  const formatDataAbertura = (d: string) => {
    if (!d || d.length !== 8) return '-';
    return `${d.substring(6, 8)}/${d.substring(4, 6)}/${d.substring(0, 4)}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consulta CNPJ</h1>
        <p className="text-sm text-muted-foreground mt-1">Pesquise empresas por CNPJ, CNAE, município, UF ou razão social com filtro por data de abertura</p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CNPJ</Label>
            <Input placeholder="00000000000191" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CNAE</Label>
            <Input placeholder="6201501" value={cnae} onChange={(e) => setCnae(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Razão Social</Label>
            <Input placeholder="Nome da empresa" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Município</Label>
            <Input placeholder="SAO PAULO" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">UF</Label>
            <Input placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Data Abertura (De)</Label>
            <Input type="date" value={dataAberturaGte} onChange={(e) => setDataAberturaGte(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Data Abertura (Até)</Label>
            <Input type="date" value={dataAberturaLte} onChange={(e) => setDataAberturaLte(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end">
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
                {r.data_inicio_atividade && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDataAbertura(r.data_inicio_atividade)}
                  </span>
                )}
              </div>
            </button>
          ))}
          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Use os filtros acima para pesquisar
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
                  {selected.cnae_principal && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Código CNAE</dt>
                      <dd className="font-medium font-mono">{selected.cnae_principal}</dd>
                    </div>
                  )}
                  {selected.capital_social && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Capital Social</dt>
                      <dd className="font-medium font-mono">R$ {Number(selected.capital_social).toLocaleString('pt-BR')}</dd>
                    </div>
                  )}
                  {selected.data_inicio_atividade && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Data Abertura</dt>
                      <dd className="font-medium font-mono">{formatDataAbertura(selected.data_inicio_atividade)}</dd>
                    </div>
                  )}
                  {selected.situacao_cadastral && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Situação</dt>
                      <dd className="font-medium">{selected.situacao_cadastral === '02' ? 'Ativa' : selected.situacao_cadastral === '08' ? 'Baixada' : selected.situacao_cadastral}</dd>
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
