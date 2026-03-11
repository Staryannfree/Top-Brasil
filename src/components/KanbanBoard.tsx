import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadCard } from './LeadCard';
import { LeadDossier } from './LeadDossier';
import { LeadListView } from './LeadListView';
import { KANBAN_COLUMNS, MOTIVOS_PERDA, type Lead, type LeadStatus, type MotivoPerda } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Inbox, Zap } from 'lucide-react';
import { toast } from 'sonner';

type PipelineType = 'vendas' | 'sinistros';

const SINISTRO_COLUMNS: { id: string; title: string }[] = [
  { id: 'aviso_evento', title: 'Aviso de Evento' },
  { id: 'analise_docs', title: 'Análise de Documentos' },
  { id: 'em_oficina', title: 'Em Oficina' },
  { id: 'pronto_entrega', title: 'Pronto para Entrega' },
];

const SINISTRO_COLORS: Record<string, string> = {
  aviso_evento: 'bg-destructive',
  analise_docs: 'bg-amber-500',
  em_oficina: 'bg-blue-500',
  pronto_entrega: 'bg-emerald-500',
};

const COLUMN_COLORS: Record<LeadStatus, string> = {
  novo_lead: 'bg-blue-500',
  cotacao_enviada: 'bg-amber-500',
  em_negociacao: 'bg-purple-500',
  vistoria_contrato: 'bg-emerald-500',
  perdido: 'bg-destructive',
};

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus, motivoPerda?: MotivoPerda) => void;
  onUpdateLead?: (lead: Lead) => void;
  onClearLost?: () => void;
  onAddNote?: (leadId: string, content: string) => void;
  viewMode: 'kanban' | 'list';
  externalSelectedLead?: Lead | null;
  onExternalSelectClear?: () => void;
  privacyMode?: boolean;
  selectedLeads?: Set<string>;
  onSelectLead?: (id: string, selected: boolean) => void;
  onSelectAll?: (ids: string[], selected: boolean) => void;
  onBulkActivate?: (ids: string[]) => void;
}

export function KanbanBoard({
  leads, onUpdateStatus, onUpdateLead, onClearLost, onAddNote, viewMode,
  externalSelectedLead, onExternalSelectClear, privacyMode,
  selectedLeads = new Set(), onSelectLead, onSelectAll, onBulkActivate
}: KanbanBoardProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [pendingLossId, setPendingLossId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineType>('vendas');

  const activeLead = externalSelectedLead ?? selectedLead;

  const getColumnLeads = (status: LeadStatus) =>
    leads.filter((l) => l.status === status);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedId) {
      if (status === 'perdido') {
        setPendingLossId(draggedId);
        setLossDialogOpen(true);
      } else {
        onUpdateStatus(draggedId, status);
      }
      setDraggedId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleClearLost = () => {
    onClearLost?.();
    toast.success('Leads perdidos arquivados');
  };

  const handleSelectMotivo = (motivo: MotivoPerda) => {
    if (pendingLossId) {
      onUpdateStatus(pendingLossId, 'perdido', motivo);
      toast.success('Lead movido para Perdido');
    }
    setPendingLossId(null);
    setLossDialogOpen(false);
  };

  const handleStatusChangeWithLoss = (id: string, status: LeadStatus) => {
    if (status === 'perdido') {
      setPendingLossId(id);
      setLossDialogOpen(true);
    } else {
      onUpdateStatus(id, status);
    }
  };

  const currentLead = activeLead ? leads.find((l) => l.id === activeLead.id) ?? null : null;

  const handleCloseSheet = (open: boolean) => {
    if (!open) {
      setSelectedLead(null);
      onExternalSelectClear?.();
    }
  };

  return (
    <TooltipProvider>
      <>
        {viewMode === 'list' ? (
          <LeadListView
            leads={leads}
            onSelectLead={setSelectedLead}
            selectedLeads={selectedLeads}
            onToggleSelection={onSelectLead}
          />
        ) : (
          <div className="space-y-3">
            {/* Pipeline Selector */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
              <button onClick={() => setPipeline('vendas')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${pipeline === 'vendas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                📊 Pipeline de Vendas
              </button>
              <button onClick={() => setPipeline('sinistros')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${pipeline === 'sinistros' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                🚨 Pipeline de Sinistros
              </button>
            </div>

            {pipeline === 'vendas' ? (
              <div className="flex gap-4 overflow-x-auto pb-4 px-1">
                {KANBAN_COLUMNS.map((col) => {
                  const colLeads = getColumnLeads(col.id);
                  return (
                    <div
                      key={col.id}
                      className="flex-shrink-0 w-72 rounded-xl border bg-muted/30 flex flex-col max-h-[calc(100vh-20rem)]"
                      onDrop={(e) => handleDrop(e, col.id)}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex items-center gap-2 p-3 border-b">
                        <div className={`h-2.5 w-2.5 rounded-full ${COLUMN_COLORS[col.id]}`} />
                        <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                        <Badge variant="secondary" className="ml-1.5 text-xs">{colLeads.length}</Badge>

                        {col.id === 'novo_lead' && colLeads.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-2 text-amber-500 hover:bg-amber-500/10"
                                onClick={() => onBulkActivate?.(colLeads.map(l => l.id))}
                              >
                                <Zap className="h-4 w-4 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Ativar todos os novos no PowerCRM</TooltipContent>
                          </Tooltip>
                        )}

                        {col.id === 'perdido' && colLeads.length > 0 && (
                          <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleClearLost}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TooltipTrigger><TooltipContent>Limpar coluna</TooltipContent></Tooltip>
                        )}
                      </div>
                      <ScrollArea className="flex-1 p-2">
                        <div className="space-y-2">
                          {colLeads.map((lead) => (
                            <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)}>
                              <LeadCard
                                lead={lead}
                                onClick={() => setSelectedLead(lead)}
                                isSelected={selectedLeads.has(lead.id)}
                                onToggleSelection={(selected) => onSelectLead?.(lead.id, selected)}
                              />
                            </div>
                          ))}
                          {colLeads.length === 0 && (
                            <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                              <Inbox className="h-8 w-8 opacity-30" />
                              <p className="text-xs">Nenhum lead nesta etapa</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 px-1">
                {SINISTRO_COLUMNS.map((col) => (
                  <div key={col.id} className="flex-shrink-0 w-72 rounded-xl border bg-muted/30 flex flex-col max-h-[calc(100vh-20rem)]">
                    <div className="flex items-center gap-2 p-3 border-b">
                      <div className={`h-2.5 w-2.5 rounded-full ${SINISTRO_COLORS[col.id]}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                      <Badge variant="secondary" className="ml-auto text-xs">0</Badge>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-8 w-8 opacity-30" />
                        <p className="text-xs">Nenhum sinistro nesta etapa</p>
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <LeadDossier
          lead={currentLead}
          open={!!currentLead}
          onOpenChange={handleCloseSheet}
          onUpdateLead={onUpdateLead}
          onUpdateStatus={handleStatusChangeWithLoss}
          onAddNote={onAddNote}
        />

        {/* Loss Reason Dialog */}
        <Dialog open={lossDialogOpen} onOpenChange={(open) => { if (!open) { setLossDialogOpen(false); setPendingLossId(null); } }}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Motivo da Perda</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {MOTIVOS_PERDA.map((m) => (
                <Button key={m.id} variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => handleSelectMotivo(m.id)}>
                  <span className="text-lg">{m.emoji}</span>
                  <span className="text-xs">{m.label}</span>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
