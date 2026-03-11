import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Search, Gauge, Database, History, DatabaseZap, Loader2, UserPlus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface QuotasData {
    uso_diario: string;
    limite_diario: number;
}

interface PlacaHistory {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    ano: string;
    valor_fipe: number;
    cidade: string;
    created_at: string;
}

interface PlacasHubProps {
    onAddLead: (data?: any) => void;
}

export function PlacasHub({ onAddLead }: PlacasHubProps) {
    const [placa, setPlaca] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingQuotas, setLoadingQuotas] = useState(false);
    const [quotas, setQuotas] = useState<QuotasData | null>(null);
    const [history, setHistory] = useState<PlacaHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [currentResult, setCurrentResult] = useState<any>(null);

    useEffect(() => {
        fetchQuotas();
        fetchHistory();
    }, []);

    const fetchQuotas = async () => {
        setLoadingQuotas(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-placafipe-quotas');
            if (error) throw error;
            if (data && data.success && data.data) {
                setQuotas(data.data);
            }
        } catch (err: any) {
            console.error('Erro ao buscar quotas:', err);
        } finally {
            setLoadingQuotas(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('placas_consultadas')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (data) setHistory(data);
        } catch (err: any) {
            console.error('Erro ao buscar histórico:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleConsultar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!placa || placa.length < 7) {
            toast.error('Digite uma placa válida.');
            return;
        }

        setLoading(true);
        setCurrentResult(null);

        try {
            // Refresh Auth Session for Edge Function caller if needed
            await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('consultar-placa-avulsa', {
                body: { placa }
            });

            if (error) throw error;
            if (data && data.success) {
                setCurrentResult(data.data);
                toast.success('Placa localizada com sucesso!');
                fetchQuotas(); // Update quotas
                setHistory(prev => [data.data, ...prev].slice(0, 50)); // Update history locally
            } else {
                toast.error(data?.error || 'Não foi possível consultar a placa.');
            }
        } catch (err: any) {
            console.error('Erro ao consultar placa:', err);
            toast.error('Falha ao consultar a PlacaFipe.');
        } finally {
            setLoading(false);
        }
    };

    const handleCriarLead = (item: PlacaHistory) => {
        onAddLead({
            placa: item.placa,
            veiculo_marca: item.marca,
            veiculo_modelo: item.modelo,
            veiculo_ano: item.ano,
            valor_fipe: item.valor_fipe,
            veiculo_cidade: item.cidade,
        });
    };

    const calcCota = (val: number | undefined) => {
        if (!val) return null;
        return Math.max(1200, val * 0.04);
    };

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="space-y-6 max-w-5xl mx-auto w-full pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Car className="h-6 w-6 text-primary" />
                        Central de Placas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Busque dados oficiais de veículos e confira o limite de requisições da sua API.</p>
                </div>

                {/* Cota Panel */}
                <Card className="w-full sm:w-80 shadow-sm bg-gradient-to-br from-card to-muted/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                                <DatabaseZap className="h-3.5 w-3.5" /> Quotas PlacaFipe
                            </span>
                            {loadingQuotas ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    {quotas ? `${quotas.uso_diario} / ${quotas.limite_diario}` : 'OFFLINE'}
                                </Badge>
                            )}
                        </div>
                        {quotas && (
                            <Progress
                                value={(parseInt(quotas.uso_diario) / quotas.limite_diario) * 100}
                                className="h-2"
                            />
                        )}
                        <p className="text-[9px] text-muted-foreground text-right mt-1.5">Renova à meia-noite</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="consultar" className="w-full">
                <TabsList className="w-full max-w-md grid grid-cols-2">
                    <TabsTrigger value="consultar" className="gap-2"><Search className="h-4 w-4" /> Consultar</TabsTrigger>
                    <TabsTrigger value="historico" className="gap-2"><History className="h-4 w-4" /> Minhas Placas</TabsTrigger>
                </TabsList>

                <TabsContent value="consultar" className="mt-6">
                    <Card className="border-primary/20 shadow-md">
                        <CardHeader className="pb-4">
                            <CardTitle>Nova Consulta</CardTitle>
                            <CardDescription>Consulte qualquer placa nacional para pre-calcular cotações.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleConsultar} className="flex gap-3 max-w-lg mb-8">
                                <Input
                                    placeholder="EX: ABC1234"
                                    value={placa}
                                    onChange={(e) => setPlaca(e.target.value)}
                                    disabled={loading}
                                    className="uppercase h-12 text-lg font-mono tracking-widest placeholder:tracking-normal"
                                />
                                <Button type="submit" className="h-12 px-6 gap-2" disabled={loading || !placa}>
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    {loading ? 'Buscando...' : 'Consultar'}
                                </Button>
                            </form>

                            {currentResult && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col sm:flex-row">
                                        <div className="p-6 bg-muted/30 sm:w-1/3 border-b sm:border-b-0 sm:border-r flex flex-col justify-center gap-2">
                                            <Badge variant="outline" className="w-fit mb-1 border-primary/30 text-primary">Placa Localizada</Badge>
                                            <h3 className="font-mono text-3xl font-black uppercase text-foreground">{currentResult.placa}</h3>
                                            <p className="text-sm font-medium text-muted-foreground">{currentResult.cidade}</p>
                                        </div>
                                        <div className="p-6 sm:w-2/3 flex flex-col justify-between">
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Veículo</p>
                                                    <p className="font-semibold text-sm leading-tight">{currentResult.marca} {currentResult.modelo}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Ano: {currentResult.ano}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">FIPE Oficina</p>
                                                    <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{fmt(currentResult.valor_fipe)}</p>
                                                </div>
                                                <div className="col-span-2 pt-3 border-t">
                                                    <p className="text-xs text-muted-foreground mb-1">Estimativa: Cota de Participação (Franquia)</p>
                                                    <p className="font-bold text-base">{fmt(calcCota(currentResult.valor_fipe) || 0)}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 justify-end pt-4 border-t border-dashed">
                                                <Button
                                                    className="w-full sm:w-auto gap-2"
                                                    onClick={() => handleCriarLead(currentResult)}
                                                >
                                                    <UserPlus className="h-4 w-4" /> Cadastrar como novo Lead
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Consultas</CardTitle>
                            <CardDescription>As últimas 50 placas consultadas pelo time (Fica salvo na tabela placas_consultadas).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingHistory ? (
                                <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
                            ) : history.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma placa consultada ainda.</div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(item => (
                                        <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-auto min-w-[80px] px-2 bg-background border rounded flex items-center justify-center font-mono font-bold uppercase shadow-sm">
                                                    {item.placa}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{item.marca} {item.modelo}</p>
                                                    <p className="text-xs text-muted-foreground">{item.ano} • {item.cidade}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">FIPE</p>
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(item.valor_fipe)}</p>
                                                </div>
                                                <Button variant="secondary" size="sm" onClick={() => handleCriarLead(item)}>
                                                    Criar Lead
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
