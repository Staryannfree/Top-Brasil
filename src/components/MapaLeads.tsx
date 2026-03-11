import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, TrendingUp } from 'lucide-react';
import { useLeadsLocal } from '@/hooks/useLeadsLocal';
import type { Lead } from '@/types/lead';

interface LeadPin {
  id: string;
  nome: string;
  regiao: string;
  x: number;
  y: number;
  status: 'novo' | 'negociacao' | 'fechado';
  valor: number;
}

const REGIOES = ['Todas', 'Setor Bueno', 'Setor Marista', 'Jardim Goiás', 'Setor Oeste', 'Campinas', 'Setor Sul', 'Goiânia 2', 'Aparecida'];

// ── Mapping logic ──────────────────────────────────────────────────
// We don't have lat/lng in DB, but we do have 'bairro' / 'cidade'.
// We'll map known bairros to grid positions, or fallback to random/center.

const REGION_COORDS: Record<string, { x: number, y: number }> = {
  'Setor Bueno': { x: 45, y: 35 },
  'Setor Marista': { x: 55, y: 42 },
  'Jardim Goiás': { x: 65, y: 30 },
  'Setor Oeste': { x: 30, y: 50 },
  'Campinas': { x: 40, y: 60 },
  'Setor Sul': { x: 50, y: 55 },
  'Goiânia 2': { x: 70, y: 50 },
  'Aparecida': { x: 25, y: 70 },
};

function getGridPos(bairro: string | null | undefined): { x: number, y: number } {
  if (!bairro) return { x: 50 + (Math.random() * 10 - 5), y: 50 + (Math.random() * 10 - 5) };
  return REGION_COORDS[bairro] || { x: 50 + (Math.random() * 20 - 10), y: 50 + (Math.random() * 20 - 10) };
}

const STATUS_COLORS: Record<LeadPin['status'], string> = {
  novo: 'bg-blue-500',
  negociacao: 'bg-amber-500',
  fechado: 'bg-emerald-500',
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function MapaLeads() {
  const { allLeads, isLoading } = useLeadsLocal();
  const [regiaoFilter, setRegiaoFilter] = useState('Todas');
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  // Map real leads to map pins
  const realPins: LeadPin[] = useMemo(() => {
    return allLeads.map(l => {
      const { x, y } = getGridPos(l.bairro);
      let s: LeadPin['status'] = 'novo';
      if (l.status === 'em_negociacao') s = 'negociacao';
      if (l.status === 'vistoria_contrato' || l.status === 'fechado' as any) s = 'fechado';

      return {
        id: l.id,
        nome: l.nome,
        regiao: l.bairro || l.cidade || 'Não Especificado',
        x,
        y,
        status: s,
        valor: l.valor_fipe || 30000, // Fallback if no FIPE available
      };
    });
  }, [allLeads]);

  const activeRegioes = ['Todas', ...new Set(realPins.map(p => p.regiao))].filter(Boolean);

  const filtered = regiaoFilter === 'Todas' ? realPins : realPins.filter(p => p.regiao === regiaoFilter);

  const regiaoStats = activeRegioes.filter(r => r !== 'Todas').map(r => {
    const pins = realPins.filter(p => p.regiao === r);
    return { regiao: r, total: pins.length, valor: pins.reduce((s, p) => s + p.valor, 0) };
  }).sort((a, b) => b.total - a.total);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando mapa...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Mapa de Leads</h2>
          <p className="text-sm text-muted-foreground">Distribuição geográfica dos leads ativos em Goiânia e região.</p>
        </div>
        <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {activeRegioes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total de Pins</p><p className="text-2xl font-bold text-foreground">{filtered.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-xs text-muted-foreground">Valor Total FIPE</p><p className="text-2xl font-bold text-emerald-500">{fmt(filtered.reduce((s, p) => s + p.valor, 0))}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Users className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-xs text-muted-foreground">Regiões Ativas</p><p className="text-2xl font-bold text-foreground">{new Set(filtered.map(p => p.regiao)).size}</p></div>
        </CardContent></Card>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full h-[400px] bg-gradient-to-br from-muted/80 via-muted/40 to-muted/60 overflow-hidden">
            {/* Grid lines */}
            {Array.from({ length: 8 }, (_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 border-t border-muted-foreground/5" style={{ top: `${(i + 1) * 11}%` }} />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 border-l border-muted-foreground/5" style={{ left: `${(i + 1) * 11}%` }} />
            ))}

            {/* Region labels */}
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '42%', top: '25%' }}>Setor Bueno</span>
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '52%', top: '36%' }}>Setor Marista</span>
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '60%', top: '20%' }}>Jardim Goiás</span>
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '22%', top: '45%' }}>Setor Oeste</span>
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '32%', top: '56%' }}>Campinas</span>
            <span className="absolute text-[10px] text-muted-foreground/40 font-medium" style={{ left: '45%', top: '50%' }}>Setor Sul</span>

            {/* Pins */}
            {filtered.map(pin => (
              <div
                key={pin.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                onMouseEnter={() => setHoveredPin(pin.id)}
                onMouseLeave={() => setHoveredPin(null)}
              >
                <div className={`h-4 w-4 rounded-full ${STATUS_COLORS[pin.status]} shadow-lg ring-2 ring-background transition-transform ${hoveredPin === pin.id ? 'scale-150' : 'scale-100'}`} />
                {hoveredPin === pin.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover border rounded-lg shadow-lg p-2 whitespace-nowrap z-20">
                    <p className="text-xs font-semibold text-foreground">{pin.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{pin.regiao} · {fmt(pin.valor)}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg border p-2 flex items-center gap-3">
              <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-blue-500" /><span className="text-[10px] text-muted-foreground">Novo</span></div>
              <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /><span className="text-[10px] text-muted-foreground">Negociação</span></div>
              <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Fechado</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {regiaoStats.map(r => (
          <Card key={r.regiao} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRegiaoFilter(r.regiao)}>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground truncate">{r.regiao}</p>
              <div className="flex items-center justify-between mt-1">
                <Badge variant="secondary" className="text-[10px]">{r.total} leads</Badge>
                <span className="text-[10px] text-muted-foreground">{fmt(r.valor)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
