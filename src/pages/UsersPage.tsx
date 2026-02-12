import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  max_concurrent_queries: number;
  created_at: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formMaxQueries, setFormMaxQueries] = useState(5);
  const [formStatus, setFormStatus] = useState('active');

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: 'Usuário criado com sucesso' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      toast({ title: 'Usuário atualizado' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário removido' });
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('user'); setFormMaxQueries(5); setFormStatus('active');
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormMaxQueries(u.max_concurrent_queries);
    setFormStatus(u.status);
  };

  const handleCreate = () => {
    if (!formName || !formEmail || !formPassword) return;
    createMutation.mutate({ name: formName, email: formEmail, password: formPassword, role: formRole, max_concurrent_queries: formMaxQueries });
  };

  const handleUpdate = () => {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, name: formName, email: formEmail, role: formRole, status: formStatus, max_concurrent_queries: formMaxQueries });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os usuários e permissões de acesso</p>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome completo" /></div>
              <div><Label>Email</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@empresa.com" /></div>
              <div><Label>Senha</Label><Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Senha inicial" /></div>
              <div>
                <Label>Perfil</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Máx. Consultas Simultâneas</Label><Input type="number" value={formMaxQueries} onChange={e => setFormMaxQueries(Number(e.target.value))} min={1} max={50} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) { setEditUser(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></div>
            <div>
              <Label>Perfil</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Máx. Consultas Simultâneas</Label><Input type="number" value={formMaxQueries} onChange={e => setFormMaxQueries(Number(e.target.value))} min={1} max={50} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Máx. Consultas</th>
                <th>Criado em</th>
                <th className="w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: UserRow) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td className="text-muted-foreground font-mono text-xs">{user.email}</td>
                  <td>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                      {user.role}
                    </Badge>
                  </td>
                  <td>
                    <span className={`badge-status ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="font-mono">{user.max_concurrent_queries}</td>
                  <td className="text-muted-foreground text-xs">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. O usuário <strong>{user.name}</strong> será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
