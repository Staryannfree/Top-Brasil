import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { CommissionSettingsModal } from '@/components/CommissionSettingsModal';
import type { Lead } from '@/types/lead';
import type { CommissionSettings } from '@/types/commissionSettings';

interface RevenueDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  settings: CommissionSettings;
  onSettingsChange: (s: CommissionSettings) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function isThisMonth(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isLastWeek(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return Date.now() - d.getTime() < 7 * 86400000;
}

export function RevenueDashboard({ open, onOpenChange, leads, settings, onSettingsChange }: RevenueDashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const data = useMemo(() => {
    const s = settings;
    const ativos = leads.filter((l) => l.status === 'vistoria_contrato');
    const fechadosMes = ativos.filter((l) => isThisMonth(l.dataFechamento));
    const fechadosSemana = ativos.filter((l) => isLastWeek(l.dataFechamento));

    // Card 1 – Adesões
    const totalAdesao = fechadosMes.reduce((sum, l) => sum + (l.valorAdesao ?? 0), 0);

    // Card 2 – Premiação mensal
    const qtdMes = fechadosMes.length;
    const sortedPremios = [...s.premioMensal].sort((a, b) => b.meta - a.meta);
    let premiacao = 0;
    let proxNivel = sortedPremios.length > 0 ? sortedPremios[sortedPremios.length - 1].meta : 0;
    let proxValor = sortedPremios.length > 0 ? sortedPremios[sortedPremios.length - 1].valor : 0;
    for (const faixa of sortedPremios) {
      if (qtdMes >= faixa.meta) {
        premiacao = faixa.valor;
        proxNivel = faixa.meta;
        proxValor = faixa.valor;
        break;
      }
    }
    // Find next level above current
    const ascPremios = [...s.premioMensal].sort((a, b) => a.meta - b.meta);
    const nextFaixa = ascPremios.find((f) => f.meta > qtdMes);
    if (nextFaixa) {
      proxNivel = nextFaixa.meta;
      proxValor = nextFaixa.valor;
    }

    // Card 3 – Bônus semanal
    const qtdSemana = fechadosSemana.length;
    const bonusSemanal = qtdSemana >= s.bonusSemanal.meta ? s.bonusSemanal.valor : 0;

    // Card 4 – Recorrência
    const totalAtivos = ativos.length;
    const somaMensal = ativos.reduce((sum, l) => sum + (l.valorMensalidade ?? 0), 0);
    let recorrencia = 0;
    if (totalAtivos >= s.recorrenciaPercentual.tier2Min) {
      recorrencia = somaMensal * (s.recorrenciaPercentual.tier2Porcentagem / 100);
    } else if (totalAtivos >= s.recorrenciaPercentual.tier1Min) {
      recorrencia = somaMensal * (s.recorrenciaPercentual.tier1Porcentagem / 100);
    } else {
      // Fixed tiers (descending)
      const sortedFixa = [...s.recorrenciaFixa].sort((a, b) => b.meta - a.meta);
      for (const faixa of sortedFixa) {
        if (totalAtivos >= faixa.meta) {
          recorrencia = faixa.valor;
          break;
        }
      }
    }

    // Card 5 – Consultoria VIP
    const vipCount = ativos.filter((l) => l.consultoriaVip).length;
    const vipTotal = vipCount * s.valorConsultoriaVip;

    const totalGeral = totalAdesao + premiacao + bonusSemanal + recorrencia + vipTotal;

    return {
      totalAdesao, qtdMes, premiacao, proxNivel, proxValor,
      qtdSemana, bonusSemanal, totalAtivos, somaMensal, recorrencia,
      vipCount, vipTotal, totalGeral,
    };
  }, [leads, settings]);

  const s = settings;
  const sortedFixa = [...s.recorrenciaFixa].sort((a, b) => a.meta - b.meta);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">💰 Meu Faturamento</DialogTitle>
                <DialogDescription>Painel de remuneração e gamificação do mês atual.</DialogDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar Regras</span>
              </Button>
            </div>
          </DialogHeader>

          {/* TOTAL GERAL */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor Total Estimado no Mês</p>
              <p className="text-4xl font-extrabold text-emerald-500">{fmt(data.totalGeral)}</p>
            </CardContent>
          </Card>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 – Adesões */}
            <Card className="border">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">🚀 Adesões (Dinheiro Imediato)</p>
                <p className="text-xs text-muted-foreground">Soma das adesões fechadas no mês</p>
                <p className="text-3xl font-extrabold text-emerald-500">{fmt(data.totalAdesao)}</p>
                <p className="text-xs text-muted-foreground">{data.qtdMes} contratos no mês</p>
              </CardContent>
            </Card>

            {/* Card 2 – Premiação Mensal */}
            <Card className="border">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">🏆 Premiação Mensal</p>
                <p className="text-xs text-muted-foreground">Gamificação por volume de contratos</p>
                <p className="text-3xl font-extrabold text-emerald-500">{fmt(data.premiacao)}</p>
                <Progress value={Math.min((data.qtdMes / data.proxNivel) * 100, 100)} className="h-2.5 mt-1" />
                <p className="text-xs text-muted-foreground">
                  {data.qtdMes}/{data.proxNivel} contratos
                  {data.qtdMes < data.proxNivel && ` — Faltam ${data.proxNivel - data.qtdMes} para ${fmt(data.proxValor)}`}
                </p>
              </CardContent>
            </Card>

            {/* Card 3 – Bônus Semanal */}
            <Card className="border">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">⚡ Bônus Semanal</p>
                <p className="text-xs text-muted-foreground">{s.bonusSemanal.meta} contratos em 7 dias = {fmt(s.bonusSemanal.valor)}</p>
                <p className={`text-3xl font-extrabold ${data.bonusSemanal > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {data.bonusSemanal > 0 ? fmt(data.bonusSemanal) : 'Bloqueado'}
                </p>
                <Progress value={Math.min((data.qtdSemana / s.bonusSemanal.meta) * 100, 100)} className="h-2.5 mt-1" />
                <p className="text-xs text-muted-foreground">
                  {data.qtdSemana}/{s.bonusSemanal.meta} contratos esta semana
                </p>
              </CardContent>
            </Card>

            {/* Card 4 – Recorrência */}
            <Card className="border">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">🔄 Recorrência (Carteira Ativa)</p>
                <p className="text-xs text-muted-foreground">{data.totalAtivos} clientes ativos</p>
                <p className="text-3xl font-extrabold text-emerald-500">{fmt(data.recorrencia)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.totalAtivos < (sortedFixa[0]?.meta ?? 0) && 'Faltam clientes para desbloquear'}
                  {sortedFixa.map((f, i) => {
                    const nextMin = sortedFixa[i + 1]?.meta ?? s.recorrenciaPercentual.tier1Min;
                    if (data.totalAtivos >= f.meta && data.totalAtivos < nextMin) {
                      return `Nível: ${f.meta}+ ativos → ${fmt(f.valor)}`;
                    }
                    return null;
                  })}
                  {data.totalAtivos >= s.recorrenciaPercentual.tier1Min && data.totalAtivos < s.recorrenciaPercentual.tier2Min &&
                    `Nível: ${s.recorrenciaPercentual.tier1Porcentagem}% sobre ${fmt(data.somaMensal)}`}
                  {data.totalAtivos >= s.recorrenciaPercentual.tier2Min &&
                    `Nível: ${s.recorrenciaPercentual.tier2Porcentagem}% sobre ${fmt(data.somaMensal)}`}
                </p>
              </CardContent>
            </Card>

            {/* Card 5 – Consultoria VIP */}
            <Card className="border">
              <CardContent className="p-5 space-y-2">
                <p className="text-sm font-semibold text-foreground">💎 Consultoria VIP (Upsell)</p>
                <p className="text-xs text-muted-foreground">{data.vipCount} clientes com VIP ativo</p>
                <p className="text-3xl font-extrabold text-emerald-500">{fmt(data.vipTotal)}</p>
                <p className="text-xs text-muted-foreground">{data.vipCount} × {fmt(s.valorConsultoriaVip)}/mês</p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <CommissionSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={onSettingsChange}
      />
    </>
  );
}
