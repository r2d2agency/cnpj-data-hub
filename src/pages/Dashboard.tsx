import { Building2, Search, Users, Key, TrendingUp, Loader2, ScrollText, MapPin, Globe, Scale, Award, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '@/components/dashboard/StatCard';
import { fetchDashboardStats, fetchIngestionJobs, fetchIngestionLogs } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const FILE_TYPE_LABELS: Record<string, string> = {
  empresas: 'Empresas',
  estabelecimentos: 'Estabelecimentos',
  socios: 'Sócios',
  municipios: 'Municípios',
  cnaes: 'CNAEs',
  naturezas: 'Naturezas Jurídicas',
  qualificacoes: 'Qualificações',
  paises: 'Países',
};

const statusLabels: Record<string, string> = {
  processing: 'Processando',
  extracting: 'Extraindo ZIP',
  downloading: 'Baixando',
  pending: 'Na fila',
};

export default function Dashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: fetchIngestionJobs,
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasActive = data?.some((j: any) => !['completed', 'error'].includes(j.status));
      return hasActive ? 3000 : false;
    },
  });

  const activeJobs = jobs.filter((j: any) => !['completed', 'error'].includes(j.status));
  const hasActiveJobs = activeJobs.length > 0;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: hasActiveJobs ? 10000 : false, // refresh stats every 10s while jobs active
  });

  // Live logs for active job
  const currentJob = activeJobs[0];
  const { data: liveLogs = [] } = useQuery({
    queryKey: ['dashboard-live-logs', currentJob?.id],
    queryFn: () => fetchIngestionLogs({ job_id: currentJob?.id, limit: 20 }),
    enabled: !!currentJob,
    refetchInterval: currentJob ? 3000 : false,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do sistema de consulta CNPJ
        </p>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <StatCard label="Empresas" value={stats?.total_empresas || 0} icon={Building2} />
          <StatCard label="Estabelecimentos" value={stats?.total_estabelecimentos || 0} icon={Search} />
          <StatCard label="Sócios" value={stats?.total_socios || 0} icon={Users} />
          <StatCard label="Municípios" value={stats?.total_municipios || 0} icon={MapPin} />
          <StatCard label="CNAEs" value={stats?.total_cnaes || 0} icon={TrendingUp} />
          <StatCard label="Naturezas Jurídicas" value={stats?.total_naturezas || 0} icon={Scale} />
          <StatCard label="Qualificações" value={stats?.total_qualificacoes || 0} icon={Award} />
          <StatCard label="Países" value={stats?.total_paises || 0} icon={Globe} />
        </div>
      )}

      {/* Active Jobs with progress + logs */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Ingestão em Andamento</h2>
        {jobsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum processamento ativo no momento.</p>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job: any) => (
              <div key={job.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {FILE_TYPE_LABELS[job.file_type] || job.file_type}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {statusLabels[job.status] || job.status}
                    </Badge>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Number(job.records_processed || 0).toLocaleString('pt-BR')} registros • {job.progress}%
                  </span>
                </div>
                <Progress value={job.progress} className="h-2" />
              </div>
            ))}

            {/* Live log console */}
            {currentJob && liveLogs.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Log em tempo real</span>
                </div>
                <div className="bg-muted/50 rounded border max-h-40 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
                  {liveLogs.map((log: any, i: number) => {
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
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
