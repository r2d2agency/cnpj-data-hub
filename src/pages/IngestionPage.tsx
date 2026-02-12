import { useState } from 'react';
import { Upload, Link2, Play, Download, RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockJobs } from '@/lib/mock-data';

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  extracting: <RefreshCw className="h-4 w-4 text-warning animate-spin" />,
  downloading: <Download className="h-4 w-4 text-info animate-pulse" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const statusLabels: Record<string, string> = {
  completed: 'Concluído',
  processing: 'Processando',
  extracting: 'Extraindo ZIP',
  downloading: 'Baixando',
  pending: 'Na fila',
  error: 'Erro',
};

export default function IngestionPage() {
  const [linkUrl, setLinkUrl] = useState('https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9?dir=/2026-01');
  const [selectedMonth, setSelectedMonth] = useState('2026-01');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingestão de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe e processe arquivos da Receita Federal</p>
      </div>

      <Tabs defaultValue="link" className="space-y-4">
        <TabsList>
          <TabsTrigger value="link" className="gap-2">
            <Link2 className="h-4 w-4" /> Via Link RF
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div>
              <Label>Mês de Referência</Label>
              <div className="flex gap-3 mt-1.5">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-02">Fevereiro 2026</SelectItem>
                    <SelectItem value="2026-01">Janeiro 2026</SelectItem>
                    <SelectItem value="2025-12">Dezembro 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>URL do Diretório da Receita Federal</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://arquivos.receitafederal.gov.br/..."
                className="mt-1.5 font-mono text-xs"
              />
            </div>
            <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Arquivos que serão processados:</p>
              <p>📦 Empresas (0-9) — Dados cadastrais das empresas</p>
              <p>📦 Estabelecimentos (0-9) — Endereços e informações complementares</p>
              <p>📦 Sócios (0-9) — Quadro societário</p>
              <p>📦 Municípios — Tabela de municípios IBGE</p>
              <p>📦 Naturezas — Naturezas jurídicas</p>
              <p>📦 Qualificações — Qualificações dos sócios</p>
              <p>📦 Países — Tabela de países</p>
              <p>📦 CNAEs — Classificação de atividades econômicas</p>
            </div>
            <Button className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Iniciar Processamento Completo
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Arraste um arquivo ZIP da Receita Federal</p>
              <p className="text-xs text-muted-foreground mt-1">Ou clique para selecionar</p>
              <Button variant="outline" size="sm" className="mt-3">
                Selecionar Arquivo
              </Button>
            </div>
            <div>
              <Label>Tipo do Arquivo</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresas">Empresas</SelectItem>
                  <SelectItem value="estabelecimentos">Estabelecimentos</SelectItem>
                  <SelectItem value="socios">Sócios</SelectItem>
                  <SelectItem value="municipios">Municípios</SelectItem>
                  <SelectItem value="naturezas">Naturezas Jurídicas</SelectItem>
                  <SelectItem value="qualificacoes">Qualificações</SelectItem>
                  <SelectItem value="paises">Países</SelectItem>
                  <SelectItem value="cnaes">CNAEs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Jobs History */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Histórico de Processamento</h2>
        <div className="space-y-3">
          {mockJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 p-3 rounded border bg-background">
              {statusIcons[job.status]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {job.fileName || job.url?.split('/').pop()}
                  </span>
                  <span className="badge-status badge-inactive text-[10px]">{job.fileType}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Progress value={job.progress} className="h-1 flex-1 max-w-xs" />
                  <span className="text-xs font-mono text-muted-foreground">{job.progress}%</span>
                  <span className="text-xs text-muted-foreground">{statusLabels[job.status]}</span>
                  {job.recordsProcessed > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {job.recordsProcessed.toLocaleString('pt-BR')} registros
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(job.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
