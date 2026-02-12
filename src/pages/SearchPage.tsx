import { useState } from 'react';
import { Search, Filter, Download, Building2, MapPin, Users as UsersIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { mockEmpresas } from '@/lib/mock-data';
import type { Empresa } from '@/lib/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('cnpj');
  const [results, setResults] = useState<Empresa[]>(mockEmpresas);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consulta CNPJ</h1>
        <p className="text-sm text-muted-foreground mt-1">Pesquise empresas por CNPJ, nome, CNAE ou município</p>
      </div>

      {/* Search Bar */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="razaoSocial">Razão Social</SelectItem>
              <SelectItem value="cnae">CNAE</SelectItem>
              <SelectItem value="municipio">Município</SelectItem>
              <SelectItem value="uf">UF</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                filterType === 'cnpj' ? '00.000.000/0001-91' :
                filterType === 'cnae' ? '6422-1/00' :
                filterType === 'municipio' ? 'São Paulo' :
                filterType === 'uf' ? 'SP' :
                'Nome da empresa...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button>
            <Search className="h-4 w-4 mr-2" />
            Pesquisar
          </Button>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {results.length} resultados encontrados
          </p>
          {results.map((emp) => (
            <button
              key={emp.cnpj}
              onClick={() => setSelectedEmpresa(emp)}
              className={`w-full text-left rounded-lg border bg-card p-4 transition-all hover:shadow-md ${
                selectedEmpresa?.cnpj === emp.cnpj ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-primary font-semibold">{emp.cnpj}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{emp.razaoSocial}</p>
                  {emp.nomeFantasia && (
                    <p className="text-xs text-muted-foreground">{emp.nomeFantasia}</p>
                  )}
                </div>
                <Badge variant={emp.situacaoCadastral === 'ATIVA' ? 'default' : 'secondary'} className="text-[10px]">
                  {emp.situacaoCadastral}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {emp.endereco.municipio}/{emp.endereco.uf}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {emp.cnaesPrincipal.split(' - ')[0]}
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  {emp.socios.length} sócio(s)
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="rounded-lg border bg-card p-5">
          {selectedEmpresa ? (
            <div className="space-y-4 animate-fade-in">
              <div>
                <p className="text-xs font-mono text-primary font-semibold">{selectedEmpresa.cnpj}</p>
                <h2 className="text-base font-bold text-foreground mt-1">{selectedEmpresa.razaoSocial}</h2>
                {selectedEmpresa.nomeFantasia && (
                  <p className="text-sm text-muted-foreground">{selectedEmpresa.nomeFantasia}</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Situação</dt>
                    <dd className="font-medium">{selectedEmpresa.situacaoCadastral}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Natureza Jurídica</dt>
                    <dd className="font-medium text-right text-xs max-w-[60%]">{selectedEmpresa.naturezaJuridica}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CNAE Principal</h3>
                <p className="text-xs font-mono bg-muted rounded px-2 py-1.5">{selectedEmpresa.cnaesPrincipal}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
                <p className="text-sm">
                  {selectedEmpresa.endereco.logradouro}, {selectedEmpresa.endereco.numero}
                  {selectedEmpresa.endereco.complemento && ` - ${selectedEmpresa.endereco.complemento}`}
                  <br />
                  {selectedEmpresa.endereco.bairro} - {selectedEmpresa.endereco.municipio}/{selectedEmpresa.endereco.uf}
                  <br />
                  <span className="font-mono text-xs">{selectedEmpresa.endereco.cep}</span>
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sócios</h3>
                {selectedEmpresa.socios.map((s, i) => (
                  <div key={i} className="rounded border bg-muted/30 p-2.5">
                    <p className="text-sm font-medium">{s.nome}</p>
                    <p className="text-xs text-muted-foreground">{s.qualificacao}</p>
                    <p className="text-xs text-muted-foreground font-mono">Entrada: {s.dataEntrada}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center py-20">
              <div>
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Selecione uma empresa para ver os detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
