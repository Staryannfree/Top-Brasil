import { useState, useEffect, useMemo } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { MetricsHeader } from '@/components/MetricsHeader';
import { Toolbar } from '@/components/Toolbar';
import { AddLeadModal } from '@/components/AddLeadModal';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { QuickQuote } from '@/components/QuickQuote';
import { RevenueDashboard } from '@/components/RevenueDashboard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { LoginPage } from '@/components/LoginPage';
import type { UserRole } from '@/components/LoginPage';
import { useAuth } from '@/components/AuthProvider';
import { useCommissionSettings } from '@/hooks/useCommissionSettings';
import { KanbanSkeleton } from '@/components/KanbanSkeleton';
import { GestaoCarteira } from '@/components/GestaoCarteira';
import { AdminSaas } from '@/components/AdminSaas';
import { MarketingHub } from '@/components/MarketingHub';
import { MapaLeads } from '@/components/MapaLeads';
import { TrainHub } from '@/components/TrainHub';
import { TeamManagement } from '@/components/TeamManagement';
import B2BPartners from './B2BPartners';
import { useLeadsLocal } from '@/hooks/useLeadsLocal';
import { LiveChat } from '@/components/LiveChat';
import { PlacasHub } from '@/components/PlacasHub';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import {
  Shield, DollarSign, LogOut, BarChart3, CreditCard, Building2, Megaphone,
  MapPin, BookOpen, HelpCircle, Eye, EyeOff, Wifi, Users, User, Settings, ChevronDown, MessageSquare, Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import type { CommissionSettings } from '@/types/commissionSettings';
import { DEFAULT_COMMISSION_SETTINGS } from '@/types/commissionSettings';
import type { Lead } from '@/types/lead';
import { toast } from 'sonner';

type AppView = 'funil' | 'carteira' | 'equipe' | 'marketing' | 'mapa' | 'treinamento' | 'admin' | 'atendimento' | 'placas' | 'parceiros';

const ALL_NAV_ITEMS: { id: AppView; label: string; icon: typeof BarChart3; emoji: string; roles: UserRole[] }[] = [
  { id: 'funil', label: 'Funil de Vendas', icon: BarChart3, emoji: '📊', roles: ['vendedor', 'gerente', 'superadmin'] },
  { id: 'carteira', label: 'Gestão de Carteira', icon: CreditCard, emoji: '💳', roles: ['gerente', 'superadmin'] },
  { id: 'equipe', label: 'Equipe', icon: Users, emoji: '👥', roles: ['gerente', 'superadmin'] },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, emoji: '📢', roles: ['gerente', 'superadmin'] },
  { id: 'mapa', label: 'Mapa de Leads', icon: MapPin, emoji: '📍', roles: ['gerente', 'superadmin'] },
  { id: 'treinamento', label: 'Treinamento', icon: BookOpen, emoji: '📚', roles: ['vendedor', 'gerente', 'superadmin'] },
  { id: 'admin', label: 'Admin SaaS', icon: Building2, emoji: '🏢', roles: ['superadmin'] },
  { id: 'placas', label: 'Central de Placas', icon: Car, emoji: '🚗', roles: ['vendedor', 'gerente', 'superadmin'] },
  { id: 'atendimento', label: 'Atendimento (Chat)', icon: MessageSquare, emoji: '💬', roles: ['vendedor', 'gerente', 'superadmin'] },
  { id: 'parceiros', label: 'Parceiros B2B', icon: Building2, emoji: '🤝', roles: ['gerente', 'superadmin'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  vendedor: 'Vendedor',
  gerente: 'Gerente',
  superadmin: 'Super Admin',
};

/* ── Sidebar Component ── */
function AppSidebar({ currentView, setCurrentView, navItems, userRole, onLogout }: {
  currentView: AppView;
  setCurrentView: (v: AppView) => void;
  navItems: typeof ALL_NAV_ITEMS;
  userRole: UserRole;
  onLogout: () => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate">CRM Proteção</p>
              <p className="text-[10px] text-sidebar-foreground/60">Veicular</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={currentView === item.id}
                    tooltip={item.label}
                    onClick={() => setCurrentView(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-sidebar-foreground/60">Online • v2.1.0</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

/* ── Main Page ── */
const Index = () => {
  const {
    leads, allLeads, search, setSearch, categoryFilter, setCategoryFilter,
    atendenteFilter, setAtendenteFilter, renewalFilter, setRenewalFilter,
    updateLeadStatus, updateLead, addLead, deleteLead, clearLost, addNote, metrics,
    bulkUpdateStatus, bulkDeleteLeads, bulkActivateLeads,
    isLoading: leadsLoading
  } = useLeadsLocal();
  const [addOpen, setAddOpen] = useState(false);
  const [addLeadData, setAddLeadData] = useState<Partial<Lead> | null>(null);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const { settings: commissionSettings, updateSettings: setCommissionSettings, isLoading: isSettingsLoading } = useCommissionSettings();

  const { session, profile, isLoading: isAuthLoading, signOut } = useAuth();
  const isAuthenticated = !!session;
  const userRole = profile?.role || 'vendedor';

  const isLoading = leadsLoading || isAuthLoading || isSettingsLoading;
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [currentView, setCurrentView] = useState<AppView>('funil');
  const [searchSelectedLead, setSearchSelectedLead] = useState<Lead | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const navItems = useMemo(() =>
    ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole)),
    [userRole]
  );

  useEffect(() => {
    const allowed = ALL_NAV_ITEMS.find(i => i.id === currentView);
    if (allowed && !allowed.roles.includes(userRole)) setCurrentView('funil');
  }, [userRole, currentView]);

  const handleLogout = async () => {
    await signOut();
    setCurrentView('funil');
  };

  if (!isAuthenticated && !isAuthLoading) {
    return <LoginPage />;
  }

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center"><KanbanSkeleton /></div>;
  }

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full bg-background transition-colors ${privacyMode ? 'privacy-mode' : ''}`}>
        <AppSidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          navItems={navItems}
          userRole={userRole}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="border-b bg-card px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Badge variant="outline" className="hidden lg:flex text-[10px] h-6">{ROLE_LABELS[userRole]}</Badge>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <Tooltip><TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 px-2 sm:px-3" onClick={() => setRevenueOpen(true)}>
                  <DollarSign className="h-3.5 w-3.5" /><span className="hidden lg:inline text-xs">Faturamento</span>
                </Button>
              </TooltipTrigger><TooltipContent>Dashboard de Faturamento</TooltipContent></Tooltip>

              <QuickQuote />
              <NotificationCenter />
              <DarkModeToggle />

              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setPrivacyMode(!privacyMode)}>
                  {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger><TooltipContent>{privacyMode ? 'Desativar Modo Privacidade' : 'Ativar Modo Privacidade'}</TooltipContent></Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hidden sm:inline-flex">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">❓ Ajuda Rápida</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p><strong className="text-foreground">Como adicionar um lead?</strong><br />Clique em "Novo Lead" na barra de ferramentas.</p>
                      <p><strong className="text-foreground">Como mover um lead?</strong><br />Arraste o card entre as colunas do Kanban.</p>
                      <p><strong className="text-foreground">Onde vejo minhas comissões?</strong><br />Clique em "Faturamento" no header.</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 h-8 px-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium text-foreground">Yann</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[userRole]}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info('Perfil em breve')}>
                    <User className="h-4 w-4 mr-2" /> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Configurações em breve')}>
                    <Settings className="h-4 w-4 mr-2" /> Configurações da Empresa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto pb-12">
            {isLoading ? (
              <KanbanSkeleton />
            ) : (
              <>
                {currentView === 'funil' && (
                  <>
                    <MetricsHeader {...metrics} />
                    <Toolbar
                      search={search}
                      onSearchChange={setSearch}
                      categoryFilter={categoryFilter}
                      onCategoryFilterChange={setCategoryFilter}
                      atendenteFilter={atendenteFilter}
                      onAtendenteFilterChange={setAtendenteFilter}
                      onAddLead={() => setAddOpen(true)}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      allLeads={allLeads}
                      onSelectLead={(lead) => setSearchSelectedLead(lead)}
                      renewalFilter={renewalFilter}
                      onRenewalFilterChange={setRenewalFilter}
                    />
                    <KanbanBoard
                      leads={leads}
                      onUpdateStatus={updateLeadStatus}
                      onUpdateLead={updateLead}
                      onClearLost={clearLost}
                      onAddNote={addNote}
                      viewMode={viewMode}
                      externalSelectedLead={searchSelectedLead}
                      onExternalSelectClear={() => setSearchSelectedLead(null)}
                      privacyMode={privacyMode}
                      selectedLeads={selectedLeads}
                      onSelectLead={(id, selected) => {
                        const next = new Set(selectedLeads);
                        if (selected) next.add(id);
                        else next.delete(id);
                        setSelectedLeads(next);
                      }}
                      onSelectAll={(ids, selected) => {
                        const next = new Set(selectedLeads);
                        ids.forEach(id => {
                          if (selected) next.add(id);
                          else next.delete(id);
                        });
                        setSelectedLeads(next);
                      }}
                      onBulkActivate={bulkActivateLeads}
                    />
                  </>
                )}
                {currentView === 'carteira' && <GestaoCarteira />}
                {currentView === 'equipe' && <TeamManagement userRole={userRole} userTenant="top_brasil" />}
                {currentView === 'marketing' && <MarketingHub />}
                {currentView === 'mapa' && <MapaLeads />}
                {currentView === 'treinamento' && <TrainHub />}
                {currentView === 'admin' && userRole === 'superadmin' && <AdminSaas />}
                { currentView === 'placas' && <PlacasHub onAddLead={(data) => { setAddLeadData(data || null); setAddOpen(true); }} />}
                { currentView === 'atendimento' && <LiveChat />}
                { currentView === 'parceiros' && <B2BPartners />}
              </>
            )}
          </main>
        </div>
      </div>

      <AddLeadModal open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setAddLeadData(null); }} onSave={addLead} initialData={addLeadData} />
      <RevenueDashboard
        open={revenueOpen}
        onOpenChange={setRevenueOpen}
        leads={allLeads}
        settings={commissionSettings}
        onSettingsChange={setCommissionSettings}
      />

      <BulkActionsBar
        selectedCount={selectedLeads.size}
        onClearSelection={() => setSelectedLeads(new Set())}
        onBulkActivate={() => {
          bulkActivateLeads(Array.from(selectedLeads));
          setSelectedLeads(new Set());
        }}
        onBulkMove={(status) => {
          bulkUpdateStatus(Array.from(selectedLeads), status);
          setSelectedLeads(new Set());
        }}
        onBulkDelete={() => {
          if (confirm(`Excluir ${selectedLeads.size} leads permanentemente?`)) {
            bulkDeleteLeads(Array.from(selectedLeads));
            setSelectedLeads(new Set());
          }
        }}
      />
    </SidebarProvider>
  );
};

export default Index;
