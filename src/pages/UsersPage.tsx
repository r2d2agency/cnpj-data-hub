import { useState } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockUsers } from '@/lib/mock-data';
import type { User } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os usuários e permissões de acesso</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input placeholder="Nome completo" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="email@empresa.com" />
              </div>
              <div>
                <Label>Perfil</Label>
                <Select defaultValue="user">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Máx. Consultas Simultâneas</Label>
                <Input type="number" defaultValue={5} min={1} max={50} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={() => setIsCreateOpen(false)}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
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
            {users.map((user) => (
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
                <td className="font-mono">{user.maxConcurrentQueries}</td>
                <td className="text-muted-foreground text-xs">{user.createdAt}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
