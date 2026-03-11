import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, FileCheck, BarChart3, DollarSign } from 'lucide-react';

interface MetricsHeaderProps {
  totalToday: number;
  valorPotencial: number;
  contratosFechados: number;
  totalLeads: number;
  comissoesEstimadas: number;
  metaProgresso: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function MetricsHeader({ totalToday, valorPotencial, contratosFechados, totalLeads, comissoesEstimadas, metaProgresso }: MetricsHeaderProps) {
  const cards = [
    { label: 'Leads Hoje', value: totalToday, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Valor Potencial', value: fmt(valorPotencial), icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Contratos Fechados', value: contratosFechados, icon: FileCheck, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Total de Leads', value: totalLeads, icon: BarChart3, color: 'text-amber-500 bg-amber-500/10' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border bg-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                <p className="text-lg font-bold text-foreground truncate privacy-blur">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comissões Widget */}
      <Card className="border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta do Mês</p>
                <p className="text-sm font-bold text-foreground privacy-blur">💸 Comissões Estimadas: {fmt(comissoesEstimadas)}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-primary">{Math.min(metaProgresso, 100).toFixed(0)}%</span>
          </div>
          <Progress value={Math.min(metaProgresso, 100)} className="h-2.5" />
          <p className="text-[10px] text-muted-foreground mt-1.5">Meta: {fmt(5000)} · 10% sobre adesão dos contratos fechados</p>
        </CardContent>
      </Card>
    </div>
  );
}
