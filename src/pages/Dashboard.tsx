import { Building2, Search, Users, Key, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '@/components/dashboard/StatCard';
import { fetchDashboardStats, fetchIngestionJobs } from '@/lib/api';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: fetchIngestionJobs,
  });

  const activeJobs = jobs.filter((j: any) => !['completed', 'error'].includes(j.status));

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Empresas" value={stats?.total_empresas || 0} icon={Building2} />
          <StatCard label="Estabelecimentos" value={stats?.total_estabelecimentos || 0} icon={Search} />
          <StatCard label="Sócios" value={stats?.total_socios || 0} icon={Users} />
          <StatCard label="Municípios" value={stats?.total_municipios || 0} icon={Key} />
          <StatCard label="CNAEs" value={stats?.total_cnaes || 0} icon={TrendingUp} />
        </div>
      )}

      {/* Active Jobs */}
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
              <div key={job.id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge-status ${
                      job.status === 'processing' ? 'badge-active' :
                      job.status === 'extracting' ? 'badge-warning' :
                      'badge-inactive'
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {job.file_name || job.file_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                      {job.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
