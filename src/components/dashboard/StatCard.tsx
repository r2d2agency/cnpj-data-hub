import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function StatCard({ label, value, icon: Icon, change, changeType = 'neutral' }: StatCardProps) {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('pt-BR')
    : value;

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground font-mono">
            {formattedValue}
          </p>
          {change && (
            <p className={`mt-1 text-xs font-medium ${
              changeType === 'positive' ? 'text-success' :
              changeType === 'negative' ? 'text-destructive' :
              'text-muted-foreground'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
