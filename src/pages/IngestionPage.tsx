import { useState, useRef } from 'react';
import { Upload, Link2, Play, CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw, Download, Trash2, ChevronDown, ChevronUp, FileArchive, ScrollText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { fetchIngestionJobs, startIngestion, clearIngestionJobs, uploadIngestionZip, fetchIngestionLogs } from '@/lib/api';
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

const FILE_TYPE_OPTIONS = [
  { value: 'municipios', label: 'Municípios' },
  { value: 'paises', label: 'Países' },
  { value: 'naturezas', label: 'Naturezas Jurídicas' },
  { value: 'qualificacoes', label: 'Qualificações' },
  { value: 'cnaes', label: 'CNAEs' },
  { value: 'empresas', label: 'Empresas' },
  { value: 'estabelecimentos', label: 'Estabelecimentos' },
  { value: 'socios', label: 'Sócios' },
];

export default function IngestionPage() {
  const queryClient = useQueryClient();
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFileType, setUploadFileType] = useState('empresas');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: fetchIngestionJobs,
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasActive = data?.some((j: any) => !['completed', 'error'].includes(j.status));
      return hasActive ? 3000 : false;
    },
  });

  // Find active job for live logs
  const activeJob = jobs.find((j: any) => !['completed', 'error'].includes(j.status));

  const { data: liveLogs = [] } = useQuery({
    queryKey: ['live-logs', activeJob?.id],
    queryFn: () => fetchIngestionLogs({ job_id: activeJob?.id, limit: 30 }),
    enabled: !!activeJob,
    refetchInterval: activeJob ? 3000 : false,
  });

  const startMut = useMutation({
    mutationFn: () => startIngestion(linkUrl, selectedMonth),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      const skipped = data.skipped || [];
      const msg = skipped.length > 0
        ? `Ingestão iniciada. Pulados (já concluídos): ${skipped.join(', ')}`
        : 'Ingestão iniciada';
      toast({ title: msg });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const uploadMut = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Selecione um arquivo');
      return uploadIngestionZip(selectedFile, uploadFileType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Upload recebido, processamento iniciado' });
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

  const completedTypes = new Set(jobs.filter((j: any) => j.status === 'completed').map((j: any) => j.file_type));
  const errorCount = jobs.filter((j: any) => j.status === 'error').length;
  const hasJobs = jobs.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingestão de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe e processe arquivos da Receita Federal</p>
      </div>

      {/* Completed types badges */}
      {completedTypes.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Já processados:</span>
          {Array.from(completedTypes).map(ft => (
            <Badge key={ft} variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />{ft}
            </Badge>
          ))}
        </div>
      )}

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
            <p className="text-xs text-muted-foreground">
              Tipos já concluídos serão automaticamente pulados. Para reprocessar, limpe o histórico primeiro.
            </p>
            <Button className="w-full" onClick={() => startMut.mutate()} disabled={startMut.isPending || !linkUrl}>
              {startMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Iniciar Processamento
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div>
              <Label>Tipo de Arquivo</Label>
              <Select value={uploadFileType} onValueChange={setUploadFileType}>
                <SelectTrigger className="w-56 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILE_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.label}
                        {completedTypes.has(opt.value) && <CheckCircle2 className="h-3 w-3 text-success" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Arquivo ZIP</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-1.5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileArchive className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">Clique para selecionar um arquivo ZIP</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ex: Empresas0.zip, Municipios.zip, Socios3.zip
                    </p>
                  </>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => uploadMut.mutate()}
              disabled={uploadMut.isPending || !selectedFile}
            >
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar e Processar
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Live Logs Panel */}
      {activeJob && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <h2 className="text-base font-semibold text-foreground">Processamento em Andamento</h2>
            <Badge variant="outline" className="text-[10px]">{activeJob.file_type}</Badge>
            <span className="text-xs font-mono text-muted-foreground ml-auto">
              {Number(activeJob.records_processed || 0).toLocaleString('pt-BR')} registros • {activeJob.progress}%
            </span>
          </div>
          <Progress value={activeJob.progress} className="h-2 mb-3" />
          <div className="bg-muted/50 rounded border max-h-48 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
            {liveLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aguardando logs...</p>
            ) : (
              liveLogs.map((log: any, i: number) => {
                const levelColors: Record<string, string> = {
                  error: 'text-destructive',
                  warn: 'text-yellow-600',
                  info: 'text-foreground',
                  debug: 'text-muted-foreground',
                };
                const levelIcons: Record<string, string> = {
                  error: '❌', warn: '⚠️', info: 'ℹ️', debug: '🔍',
                };
                return (
                  <div key={log.id || i} className={`flex gap-2 ${levelColors[log.level] || 'text-foreground'}`}>
                    <span className="shrink-0">{levelIcons[log.level] || '•'}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Job history */}
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
                        {job.source === 'upload' && (
                          <Badge variant="outline" className="text-[10px]">upload</Badge>
                        )}
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
