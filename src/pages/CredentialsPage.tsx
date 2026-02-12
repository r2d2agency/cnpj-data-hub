import { useState } from 'react';
import { Plus, Copy, Eye, EyeOff, RotateCcw, Ban, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchCredentials, fetchUsers, createCredential, revokeCredential, regenerateCredential } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formSystemName, setFormSystemName] = useState('');
  const [formRateLimit, setFormRateLimit] = useState(500);
  const [formPermissions, setFormPermissions] = useState<string[]>(['search']);

  const { data: credentials = [], isLoading } = useQuery({ queryKey: ['credentials'], queryFn: fetchCredentials });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const createMut = useMutation({
    mutationFn: () => createCredential({ user_id: formUserId, system_name: formSystemName, permissions: formPermissions, rate_limit: formRateLimit }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setIsCreateOpen(false);
      toast({ title: 'Credencial criada', description: `API Key: ${data.api_key}` });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const revokeMut = useMutation({
    mutationFn: revokeCredential,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['credentials'] }); toast({ title: 'Credencial revogada' }); },
  });

  const regenMut = useMutation({
    mutationFn: regenerateCredential,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast({ title: 'Chave regenerada', description: `Nova API Key: ${data.api_key}` });
    },
  });

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const togglePermission = (perm: string) => {
    setFormPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'Copiado!' });
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
            <Button><Plus className="h-4 w-4 mr-2" />Nova Credencial</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Credencial API</DialogTitle><DialogDescription>Configure uma nova chave de acesso à API</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome do Sistema</Label><Input value={formSystemName} onChange={e => setFormSystemName(e.target.value)} placeholder="Ex: ERP Principal" /></div>
              <div>
                <Label>Usuário Responsável</Label>
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rate Limit (req/hora)</Label><Input type="number" value={formRateLimit} onChange={e => setFormRateLimit(Number(e.target.value))} min={10} max={10000} /></div>
              <div>
                <Label>Permissões</Label>
                <div className="mt-2 space-y-2">
                  {['search', 'bulk_search', 'export'].map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox id={perm} checked={formPermissions.includes(perm)} onCheckedChange={() => togglePermission(perm)} />
                      <label htmlFor={perm} className="text-sm">
                        {perm === 'search' ? 'Consulta Simples' : perm === 'bulk_search' ? 'Consulta em Lote' : 'Exportação'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !formUserId || !formSystemName}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Gerar Credencial
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma credencial cadastrada</div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred: any) => (
            <div key={cred.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{cred.system_name}</h3>
                    <Badge variant={cred.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                      {cred.status === 'active' ? 'Ativa' : 'Revogada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Responsável: {cred.user_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => regenMut.mutate(cred.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Regenerar
                  </Button>
                  {cred.status === 'active' && (
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => revokeMut.mutate(cred.id)}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> Revogar
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded bg-muted p-2">
                <code className="flex-1 text-xs font-mono text-foreground">
                  {visibleKeys.has(cred.id) ? cred.api_key : '••••••••••••••••••••••••••'}
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(cred.id)}>
                  {visibleKeys.has(cred.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(cred.api_key)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Rate: <span className="font-mono font-medium text-foreground">{cred.rate_limit}/hora</span></span>
                <span>Permissões: {(cred.permissions || []).map((p: string) => (
                  <Badge key={p} variant="outline" className="text-[10px] ml-1">{p}</Badge>
                ))}</span>
                <span className="ml-auto">
                  Último uso: {cred.last_used_at ? new Date(cred.last_used_at).toLocaleString('pt-BR') : 'Nunca'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
