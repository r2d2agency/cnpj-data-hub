import { useState } from 'react';
import { Plus, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { mockCredentials } from '@/lib/mock-data';
import type { ApiCredential } from '@/lib/types';

export default function CredentialsPage() {
  const [credentials] = useState<ApiCredential[]>(mockCredentials);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credenciais API</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as API keys para sistemas externos</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Credencial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Credencial API</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Sistema</Label>
                <Input placeholder="Ex: ERP Principal" />
              </div>
              <div>
                <Label>Usuário Responsável</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Carlos Silva</SelectItem>
                    <SelectItem value="2">Ana Souza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rate Limit (req/hora)</Label>
                <Input type="number" defaultValue={500} min={10} max={10000} />
              </div>
              <div>
                <Label>Permissões</Label>
                <div className="mt-2 space-y-2">
                  {['search', 'bulk_search', 'export'].map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox id={perm} defaultChecked={perm === 'search'} />
                      <label htmlFor={perm} className="text-sm">
                        {perm === 'search' ? 'Consulta Simples' :
                         perm === 'bulk_search' ? 'Consulta em Lote' : 'Exportação'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={() => setIsCreateOpen(false)}>Gerar Credencial</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {credentials.map((cred) => (
          <div key={cred.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{cred.systemName}</h3>
                  <Badge variant={cred.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                    {cred.status === 'active' ? 'Ativa' : 'Revogada'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Responsável: {cred.userName}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Regenerar
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded bg-muted p-2">
              <code className="flex-1 text-xs font-mono text-foreground">
                {visibleKeys.has(cred.id) ? cred.apiKey : '••••••••••••••••••••••••••'}
              </code>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(cred.id)}>
                {visibleKeys.has(cred.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Rate: <span className="font-mono font-medium text-foreground">{cred.rateLimit}/hora</span></span>
              <span>Permissões: {cred.permissions.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] ml-1">{p}</Badge>
              ))}</span>
              <span className="ml-auto">
                Último uso: {cred.lastUsed ? new Date(cred.lastUsed).toLocaleString('pt-BR') : 'Nunca'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
