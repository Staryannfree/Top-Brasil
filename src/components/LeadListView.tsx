import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { LeadCard } from './LeadCard';
import { KANBAN_COLUMNS, type Lead, type LeadStatus } from '@/types/lead';

interface LeadListViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  selectedLeads?: Set<string>;
  onToggleSelection?: (id: string, selected: boolean) => void;
}

const COLUMN_DOT: Record<LeadStatus, string> = {
  novo_lead: 'bg-blue-500',
  cotacao_enviada: 'bg-amber-500',
  em_negociacao: 'bg-purple-500',
  vistoria_contrato: 'bg-emerald-500',
  perdido: 'bg-destructive',
};

export function LeadListView({ leads, onSelectLead, selectedLeads = new Set(), onToggleSelection }: LeadListViewProps) {
  return (
    <Accordion type="multiple" defaultValue={KANBAN_COLUMNS.map((c) => c.id)} className="space-y-2">
      {KANBAN_COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.id);
        return (
          <AccordionItem key={col.id} value={col.id} className="border rounded-xl overflow-hidden bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${COLUMN_DOT[col.id]}`} />
                <span className="text-sm font-semibold text-foreground">{col.title}</span>
                <Badge variant="secondary" className="text-xs ml-1">{colLeads.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {colLeads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
              ) : (
                <div className="space-y-2">
                  {colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => onSelectLead(lead)}
                      isSelected={selectedLeads.has(lead.id)}
                      onToggleSelection={(selected) => onToggleSelection?.(lead.id, selected)}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
