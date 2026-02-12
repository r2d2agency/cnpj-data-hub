import { useState } from 'react';
import { Upload, Link2, Play, CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchIngestionJobs, startIngestion, clearIngestionJobs } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  extracting: <RefreshCw className="h-4 w-4 text-warning animate-spin" />,
  downloading: <Download className="h-4 w-4 text-info animate-pulse" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const statusLabels: Record<string, string> = {
  completed: 'Concluído', processing: 'Processando', extracting: 'Extraindo ZIP',
  downloading: 'Baixando', pending: 'Na fila', error: 'Erro',
};

export default function IngestionPage() {
  const queryClient = useQueryClient();
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: fetchIngestionJobs,
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasActive = data?.some((j: any) => !['completed', 'error'].includes(j.status));
      return hasActive ? 5000 : false;
    },
  });

  const startMut = useMutation({
    mutationFn: () => startIngestion(linkUrl, selectedMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      toast({ title: 'Ingestão iniciada' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const clearMut = useMutation({
    mutationFn: (status?: string) => clearIngestionJobs(status),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      toast({ title: data.message || 'Fila limpa' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const errorCount = jobs.filter((j: any) => j.status === 'error').length;
  const hasJobs = jobs.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingestão de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe e processe arquivos da Receita Federal</p>
      </div>

      <Tabs defaultValue="link" className="space-y-4">
        <TabsList>
          <TabsTrigger value="link" className="gap-2"><Link2 className="h-4 w-4" /> Via Link RF</TabsTrigger>
          <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Upload Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div>
              <Label>Mês de Referência</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-02">Fevereiro 2026</SelectItem>
                  <SelectItem value="2026-01">Janeiro 2026</SelectItem>
                  <SelectItem value="2025-12">Dezembro 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL do Diretório da Receita Federal</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://arquivos.receitafederal.gov.br/..." className="mt-1.5 font-mono text-xs" />
            </div>
            <Button className="w-full" onClick={() => startMut.mutate()} disabled={startMut.isPending || !linkUrl}>
              {startMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Iniciar Processamento
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="rounded-lg border bg-card p-5">
            <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Upload manual em desenvolvimento</p>
              <p className="text-xs text-muted-foreground mt-1">Use a opção Via Link RF por enquanto</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Histórico de Processamento</h2>
          {hasJobs && (
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => clearMut.mutate('error')}
                  disabled={clearMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Limpar erros ({errorCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearMut.mutate(undefined)}
                disabled={clearMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Limpar tudo
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum processamento registrado.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job: any) => {
              const isExpanded = expandedJob === job.id;
              const hasError = job.status === 'error';
              const hasDetails = hasError && job.error_message;

              return (
                <div key={job.id} className={`rounded border bg-background ${hasError ? 'border-destructive/30' : ''}`}>
                  <div
                    className={`flex items-center gap-4 p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => hasDetails && setExpandedJob(isExpanded ? null : job.id)}
                  >
                    {statusIcons[job.status] || <Clock className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {job.file_name || job.file_type}
                        </span>
                        <span className="badge-status badge-inactive text-[10px]">{job.file_type}</span>
                        {job.records_processed > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Number(job.records_processed).toLocaleString('pt-BR')} registros
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Progress value={job.progress} className="h-1 flex-1 max-w-xs" />
                        <span className="text-xs font-mono text-muted-foreground">{job.progress}%</span>
                        <span className={`text-xs ${hasError ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {statusLabels[job.status] || job.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(job.created_at).toLocaleString('pt-BR')}
                      </span>
                      {hasDetails && (
                        isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-3 pt-0">
                      <div className="rounded bg-destructive/5 border border-destructive/20 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">Detalhes do Erro</p>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono break-all">
                          {job.error_message}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
