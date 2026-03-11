import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/components/LoginPage';

export type Tenant = 'top_brasil' | 'colossal' | 'mat_assessoria';

interface TeamUser {
  id: string;
  nome: string;
  email: string;
  role: 'vendedor' | 'admin';
  ativo: boolean;
  tenant: Tenant;
}

const TENANT_LABELS: Record<Tenant | 'all', string> = {
  all: 'Todas as Empresas',
  top_brasil: 'Top Brasil',
  colossal: 'Agência Colossal',
  mat_assessoria: 'Mat Assessoria',
};

const MOCK_USERS: TeamUser[] = [
  { id: '1', nome: 'Carlos Silva', email: 'carlos@topbrasil.com', role: 'vendedor', ativo: true, tenant: 'top_brasil' },
  { id: '2', nome: 'Ana Paula', email: 'ana@topbrasil.com', role: 'admin', ativo: true, tenant: 'top_brasil' },
  { id: '3', nome: 'Roberto Gomes', email: 'roberto@topbrasil.com', role: 'vendedor', ativo: false, tenant: 'top_brasil' },
  { id: '4', nome: 'Fernanda Lima', email: 'fernanda@colossal.com', role: 'vendedor', ativo: true, tenant: 'colossal' },
  { id: '5', nome: 'Lucas Martins', email: 'lucas@colossal.com', role: 'admin', ativo: true, tenant: 'colossal' },
  { id: '6', nome: 'Mariana Costa', email: 'mariana@matassessoria.com', role: 'vendedor', ativo: true, tenant: 'mat_assessoria' },
  { id: '7', nome: 'Pedro Alves', email: 'pedro@matassessoria.com', role: 'admin', ativo: true, tenant: 'mat_assessoria' },
];

interface TeamManagementProps {
  userRole: UserRole;
  /** For admin role, restrict to their own tenant */
  userTenant?: Tenant;
}

export function TeamManagement({ userRole, userTenant }: TeamManagementProps) {
  const [users, setUsers] = useState<TeamUser[]>(MOCK_USERS);
  const [tenantFilter, setTenantFilter] = useState<Tenant | 'all'>(userRole === 'superadmin' ? 'all' : (userTenant ?? 'top_brasil'));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', role: 'vendedor' as 'vendedor' | 'admin', tenant: 'top_brasil' as Tenant });

  const isSuperAdmin = userRole === 'superadmin';

  const filtered = users.filter(u => {
    if (!isSuperAdmin && userTenant) return u.tenant === userTenant;
    if (tenantFilter === 'all') return true;
    return u.tenant === tenantFilter;
  });

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
    toast.success('Status atualizado');
  };

  const handleInvite = () => {
    if (!newUser.nome || !newUser.email) { toast.error('Preencha todos os campos'); return; }
    const user: TeamUser = { ...newUser, id: crypto.randomUUID(), ativo: true };
    setUsers(prev => [...prev, user]);
    setInviteOpen(false);
    setNewUser({ nome: '', email: '', role: 'vendedor', tenant: 'top_brasil' });
    toast.success(`Convite enviado para ${user.email}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Equipe</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} usuários encontrados</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Select value={tenantFilter} onValueChange={(v) => setTenantFilter(v as Tenant | 'all')}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TENANT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Convidar Novo Usuário
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isSuperAdmin && <TableHead>Empresa</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role === 'admin' ? 'Admin' : 'Vendedor'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.ativo ? 'outline' : 'destructive'} className={u.ativo ? 'border-emerald-500 text-emerald-600' : ''}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground text-sm">{TENANT_LABELS[u.tenant]}</TableCell>}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch checked={u.ativo} onCheckedChange={() => toggleStatus(u.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={newUser.nome} onChange={e => setNewUser(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v as 'vendedor' | 'admin' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select value={newUser.tenant} onValueChange={v => setNewUser(p => ({ ...p, tenant: v as Tenant }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top_brasil">Top Brasil</SelectItem>
                    <SelectItem value="colossal">Agência Colossal</SelectItem>
                    <SelectItem value="mat_assessoria">Mat Assessoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite}>Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
