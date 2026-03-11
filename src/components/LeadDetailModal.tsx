import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Car, DollarSign, Phone, User, Hash, Trash2 } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead';
import { KANBAN_COLUMNS } from '@/types/lead';
import { useUpdateLeadStatus, useDeleteLead } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  const updateStatus = useUpdateLeadStatus();
  const deleteLead = useDeleteLead();

  if (!lead) return null;

  const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
  const veiculo = [lead.marca, lead.modelo].filter(Boolean).join(' ');
  const ano = [lead.ano_fabricacao, lead.ano_modelo].filter(Boolean).join('/');

  const handleStatusChange = (status: LeadStatus) => {
    updateStatus.mutate({ id: lead.id, status }, {
      onSuccess: () => toast.success('Status atualizado!'),
    });
  };

  const handleDelete = () => {
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        toast.success('Lead removido!');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {lead.nome}
          </DialogTitle>
          <DialogDescription>
            Criado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select defaultValue={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            {lead.telefone && (
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> WhatsApp</label>
                <p className="text-sm font-medium text-foreground">{lead.telefone}</p>
              </div>
            )}
            {lead.cpf && (
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> CPF</label>
                <p className="text-sm font-medium text-foreground">{lead.cpf}</p>
              </div>
            )}
          </div>

          {/* Vehicle */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Car className="h-4 w-4 text-primary" /> Veículo
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {lead.placa && <div><span className="text-muted-foreground text-xs">Placa</span><p className="font-mono uppercase text-foreground">{lead.placa}</p></div>}
              {veiculo && <div><span className="text-muted-foreground text-xs">Modelo</span><p className="text-foreground">{veiculo}</p></div>}
              {ano && <div><span className="text-muted-foreground text-xs">Ano</span><p className="text-foreground">{ano}</p></div>}
              {lead.codigo_fipe && <div><span className="text-muted-foreground text-xs">Código FIPE</span><p className="text-foreground">{lead.codigo_fipe}</p></div>}
              {lead.cilindradas && <div><span className="text-muted-foreground text-xs">Cilindradas</span><p className="text-foreground">{lead.cilindradas}</p></div>}
            </div>
            {lead.valor_fipe != null && (
              <div className="flex items-center gap-1.5 pt-1 border-t">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Valor FIPE:</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_fipe)}
                </span>
              </div>
            )}
            {isApp && (
              <Badge variant="destructive" className="mt-1">Uso App / Aluguel</Badge>
            )}
          </div>

          <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Remover Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
