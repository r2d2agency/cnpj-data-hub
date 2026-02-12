import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Key,
  DatabaseZap,
  FileText,
  Settings,
  Database,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/search', icon: Search, label: 'Consultas' },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/credentials', icon: Key, label: 'Credenciais API' },
  { to: '/ingestion', icon: DatabaseZap, label: 'Ingestão de Dados' },
  { to: '/api-docs', icon: FileText, label: 'Documentação API' },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
          <Database className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground">CNPJ Data</h1>
          <p className="text-[10px] font-medium text-sidebar-foreground/50 tracking-wider uppercase">
            Receita Federal
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link to="/settings" className="sidebar-item">
          <Settings className="h-4 w-4 shrink-0" />
          <span>Configurações</span>
        </Link>
        <div className="mt-3 rounded-md bg-sidebar-accent px-3 py-2">
          <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Base de dados
          </p>
          <p className="mt-0.5 text-xs font-semibold text-sidebar-primary font-mono">
            54.283.491 registros
          </p>
          <p className="text-[10px] text-sidebar-foreground/40">
            Atualizado: Jan/2026
          </p>
        </div>
      </div>
    </aside>
  );
}
