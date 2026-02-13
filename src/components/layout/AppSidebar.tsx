import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Key,
  DatabaseZap,
  ScrollText,
  FileText,
  Settings,
  Database,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/search', icon: Search, label: 'Consultas' },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/credentials', icon: Key, label: 'Credenciais API' },
  { to: '/ingestion', icon: DatabaseZap, label: 'Ingestão de Dados' },
  { to: '/ingestion/logs', icon: ScrollText, label: 'Logs de Ingestão' },
  { to: '/api-docs', icon: FileText, label: 'Documentação API' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
          <Database className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground">{settings.site_name || 'CNPJ Data'}</h1>
          <p className="text-[10px] font-medium text-sidebar-foreground/50 tracking-wider uppercase">
            {settings.site_subtitle || 'Receita Federal'}
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
        {user && (
          <div className="mb-3 rounded-md bg-sidebar-accent px-3 py-2">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
          </div>
        )}
        <button onClick={handleLogout} className="sidebar-item w-full text-destructive/80 hover:text-destructive">
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
