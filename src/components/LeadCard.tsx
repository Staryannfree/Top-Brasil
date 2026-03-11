import { Car, Phone, Flame, Bell, RefreshCw, Thermometer, BadgeCheck, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Lead } from '@/types/lead';
import { ORIGEM_CONFIG } from '@/types/lead';
import { VehiclePopover } from './VehiclePopover';

function isRenewal(dataEntrada: string) {
  const months = (Date.now() - new Date(dataEntrada).getTime()) / (30 * 24 * 3600000);
  return months >= 11;
}

function calcLeadScore(lead: Lead): { score: number; label: string; color: string } {
  let score = 0;
  // Origem scoring
  if (lead.origem === 'indicacao') score += 40;
  else if (lead.origem === 'smclick') score += 25;
  else if (lead.origem === 'meta_ads') score += 15;
  // Valor FIPE
  if (lead.valor_fipe != null) {
    if (lead.valor_fipe >= 150000) score += 30;
    else if (lead.valor_fipe >= 80000) score += 20;
    else score += 10;
  }
  // Categoria
  const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
  if (isApp) score += 15;
  // Status progression
  if (lead.status === 'em_negociacao') score += 10;
  if (lead.status === 'vistoria_contrato') score += 5;

  if (score >= 70) return { score, label: 'Quente', color: 'text-destructive' };
  if (score >= 40) return { score, label: 'Morno', color: 'text-amber-500' };
  return { score, label: 'Frio', color: 'text-slate-400' };
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelection?: (selected: boolean) => void;
}

function getSlaInfo(dataEntrada: string) {
  const hours = (Date.now() - new Date(dataEntrada).getTime()) / 3600000;
  if (hours > 48) return { border: 'border-destructive/70', flame: true };
  if (hours > 24) return { border: 'border-amber-400/70', flame: false };
  return { border: 'border-border', flame: false };
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function LeadCard({ lead, onClick, isSelected, onToggleSelection }: LeadCardProps) {
  const veiculo = [lead.marca, lead.modelo, lead.ano_modelo].filter(Boolean).join(' ');
  const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
  const sla = getSlaInfo(lead.data_entrada);
  const origemCfg = lead.origem ? ORIGEM_CONFIG[lead.origem] : null;
  const renewal = isRenewal(lead.data_entrada);

  const leadScore = calcLeadScore(lead);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 ${sla.border} bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 relative group/card ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
    >
      <div
        className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(v) => onToggleSelection?.(!!v)}
          className="h-5 w-5 bg-background shadow-sm border-2 border-primary/40 data-[state=checked]:border-primary"
        />
      </div>

      {sla.flame && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive shadow-md">
          <Flame className="h-3.5 w-3.5 text-destructive-foreground" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pl-7">
        <p className="font-semibold text-card-foreground truncate flex-1 privacy-blur">{lead.nome}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Thermometer className={`h-3.5 w-3.5 ${leadScore.color}`} />
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Score: {leadScore.score} ({leadScore.label})
            </TooltipContent>
          </Tooltip>
          {lead.temLembrete && (
            <Bell className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
          {lead.atendente && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                {getInitials(lead.atendente)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {lead.placa && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
          <VehiclePopover lead={lead} />
          {lead.dadosVerificados ? (
            <Tooltip>
              <TooltipTrigger>
                <BadgeCheck className="h-3.5 w-3.5 text-green-500" />
              </TooltipTrigger>
              <TooltipContent className="text-xs">Dados técnicos validados via API</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent className="text-xs">Aguardando consulta de placa</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {veiculo && <p className="mt-0.5 text-xs text-muted-foreground truncate">{veiculo}</p>}

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {renewal && (
          <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[10px] gap-0.5 px-1.5 py-0">
            <RefreshCw className="h-2.5 w-2.5" /> Renovação
          </Badge>
        )}
        {isApp && (
          <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
            App/Aluguel
          </span>
        )}
        {origemCfg && (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${origemCfg.color}`}>
            {origemCfg.emoji} {origemCfg.label}
          </span>
        )}
      </div>

      {
        lead.valor_fipe != null && (
          <p className="mt-1 text-xs font-semibold text-primary privacy-blur">{fmt(lead.valor_fipe)}</p>
        )
      }
      {
        lead.telefone && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{lead.telefone}</span>
          </div>
        )
      }
    </div >
  );
}
