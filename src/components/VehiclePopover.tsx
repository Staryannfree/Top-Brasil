import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Copy, RefreshCw, AlertCircle, MapPin, Calendar, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";

// Typing since Lead interface might be slightly different in types/lead.ts
interface VehiclePopoverProps {
    lead: any; // Using any or a partial type to avoid strict type errors here, assuming it has id, placa, veiculo_* etc.
    onUpdateCallback?: (updatedLead: any) => void;
}

export function VehiclePopover({ lead, onUpdateCallback }: VehiclePopoverProps) {
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    if (!lead || !lead.placa) return null;

    const formatCurrency = (value: number | string | undefined | null) => {
        if (value === undefined || value === null) return 'R$ 0,00';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleCopyPlaca = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(lead.placa);
        toast.success("Placa copiada!");
    };

    const handleRecalculateFipe = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!lead.placa) return;

        setIsRecalculating(true);
        toast.info("Consultando PlacaFipe...");

        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('consultar-placa-fipe', {
                body: { lead_id: lead.id, placa: lead.placa }
            });

            if (fnError) throw fnError;
            if (result && result.success) {
                toast.success("Dados do veículo atualizados!");
                if (onUpdateCallback) {
                    onUpdateCallback({ ...lead, ...result.lead });
                }
            } else {
                toast.error(result?.error || "Erro ao consultar placa.");
            }
        } catch (err: any) {
            console.error("Erro ao recalcular FIPE:", err);
            toast.error("Erro na consulta API: " + err.message);
        } finally {
            setIsRecalculating(false);
        }
    };

    const hasVehicleData = !!lead.veiculo_marca || !!lead.valor_fipe;
    const veiculoNome = [lead.veiculo_marca, lead.veiculo_modelo].filter(Boolean).join(' ') || lead.modelo || lead.marca || "Veículo não identificado";

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild onClick={(e) => { e.stopPropagation(); }}>
                <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 transition-colors font-mono flex items-center gap-1.5 py-0.5 px-2"
                >
                    <Car className="h-3 w-3" />
                    {lead.placa}
                </Badge>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-4 shadow-lg animate-in zoom-in-95 duration-200"
                align="start"
                onClick={(e) => e.stopPropagation()} // Prevent closing/triggering parent clicks when clicking inside
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                            <span className="font-mono bg-muted px-2 py-0.5 rounded border border-border tracking-widest">{lead.placa.toUpperCase()}</span>
                        </h4>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyPlaca} title="Copiar Placa">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                            variant="default"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleRecalculateFipe}
                            disabled={isRecalculating}
                            title="Recalcular Dados"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {hasVehicleData ? (
                    <div className="space-y-4">
                        {/* Vehicle Info */}
                        <div>
                            <p className="font-semibold text-sm leading-none bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                {veiculoNome}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 opacity-70" />
                                    <span className="truncate">{lead.veiculo_ano || lead.ano_modelo || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Palette className="h-3.5 w-3.5 opacity-70" />
                                    <span className="truncate">{lead.veiculo_cor || lead.cor || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 col-span-2">
                                    <MapPin className="h-3.5 w-3.5 opacity-70" />
                                    <span className="truncate">{lead.veiculo_cidade || `${lead.cidade || ''} ${lead.estado || ''}`.trim() || 'Não informada'}</span>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* Financials */}
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Tabela FIPE:</span>
                                <span className="font-semibold">{formatCurrency(lead.valor_fipe)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Adesão / Cota (Mín 4%):</span>
                                <span className="font-semibold">{formatCurrency(lead.valor_cota_participacao)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm bg-primary/10 p-2 rounded-md -mx-2 px-2 border border-primary/20">
                                <span className="font-medium text-primary">Plano Mensal (Base):</span>
                                <span className="font-bold text-primary">{formatCurrency(lead.valor_mensalidade)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Dados Incompletos</p>
                            <p className="text-xs text-muted-foreground mt-1 px-4">
                                Clique no botão azul acima para buscar os detalhes na PlacaFipe.
                            </p>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
