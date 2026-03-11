import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Building2, Users, Plus, Ban, Pencil, MessageSquare, Mail, UserCog, Save, BarChart3, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminSaas, type TenantAdminData as Tenant } from '@/hooks/useAdminSaas';

// ── Types ──────────────────────────────────────────────────────────

interface TenantPlanLimits {
  maxVendedores: number;
  maxLeads: number;
  acessoApi: boolean;
  whiteLabel: boolean;
}

interface TenantWhiteLabel {
  logoUrl: string;
  corPrimaria: string;
}

interface AuditLog {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  tenant: string;
}
interface Vendedor {
  id: string;
  nome: string;
  disponivel: boolean;
  leadsAtivos: number;
}

// ── Mock Data ──────────────────────────────────────────────────────

const mockVendedores: Vendedor[] = [
  { id: '1', nome: 'Carlos', disponivel: true, leadsAtivos: 5 },
  { id: '2', nome: 'Ana', disponivel: true, leadsAtivos: 3 },
  { id: '3', nome: 'Yann', disponivel: false, leadsAtivos: 7 },
];

const mockLogs: AuditLog[] = [
  { id: '1', data: new Date(Date.now() - 3600000).toISOString(), usuario: 'superadmin@crm.com', acao: 'Bloqueou acesso da corretora', tenant: 'Nacional Proteção' },
  { id: '2', data: new Date(Date.now() - 7200000).toISOString(), usuario: 'superadmin@crm.com', acao: 'Cadastrou nova corretora', tenant: 'Mais Seguro Proteção' },
  { id: '3', data: new Date(Date.now() - 86400000).toISOString(), usuario: 'yann@protecaotop.com', acao: 'Atualizou plano para Premium', tenant: 'Proteção Top Brasil' },
  { id: '4', data: new Date(Date.now() - 172800000).toISOString(), usuario: 'superadmin@crm.com', acao: 'Alterou limites do plano', tenant: 'GuardaCar Associação' },
  { id: '5', data: new Date(Date.now() - 259200000).toISOString(), usuario: 'rafael@shieldpv.com', acao: 'Simulou acesso como admin', tenant: 'Shield Proteção Veicular' },
  { id: '6', data: new Date(Date.now() - 345600000).toISOString(), usuario: 'superadmin@crm.com', acao: 'Editou configurações white-label', tenant: 'GuardaCar Associação' },
];

// Mock analytics: leads per day for last 30 days
const mockLeadsPerDay = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  count: Math.floor(Math.random() * 20) + 5,
}));

// ── Constants ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  inadimplente: { label: 'Inadimplente', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  bloqueado: { label: 'Bloqueado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ── Main Component ─────────────────────────────────────────────────

export function AdminSaas() {
  const { tenants, isLoadingTenants, addTenant, updateTenantStatus } = useAdminSaas();
  const [vendedores, setVendedores] = useState(mockVendedores);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [editLimits, setEditLimits] = useState<TenantPlanLimits | null>(null);
  const [editWl, setEditWl] = useState<TenantWhiteLabel | null>(null);

  const totalVendedores = tenants.reduce((s, t) => s + t.totalVendedores, 0);
  const totalLeads = tenants.reduce((s, t) => s + t.leadsAtivos, 0);
  const mrrTotal = tenants.filter(t => t.statusPlano === 'ativo').reduce((s, t) => s + t.mrrTenant, 0);
  const maxBar = useMemo(() => Math.max(...mockLeadsPerDay.map(d => d.count)), []);

  const handleBloquear = (t: Tenant) => {
    const nextStatus = t.statusPlano === 'bloqueado' ? 'ativo' : 'bloqueado';
    updateTenantStatus(t.id, nextStatus);
    toast.success('Status atualizado. Observe que no backend isso ainda está mockado.');
  };

  const handleLoginAs = (t: Tenant) => {
    toast.success(`Simulando acesso como Admin da ${t.nome}`);
  };

  const handleCadastrar = () => {
    if (!novoNome.trim()) return;
    addTenant({ nome_empresa: novoNome, plano: 'starter' });
    setNovoNome('');
    setCadastroOpen(false);
  };

  const openEditTenant = (t: Tenant) => {
    setEditTenantId(t.id);
    setEditLimits({ ...t.limits });
    setEditWl({ ...t.whiteLabel });
  };

  const handleSaveEdit = () => {
    if (!editTenantId || !editLimits || !editWl) return;
    // Mocking the write back
    toast.info('Configurações salvas! (Requer backend setup para white label).');
    setEditTenantId(null);
  };

  if (isLoadingTenants) return <div className="p-8 text-center text-muted-foreground">Carregando dados superadmin...</div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Corretoras Ativas</p><p className="text-2xl font-bold text-foreground">{tenants.filter(t => t.statusPlano === 'ativo').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Vendedores</p><p className="text-2xl font-bold text-foreground">{totalVendedores} <span className="text-sm font-normal text-muted-foreground">({totalLeads} leads)</span></p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Building2 className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-xs text-muted-foreground">MRR SaaS</p><p className="text-2xl font-bold text-emerald-500">{fmt(mrrTotal)}</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="corretoras">
        <TabsList className="flex-wrap">
          <TabsTrigger value="corretoras" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Corretoras</TabsTrigger>
          <TabsTrigger value="planos" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Planos e Preços</TabsTrigger>
          <TabsTrigger value="fila" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Fila de Leads</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><ScrollText className="h-3.5 w-3.5" /> Logs</TabsTrigger>
        </TabsList>

        {/* ── Tab: Corretoras ─────────────────── */}
        <TabsContent value="corretoras" className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button className="gap-1.5" onClick={() => setCadastroOpen(true)}><Plus className="h-4 w-4" /> Cadastrar Nova Corretora</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Corretora</TableHead><TableHead>Plano</TableHead><TableHead className="hidden md:table-cell">Vendedores</TableHead>
                <TableHead className="hidden md:table-cell">Leads</TableHead><TableHead>MRR</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tenants.map((t) => {
                  const st = STATUS_CONFIG[t.statusPlano];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell><Badge variant="outline">{t.plano}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{t.totalVendedores}</TableCell>
                      <TableCell className="hidden md:table-cell">{t.leadsAtivos}</TableCell>
                      <TableCell className="font-semibold">{fmt(t.mrrTenant)}</TableCell>
                      <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(t)} title="Simular Acesso"><UserCog className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTenant(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleBloquear(t)} title={t.statusPlano === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}><Ban className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>

          <Separator />
          <h3 className="text-sm font-semibold text-foreground">👤 Usuários Master (Contato Rápido)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tenants.map((t) => (
              <Card key={t.id} className="border-dashed"><CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{t.masterNome}</p>
                  <Badge variant="outline" className={STATUS_CONFIG[t.statusPlano].className + ' text-[10px]'}>{t.nome}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.masterEmail}</p>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-7" onClick={() => window.open(`https://wa.me/55${t.masterTelefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${t.masterNome}, tudo bem?`)}`, '_blank')}>
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-7" onClick={() => window.open(`mailto:${t.masterEmail}`)}>
                    <Mail className="h-3 w-3" /> Email
                  </Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: Planos e Preços ────────────── */}
        <TabsContent value="planos" className="pt-2">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Corretora</TableHead><TableHead>Plano</TableHead><TableHead>Max Vendedores</TableHead>
                <TableHead>Max Leads</TableHead><TableHead>Acesso API</TableHead><TableHead>White-Label</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tenants.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell><Badge variant="outline">{t.plano}</Badge></TableCell>
                    <TableCell>{t.limits.maxVendedores}</TableCell>
                    <TableCell>{t.limits.maxLeads}</TableCell>
                    <TableCell>{t.limits.acessoApi ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" variant="outline">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                    <TableCell>{t.limits.whiteLabel ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" variant="outline">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Tab: Fila de Leads (Lead Routing) ── */}
        <TabsContent value="fila" className="space-y-4 pt-2">
          <Card><CardContent className="p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">👥 Disponibilidade dos Vendedores</h4>
            <p className="text-xs text-muted-foreground">Controle quais vendedores recebem novos leads automaticamente.</p>
            <div className="space-y-3">
              {vendedores.map(v => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${v.disponivel ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.leadsAtivos} leads ativos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className={`h-3 w-1.5 rounded-sm ${i < v.leadsAtivos ? (v.leadsAtivos > 6 ? 'bg-destructive/70' : 'bg-primary/70') : 'bg-muted'}`} />
                      ))}
                    </div>
                    <Switch
                      checked={v.disponivel}
                      onCheckedChange={(checked) => setVendedores(prev => prev.map(vv => vv.id === v.id ? { ...vv, disponivel: checked } : vv))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 pt-2">
          <Card><CardContent className="p-5">
            <h4 className="text-sm font-semibold text-foreground mb-1">📈 Novos Leads (Últimos 30 dias — Todas as Corretoras)</h4>
            <p className="text-xs text-muted-foreground mb-4">Total: {mockLeadsPerDay.reduce((s, d) => s + d.count, 0)} leads</p>
            <div className="flex items-end gap-[3px] h-32">
              {mockLeadsPerDay.map((d) => (
                <div key={d.day} className="flex-1 group relative flex flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-colors min-h-[2px]"
                    style={{ height: `${(d.count / maxBar) * 100}%` }}
                  />
                  <span className="absolute -top-5 text-[9px] text-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-popover border rounded px-1">{d.count}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Dia 1</span>
              <span className="text-[10px] text-muted-foreground">Dia 30</span>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ── Tab: Logs ──────────────────────── */}
        <TabsContent value="logs" className="pt-2">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Tenant</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {mockLogs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.data).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-sm font-mono">{l.usuario}</TableCell>
                    <TableCell className="text-sm">{l.acao}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.tenant}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────── */}
      <Dialog open={cadastroOpen} onOpenChange={setCadastroOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Corretora</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Nome da Corretora</Label><Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Proteção Brasil" className="mt-1" /></div>
            <Button className="w-full" onClick={handleCadastrar} disabled={!novoNome.trim()}>Cadastrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant: Limits + White-Label */}
      <Dialog open={!!editTenantId} onOpenChange={(open) => !open && setEditTenantId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Corretora</DialogTitle></DialogHeader>
          {editLimits && editWl && (
            <div className="space-y-5 pt-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">📊 Limites do Plano</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Max Vendedores</Label><Input type="number" value={editLimits.maxVendedores} onChange={e => setEditLimits(p => p ? { ...p, maxVendedores: +e.target.value } : p)} className="mt-1" /></div>
                  <div><Label className="text-xs">Max Leads</Label><Input type="number" value={editLimits.maxLeads} onChange={e => setEditLimits(p => p ? { ...p, maxLeads: +e.target.value } : p)} className="mt-1" /></div>
                </div>
                <div className="flex items-center justify-between mt-3 rounded-lg border p-3">
                  <Label className="text-sm">Acesso à API</Label>
                  <Switch checked={editLimits.acessoApi} onCheckedChange={v => setEditLimits(p => p ? { ...p, acessoApi: v } : p)} />
                </div>
                <div className="flex items-center justify-between mt-2 rounded-lg border p-3">
                  <Label className="text-sm">White-Label</Label>
                  <Switch checked={editLimits.whiteLabel} onCheckedChange={v => setEditLimits(p => p ? { ...p, whiteLabel: v } : p)} />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">🎨 Configurações White-Label</h4>
                <div className="space-y-3">
                  <div><Label className="text-xs">URL da Logo</Label><Input value={editWl.logoUrl} onChange={e => setEditWl(p => p ? { ...p, logoUrl: e.target.value } : p)} placeholder="https://..." className="mt-1" /></div>
                  <div>
                    <Label className="text-xs">Cor Primária (Hex)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={editWl.corPrimaria} onChange={e => setEditWl(p => p ? { ...p, corPrimaria: e.target.value } : p)} placeholder="#3B82F6" className="flex-1" />
                      <div className="h-9 w-9 rounded-md border" style={{ backgroundColor: editWl.corPrimaria }} />
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleSaveEdit}><Save className="h-4 w-4" /> Salvar Configurações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
