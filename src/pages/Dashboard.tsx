import { Building2, Search, Users, Key, TrendingUp, Clock } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import { mockStats, mockJobs } from '@/lib/mock-data';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do sistema de consulta CNPJ
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Empresas" value={mockStats.totalEmpresas} icon={Building2} />
        <StatCard label="Consultas Total" value={mockStats.totalConsultas} icon={Search} change="+12.5% este mês" changeType="positive" />
        <StatCard label="Consultas Hoje" value={mockStats.consultasHoje} icon={TrendingUp} change="+340 última hora" changeType="positive" />
        <StatCard label="Usuários" value={mockStats.totalUsuarios} icon={Users} />
        <StatCard label="Credenciais" value={mockStats.totalCredenciais} icon={Key} />
        <StatCard label="Última Atualização" value="Jan/2026" icon={Clock} />
      </div>

      {/* Active Jobs */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Ingestão em Andamento</h2>
        <div className="space-y-4">
          {mockJobs
            .filter((j) => j.status !== 'completed')
            .map((job) => (
              <div key={job.id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge-status ${
                      job.status === 'processing' ? 'badge-active' :
                      job.status === 'extracting' ? 'badge-warning' :
                      'badge-inactive'
                    }`}>
                      {job.status === 'processing' ? 'Processando' :
                       job.status === 'extracting' ? 'Extraindo' :
                       job.status === 'downloading' ? 'Baixando' : 'Pendente'}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {job.fileName || job.url?.split('/').pop()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                      {job.progress}%
                    </span>
                  </div>
                  {job.recordsProcessed > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {job.recordsProcessed.toLocaleString('pt-BR')} / {job.totalRecords.toLocaleString('pt-BR')} registros
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Queries Chart placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Consultas por Hora (Hoje)</h2>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              <p>Gráfico será populado com dados reais</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Top Sistemas por Uso</h2>
          <div className="space-y-3">
            {[
              { name: 'ERP Principal', queries: 5420, pct: 42 },
              { name: 'CRM Vendas', queries: 3210, pct: 25 },
              { name: 'BI Analytics', queries: 2104, pct: 16 },
              { name: 'Compliance', queries: 1280, pct: 10 },
            ].map((sys) => (
              <div key={sys.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{sys.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{sys.queries.toLocaleString('pt-BR')}</span>
                </div>
                <Progress value={sys.pct} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
