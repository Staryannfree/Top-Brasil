import { Zap, Trash2, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KANBAN_COLUMNS, type LeadStatus } from '@/types/lead';

interface BulkActionsBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkActivate: () => void;
    onBulkMove: (status: LeadStatus) => void;
    onBulkDelete: () => void;
}

export function BulkActionsBar({
    selectedCount,
    onClearSelection,
    onBulkActivate,
    onBulkMove,
    onBulkDelete,
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="bg-card border-2 border-primary/20 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-4 min-w-[300px] md:min-w-[500px]">
                <div className="flex items-center gap-2 border-r pr-4">
                    <Badge variant="default" className="h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs font-bold bg-primary text-primary-foreground">
                        {selectedCount}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground hidden sm:inline">Selecionados</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onClearSelection}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex flex-1 items-center gap-2">
                    <Button
                        size="sm"
                        className="gap-1.5 h-9 bg-primary"
                        onClick={onBulkActivate}
                    >
                        <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="hidden sm:inline">Ativar no PowerCRM</span>
                        <span className="sm:hidden">Ativar</span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 h-9">
                                <ArrowRight className="h-4 w-4" />
                                <span className="hidden sm:inline">Mover para...</span>
                                <span className="sm:hidden">Mover</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {KANBAN_COLUMNS.map((col) => (
                                <DropdownMenuItem
                                    key={col.id}
                                    onClick={() => onBulkMove(col.id)}
                                    className="gap-2"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    {col.title}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors ml-auto md:ml-0"
                        onClick={onBulkDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
