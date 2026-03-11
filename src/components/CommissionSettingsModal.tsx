import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { CommissionSettings } from '@/types/commissionSettings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CommissionSettings;
  onSave: (settings: CommissionSettings) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function CommissionSettingsModal({ open, onOpenChange, settings, onSave }: Props) {
  const [draft, setDraft] = useState<CommissionSettings>(settings);

  useEffect(() => {
    if (open) setDraft(structuredClone(settings));
  }, [open, settings]);

  const updatePremio = (idx: number, field: 'meta' | 'valor', value: number) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.premioMensal[idx][field] = value;
      return next;
    });
  };

  const updateRecFixa = (idx: number, field: 'meta' | 'valor', value: number) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.recorrenciaFixa[idx][field] = value;
      return next;
    });
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">⚙️ Configurar Regras de Comissão</DialogTitle>
          <DialogDescription>Edite os valores e metas. As mudanças refletem instantaneamente no dashboard.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Premiação Mensal */}
          <Card className="border">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">🏆 Premiação Mensal</p>
              <p className="text-xs text-muted-foreground">Faixas de gamificação por volume de contratos no mês.</p>
              {draft.premioMensal.map((faixa, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Meta (contratos)</Label>
                    <Input type="number" value={faixa.meta} onChange={(e) => updatePremio(i, 'meta', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prêmio (R$)</Label>
                    <Input type="number" value={faixa.valor} onChange={(e) => updatePremio(i, 'valor', Number(e.target.value))} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Bônus Semanal */}
          <Card className="border">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">⚡ Bônus Semanal</p>
              <p className="text-xs text-muted-foreground">Meta de contratos em 7 dias para desbloquear bônus.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Meta (contratos/semana)</Label>
                  <Input type="number" value={draft.bonusSemanal.meta} onChange={(e) => setDraft((p) => ({ ...p, bonusSemanal: { ...p.bonusSemanal, meta: Number(e.target.value) } }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor do Bônus (R$)</Label>
                  <Input type="number" value={draft.bonusSemanal.valor} onChange={(e) => setDraft((p) => ({ ...p, bonusSemanal: { ...p.bonusSemanal, valor: Number(e.target.value) } }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Recorrência Fixa */}
          <Card className="border">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">🔄 Recorrência — Faixas Fixas</p>
              <p className="text-xs text-muted-foreground">Valores fixos para carteiras menores (abaixo do tier percentual).</p>
              {draft.recorrenciaFixa.map((faixa, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mínimo de Ativos</Label>
                    <Input type="number" value={faixa.meta} onChange={(e) => updateRecFixa(i, 'meta', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Fixo (R$)</Label>
                    <Input type="number" value={faixa.valor} onChange={(e) => updateRecFixa(i, 'valor', Number(e.target.value))} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Recorrência Percentual */}
          <Card className="border">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">🔄 Recorrência — Faixas Percentuais</p>
              <p className="text-xs text-muted-foreground">Comissão percentual sobre a soma das mensalidades da carteira ativa.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tier 1 — Mínimo de Ativos</Label>
                  <Input type="number" value={draft.recorrenciaPercentual.tier1Min} onChange={(e) => setDraft((p) => ({ ...p, recorrenciaPercentual: { ...p.recorrenciaPercentual, tier1Min: Number(e.target.value) } }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tier 1 — Porcentagem (%)</Label>
                  <Input type="number" value={draft.recorrenciaPercentual.tier1Porcentagem} onChange={(e) => setDraft((p) => ({ ...p, recorrenciaPercentual: { ...p.recorrenciaPercentual, tier1Porcentagem: Number(e.target.value) } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tier 2 — Mínimo de Ativos</Label>
                  <Input type="number" value={draft.recorrenciaPercentual.tier2Min} onChange={(e) => setDraft((p) => ({ ...p, recorrenciaPercentual: { ...p.recorrenciaPercentual, tier2Min: Number(e.target.value) } }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tier 2 — Porcentagem (%)</Label>
                  <Input type="number" value={draft.recorrenciaPercentual.tier2Porcentagem} onChange={(e) => setDraft((p) => ({ ...p, recorrenciaPercentual: { ...p.recorrenciaPercentual, tier2Porcentagem: Number(e.target.value) } }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Consultoria VIP */}
          <Card className="border">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">💎 Consultoria VIP</p>
              <p className="text-xs text-muted-foreground">Valor mensal por cliente com consultoria VIP ativa.</p>
              <div className="max-w-[200px]">
                <Label className="text-xs text-muted-foreground">Valor por Cliente (R$/mês)</Label>
                <Input type="number" value={draft.valorConsultoriaVip} onChange={(e) => setDraft((p) => ({ ...p, valorConsultoriaVip: Number(e.target.value) }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
