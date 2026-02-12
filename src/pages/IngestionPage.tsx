import { useState } from 'react';
import { Upload, Link2, Play, CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchIngestionJobs, startIngestion } from '@/lib/api';
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

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['ingestion-jobs'], queryFn: fetchIngestionJobs });

  const startMut = useMutation({
    mutationFn: () => startIngestion(linkUrl, selectedMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      toast({ title: 'Ingestão iniciada' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

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
        <h2 className="text-base font-semibold text-foreground mb-4">Histórico de Processamento</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum processamento registrado.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any) => (
              <div key={job.id} className="flex items-center gap-4 p-3 rounded border bg-background">
                {statusIcons[job.status] || <Clock className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {job.file_name || job.file_type}
                    </span>
                    <span className="badge-status badge-inactive text-[10px]">{job.file_type}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={job.progress} className="h-1 flex-1 max-w-xs" />
                    <span className="text-xs font-mono text-muted-foreground">{job.progress}%</span>
                    <span className="text-xs text-muted-foreground">{statusLabels[job.status] || job.status}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
