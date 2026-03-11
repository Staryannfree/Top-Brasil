import { Search, Plus, Download, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ATENDENTES } from '@/types/lead';
import type { Lead } from '@/types/lead';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: 'all' | 'particular' | 'app';
  onCategoryFilterChange: (v: 'all' | 'particular' | 'app') => void;
  atendenteFilter: string;
  onAtendenteFilterChange: (v: string) => void;
  onAddLead: () => void;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (v: 'kanban' | 'list') => void;
  allLeads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
  renewalFilter?: boolean;
  onRenewalFilterChange?: (v: boolean) => void;
}

export function Toolbar({ search, onSearchChange, categoryFilter, onCategoryFilterChange, atendenteFilter, onAtendenteFilterChange, onAddLead, viewMode, onViewModeChange, allLeads, onSelectLead, renewalFilter, onRenewalFilterChange }: ToolbarProps) {
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const searchResults = search.length >= 2 && allLeads
    ? allLeads.filter(l => {
        const q = search.toLowerCase();
        return l.nome.toLowerCase().includes(q) || l.placa?.toLowerCase().includes(q) || l.telefone?.includes(q);
      }).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs" ref={wrapperRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, placa ou telefone..."
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            className="pl-9"
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map(l => (
                <button
                  key={l.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  onClick={() => { onSelectLead?.(l); setShowResults(false); onSearchChange(''); }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{l.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[l.placa && `🚗 ${l.placa}`, l.telefone && `📞 ${l.telefone}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && onViewModeChange(v as 'kanban' | 'list')} className="border rounded-lg p-0.5">
          <Tooltip><TooltipTrigger asChild>
            <ToggleGroupItem value="kanban" className="px-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          </TooltipTrigger><TooltipContent>Kanban</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <ToggleGroupItem value="list" className="px-2 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><List className="h-4 w-4" /></ToggleGroupItem>
          </TooltipTrigger><TooltipContent>Lista</TooltipContent></Tooltip>
        </ToggleGroup>

        <ToggleGroup type="single" value={categoryFilter} onValueChange={(v) => v && onCategoryFilterChange(v as 'all' | 'particular' | 'app')} className="border rounded-lg p-0.5">
          <ToggleGroupItem value="all" className="text-xs px-3 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Todos</ToggleGroupItem>
          <ToggleGroupItem value="particular" className="text-xs px-3 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Particular</ToggleGroupItem>
          <ToggleGroupItem value="app" className="text-xs px-3 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">App/Aluguel</ToggleGroupItem>
        </ToggleGroup>

        <Select value={atendenteFilter} onValueChange={onAtendenteFilterChange}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ver leads de:" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ATENDENTES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Tooltip><TooltipTrigger asChild>
          <button
            onClick={() => onRenewalFilterChange?.(!renewalFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${renewalFilter ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' : 'text-muted-foreground border-border hover:text-foreground'}`}
          >
            🔄 Renovações
          </button>
        </TooltipTrigger><TooltipContent>Filtrar apenas leads com +11 meses (renovação)</TooltipContent></Tooltip>

        <Tooltip><TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success('Download do CSV iniciado')}>
            <Download className="h-4 w-4" /><span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </TooltipTrigger><TooltipContent>Exportar leads em CSV</TooltipContent></Tooltip>

        <Tooltip><TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success('Abrindo Hexpress — Gerador de Conteúdo')}>
            ✨ Hexpress
          </Button>
        </TooltipTrigger><TooltipContent>Gerar conteúdo com IA (Hexpress)</TooltipContent></Tooltip>

        <Tooltip><TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success('Abrindo Sópostar — Postagem Automática')}>
            📲 Sópostar
          </Button>
        </TooltipTrigger><TooltipContent>Postar automaticamente nas redes (Sópostar)</TooltipContent></Tooltip>

        <Button onClick={onAddLead} className="gap-1.5"><Plus className="h-4 w-4" /> Novo Lead</Button>
      </div>
    </TooltipProvider>
  );
}
