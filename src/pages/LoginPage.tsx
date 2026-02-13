import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, LogIn, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-elevated">
            <Database className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">CNPJ Data</h1>
            <p className="text-sm text-muted-foreground mt-1">Receita Federal</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-medium">R2D2 - TNS</span>
          <Link to="/api-docs" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <FileText className="h-3 w-3" />
            Documentação API
          </Link>
        </div>
      </div>
    </div>
  );
}
