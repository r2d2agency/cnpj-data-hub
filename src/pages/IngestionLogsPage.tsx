import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollText, Trash2, Loader2, AlertCircle, Info, AlertTriangle, Bug, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchIngestionLogs, fetchIngestionJobs, clearIngestionLogs } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const levelConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  error: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-destructive', label: 'Erro' },
  warn:  { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-warning', label: 'Aviso' },
  info:  { icon: <Info className="h-3.5 w-3.5" />, color: 'text-primary', label: 'Info' },
  debug: { icon: <Bug className="h-3.5 w-3.5" />, color: 'text-muted-foreground', label: 'Debug' },
};

export default function IngestionLogsPage() {
  const queryClient = useQueryClient();
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['ingestion-logs', filterLevel, filterJob],
    queryFn: () => fetchIngestionLogs({
      level: filterLevel !== 'all' ? filterLevel : undefined,
      job_id: filterJob !== 'all' ? filterJob : undefined,
      limit: 500,
    }),
    refetchInterval: 10000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => import('@/lib/api').then(m => m.fetchIngestionJobs()),
  });

  const clearMut = useMutation({
    mutationFn: () => clearIngestionLogs(filterJob !== 'all' ? filterJob : undefined),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-logs'] });
      toast({ title: data.message || 'Logs limpos' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const errorCount = logs.filter((l: any) => l.level === 'error').length;
  const warnCount = logs.filter((l: any) => l.level === 'warn').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Logs de Ingestão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe em detalhe o processamento dos dados da Receita Federal
          </p>
        </div>
        {logs.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => clearMut.mutate()} disabled={clearMut.isPending}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpar logs
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{logs.length} log(s)</span>
        {errorCount > 0 && <span className="text-destructive font-medium">{errorCount} erro(s)</span>}
        {warnCount > 0 && <span className="text-warning font-medium">{warnCount} aviso(s)</span>}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Nível" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="warn">Avisos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterJob} onValueChange={setFilterJob}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Job" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os jobs</SelectItem>
            {jobs.map((j: any) => (
              <SelectItem key={j.id} value={j.id}>
                {j.file_type} — {new Date(j.created_at).toLocaleString('pt-BR')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum log registrado. Inicie uma ingestão para ver os logs aqui.
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {logs.map((entry: any) => {
              const cfg = levelConfig[entry.level] || levelConfig.info;
              return (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                      {entry.file_type && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{entry.file_type}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{entry.message}</p>
                    {entry.details && (
                      <pre className="text-xs text-muted-foreground mt-1 font-mono whitespace-pre-wrap break-all bg-muted/50 rounded p-2">
                        {entry.details}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
