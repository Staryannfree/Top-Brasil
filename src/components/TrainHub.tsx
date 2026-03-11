import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, Play, FileText, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useTrainingsLocal, type Category } from '@/hooks/useTrainingsLocal';

const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string }> = {
  onboarding: { label: 'Onboarding', emoji: '🚀', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  vendas: { label: 'Vendas', emoji: '💰', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  produto: { label: 'Produto', emoji: '🛡️', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  compliance: { label: 'Compliance', emoji: '📋', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

// Config moved up but removed mocks

export function TrainHub() {
  const { contents, isLoading, toggleConcluido } = useTrainingsLocal();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');

  const filtered = contents.filter(c => {
    if (catFilter !== 'all' && c.categoria !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.titulo.toLowerCase().includes(q) && !c.descricao.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalDone = contents.filter(c => c.concluido).length;
  const progress = contents.length > 0 ? Math.round((totalDone / contents.length) * 100) : 0;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando treinamentos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Centro de Treinamento</h2>
        <p className="text-sm text-muted-foreground">Capacite-se com nossos materiais de onboarding e vendas.</p>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Seu Progresso</p>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{totalDone} de {contents.length} materiais concluídos</p>
      </CardContent></Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5 flex-wrap">
          <button onClick={() => setCatFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${catFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Todos</button>
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${catFilter === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const cfg = CATEGORY_CONFIG[c.categoria];
          return (
            <Card key={c.id} className={`overflow-hidden transition-shadow hover:shadow-md ${c.concluido ? 'opacity-75' : ''}`}>
              <div className={`h-32 flex items-center justify-center ${c.tipo === 'video' ? 'bg-gradient-to-br from-primary/10 to-primary/5' : 'bg-gradient-to-br from-muted to-muted/50'}`}>
                {c.tipo === 'video' ? <Play className="h-10 w-10 text-primary/40" /> : <FileText className="h-10 w-10 text-muted-foreground/30" />}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{c.titulo}</h3>
                  {c.concluido && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.descricao}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {c.duracao}</span>
                  </div>
                </div>
                <Button
                  variant={c.concluido ? 'outline' : 'default'}
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5"
                  onClick={() => toggleConcluido(c.id, c.concluido)}
                >
                  {c.concluido ? 'Marcar como pendente' : c.tipo === 'video' ? '▶ Assistir' : '📄 Ler'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Nenhum conteúdo encontrado.</p>
        </div>
      )}
    </div>
  );
}
