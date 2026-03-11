import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { useLeadsLocal } from '@/hooks/useLeadsLocal';
import { Lead } from '@/types/lead';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Search, Send, User, MessageCircle, MoreVertical, Phone, UserCircle2, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { VehiclePopover } from './VehiclePopover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "./ui/dropdown-menu";
import { Trash2, Eraser, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    lead_id: string;
    telefone: string;
    conteudo: string;
    from_me: boolean;
    sent_at: string;
}

export function LiveChat() {
    const queryClient = useQueryClient();
    const { allLeads, isLoading: leadsLoading } = useLeadsLocal();
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchLeads, setSearchLeads] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const formatCurrency = (value: number | string | undefined | null) => {
        if (value === undefined || value === null) return '0,00';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim();
    };

    const handleTemplateClick = (templateNumber: number) => {
        if (!selectedLead) return;

        let text = '';
        const vMarca = selectedLead.veiculo_marca || selectedLead.marca || '[Marca do Veículo]';
        const vModelo = selectedLead.veiculo_modelo || selectedLead.modelo || '[Modelo do Veículo]';
        const vCor = selectedLead.veiculo_cor || selectedLead.cor || '[Cor]';
        const vAno = selectedLead.veiculo_ano || selectedLead.ano_modelo || '[Ano]';
        const vCidade = selectedLead.veiculo_cidade || selectedLead.cidade || '[Cidade/Estado]';
        const vMensalidade = formatCurrency(selectedLead.valor_mensalidade);
        const vFipe = formatCurrency(selectedLead.valor_fipe);

        switch (templateNumber) {
            case 1:
                text = `Perfeito, ${selectedLead.nome || '{NOME_CLIENTE}'}! Já conectei nossa IA ao sistema nacional e localizei o seu veículo. Trata-se de um ${vMarca} ${vModelo}, cor ${vCor}, ano ${vAno}. Vi aqui que ele está registrado em ${vCidade}, correto? Confirma para mim se é esta a máquina que vamos proteger hoje para eu te passar as vantagens do Plano Black!`;
                break;
            case 2:
                text = `Excelente escolha! Aqui na Top Brasil, sem consulta ao SPC/Serasa, o seu ${vMarca} ${vModelo} fica protegido com o nosso Plano Black por apenas R$ ${vMensalidade} mensais e uma adesão de R$ 250,00.\n\nVocê terá 100% da Tabela FIPE (R$ ${vFipe}), Assistência 24h com até 1.200 km de guincho, Cobertura para Terceiros de R$ 50 mil a R$ 150 mil, Carro Reserva (15 a 30 dias) e proteção onde cobrimos 80% de vidros, faróis e retrovisores!\n\nA proteção para colisão vale em 24h após a vistoria.`;
                break;
            case 3:
                text = `Ficou dentro do que esperava? Se tiver alguma dúvida técnica sobre as coberturas, pode perguntar-me agora. Se estiver tudo certo, qual é o seu CPF para eu liberar o seu contrato?`;
                break;
            case 4:
                text = `CPF confirmado! Para liberar a sua proteção, vou gerar o link da sua vistoria digital. Lembre-se: ela precisa ser feita de dia ou em local bem iluminado. Você precisará gravar um vídeo rápido com o veículo ligado, mostrando o painel e o chassi, combinado?`;
                break;
        }

        setNewMessage(text);
    };

    const handleRecalculateFipe = async () => {
        if (!selectedLead || !selectedLead.placa) {
            toast.error("Lead não possui placa cadastrada.");
            return;
        }

        setIsRecalculating(true);
        toast.info("Consultando PlacaFipe...");

        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('consultar-placa-fipe', {
                body: { lead_id: selectedLead.id, placa: selectedLead.placa }
            });

            if (fnError) throw fnError;
            if (result && result.success) {
                toast.success("Dados do veículo e cotação atualizados com sucesso!");
                setSelectedLead(prev => prev ? { ...prev, ...result.lead } as Lead : null);
            } else {
                toast.error(result?.error || "Erro desconhecido ao consultar placa.");
            }
        } catch (err: any) {
            console.error("Erro ao recalcular FIPE:", err);
            toast.error("Erro ao invocar função de cotação: " + err.message);
        } finally {
            setIsRecalculating(false);
        }
    };

    // Filter leads that have a phone number (and potentially those that actually have chat activity)
    const filteredLeads = allLeads.filter(l =>
        l.nome.toLowerCase().includes(searchLeads.toLowerCase()) ||
        l.telefone?.includes(searchLeads)
    ).filter(l => !!l.telefone);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Subscribe to REALTIME messages
    useEffect(() => {
        if (!selectedLead) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('lead_id', selectedLead.id)
                .order('sent_at', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
                toast.error("Erro ao carregar mensagens");
            } else {
                setMessages((data || []).sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()));
            }
        };

        fetchMessages();

        // Subscribe to NEW and DELETED messages
        const channel = supabase
            .channel(`chat_${selectedLead.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, DELETE, etc.
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `lead_id=eq.${selectedLead.id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as ChatMessage;
                        setMessages(prev => {
                            if (prev.find(m => m.id === newMsg.id || (m.conteudo === newMsg.conteudo && m.sent_at === newMsg.sent_at))) return prev;
                            const updated = [...prev, newMsg];
                            return updated.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Realtime subtscribed for lead ${selectedLead.id}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedLead?.id]); // Use .id for stability

    // Radar SMClick v2 - Polling Otimizado (15s + Trava de Foco)
    useEffect(() => {
        if (!selectedLead || !selectedLead.protocolo) return;

        const pollingInterval = setInterval(async () => {
            // Trava de Foco: Só dispara se a aba estiver ativa
            if (!document.hasFocus()) {
                console.log("Radar em espera: aba inativa.");
                return;
            }

            try {
                await supabase.functions.invoke('fetch-novas-mensagens', {
                    body: { protocol: selectedLead.protocolo }
                });
            } catch (err) {
                console.error("Erro no radar otimizado:", err);
            }
        }, 20000); // 20 segundos

        return () => clearInterval(pollingInterval);
    }, [selectedLead?.id, selectedLead?.protocolo]);

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;
            toast.success("Mensagem deletada");
        } catch (error: any) {
            console.error("Error deleting message:", error);
            toast.error("Erro ao deletar: " + error.message);
        }
    };

    const handleClearChat = async () => {
        if (!selectedLead) return;

        const confirm = window.confirm("Tem certeza que deseja apagar TODO o histórico deste lead no banco de dados?");
        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('lead_id', selectedLead.id);

            if (error) throw error;
            setMessages([]);
            toast.success("Histórico limpo com sucesso");
        } catch (error: any) {
            console.error("Error clearing chat:", error);
            toast.error("Erro ao limpar: " + error.message);
        }
    };

    const triggerSmClickSync = async () => {
        if (!selectedLead || !selectedLead.protocolo) return;
        try {
            await supabase.functions.invoke('fetch-novas-mensagens', {
                body: { protocol: selectedLead.protocolo }
            });
        } catch (err) {
            console.error("Erro ao sincronizar SMClick:", err);
        }
    };

    const handleSyncManual = async () => {
        if (!selectedLead) return;

        toast.info("Sincronizando com SMClick...");
        setIsLoading(true);

        try {
            // Força busca no SMClick primeiro
            await triggerSmClickSync();

            // Depois recarrega do banco local
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('lead_id', selectedLead.id)
                .order('sent_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            toast.success("Chat atualizado");
        } catch (err: any) {
            toast.error("Erro ao sincronizar: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Sincronizar ao trocar de lead
    useEffect(() => {
        if (selectedLead?.protocolo) {
            triggerSmClickSync();
        }
    }, [selectedLead?.id]);

    const handleClearAllChats = async () => {
        const confirm = window.confirm("ATENÇÃO: Isso apagará TODO o histórico de mensagens de TODOS os seus leads. Deseja continuar?");
        if (!confirm) return;

        try {
            // We delete all messages the user has access to based on RLS
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (error) throw error;
            setMessages([]);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success("Todas as conversas foram limpas!");
        } catch (error: any) {
            console.error("Error clearing all chats:", error);
            toast.error("Erro ao limpar tudo: " + error.message);
        }
    };

    const handleClearLeadHistoryFromSidebar = async (e: React.MouseEvent, leadId: string) => {
        e.stopPropagation(); // Don't select the lead
        const confirm = window.confirm("Deseja apagar o histórico de mensagens deste lead?");
        if (!confirm) return;

        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('lead_id', leadId);

            if (error) throw error;
            if (selectedLead?.id === leadId) {
                setMessages([]);
            }
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success("Histórico do lead limpo!");
        } catch (error: any) {
            console.error("Error clearing lead history:", error);
            toast.error("Erro ao limpar: " + error.message);
        }
    };

    const handleDeleteLead = async (e: React.MouseEvent, leadId: string, leadNome: string) => {
        e.stopPropagation();
        const confirm = window.confirm(`Apagar "${leadNome}" COMPLETAMENTE do CRM? Isso irá remover o lead E todo o histórico de mensagens permanentemente.`);
        if (!confirm) return;

        try {
            // Deleting the lead cascade-deletes all its chat_messages automatically
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId);

            if (error) throw error;
            if (selectedLead?.id === leadId) {
                setSelectedLead(null);
                setMessages([]);
            }
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success(`Lead "${leadNome}" apagado com sucesso!`);
        } catch (error: any) {
            console.error("Error deleting lead:", error);
            toast.error("Erro ao apagar lead: " + error.message);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !selectedLead || isSending) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            // Invoke the new SMClick message sending function
            // This function handles both the SMClick API call and the local DB insert
            const { data: result, error: fnError } = await supabase.functions.invoke('send-chat-message', {
                body: {
                    lead_id: selectedLead.id,
                    telefone: selectedLead.telefone,
                    mensagem: messageText
                }
            });

            if (fnError) {
                console.error("Error invoking send-chat-message function:", fnError);
                toast.error("Erro ao invocar função de envio: " + fnError.message);
            } else if (result && result.success === false) {
                console.error("SMClick API returned error:", result.error);
                toast.error(result.error);
            }

            setIsSending(false);

        } catch (error: any) {
            console.error("Error sending message:", error);
            toast.error("Erro ao enviar mensagem: " + error.message);
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-200px)] bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar - Leads List */}
            <div className="w-80 border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b bg-card/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            Atendimento
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 px-2"
                            onClick={handleClearAllChats}
                        >
                            <Trash2 className="h-3 w-3" />
                            Apagar Tudo
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar conversas..."
                            className="pl-9 h-9"
                            value={searchLeads}
                            onChange={(e) => setSearchLeads(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {filteredLeads.length === 0 && !leadsLoading && (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                Nenhum lead encontrado com telefone.
                            </div>
                        )}
                        {filteredLeads.map(lead => (
                            <button
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${selectedLead?.id === lead.id
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'hover:bg-muted/80'
                                    }`}
                            >
                                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                    <AvatarFallback className={selectedLead?.id === lead.id ? 'bg-primary-foreground/20' : ''}>
                                        {lead.nome.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-sm truncate">{lead.nome}</p>
                                    </div>
                                    <p className={`text-xs truncate ${selectedLead?.id === lead.id ? 'opacity-80' : 'text-muted-foreground'}`}>
                                        {lead.telefone}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {lead.status === 'novo_lead' && (
                                        <div className={`h-2 w-2 rounded-full ${selectedLead?.id === lead.id ? 'bg-primary-foreground' : 'bg-primary'} animate-pulse`} />
                                    )}
                                    <div className="flex gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${selectedLead?.id === lead.id ? 'text-primary-foreground/60 hover:text-primary-foreground' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'}`}
                                            onClick={(e) => handleClearLeadHistoryFromSidebar(e, lead.id)}
                                            title="Limpar Histórico"
                                        >
                                            <Eraser className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${selectedLead?.id === lead.id ? 'text-primary-foreground/60 hover:text-primary-foreground' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                            onClick={(e) => handleDeleteLead(e, lead.id, lead.nome)}
                                            title="Apagar Lead"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Window */}
            <div className="flex-1 flex flex-col bg-card relative">
                {selectedLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm z-10 sticky top-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border shadow-sm">
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm leading-tight">{selectedLead.nome}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 font-normal">
                                            ID: {selectedLead.protocolo || 'N/A'}
                                        </Badge>
                                        {selectedLead.placa && (
                                            <VehiclePopover
                                                lead={selectedLead}
                                                onUpdateCallback={(updatedLead) => setSelectedLead(updatedLead as Lead)}
                                            />
                                        )}
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Ativo no WP
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={handleSyncManual}
                                    title="Sincronizar Mensagens"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => toast.info('Ligando...')}>
                                    <Phone className="h-4 w-4" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => toast.info('Em breve: Ver Perfil')}>
                                            <User className="mr-2 h-4 w-4" /> Perfil do Lead
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={handleClearChat}
                                        >
                                            <Eraser className="mr-2 h-4 w-4" /> Limpar Conversa
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <ScrollArea className="flex-1 p-4 bg-muted/10">
                            <div className="space-y-4 py-2">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50 space-y-2">
                                        <MessageCircle className="h-12 w-12" />
                                        <p className="text-sm">Inicie a conversa com este lead</p>
                                    </div>
                                )}
                                {messages.map((msg, i) => (
                                    <div
                                        key={msg.id || i}
                                        className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 group relative`}
                                    >
                                        <div className={`max-w-[75%] space-y-1 ${msg.from_me ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2">
                                                {msg.from_me && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Card className={`px-4 py-2.5 shadow-sm rounded-2xl ${msg.from_me
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none border-primary shadow-primary/20'
                                                    : 'bg-muted/50 dark:bg-muted/20 border-border rounded-tl-none'
                                                    }`}>
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>
                                                </Card>
                                                {!msg.from_me && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                                                {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {msg.from_me && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground/50" />}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Chat Input */}
                        <div className="p-4 border-t bg-card/50 flex flex-col gap-3">
                            {/* Quick Actions Bar */}
                            <ScrollArea className="w-full pb-1 whitespace-nowrap overflow-x-auto">
                                <div className="flex gap-2 w-max px-1">
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1.5 px-3 shadow-sm border border-secondary transition-colors"
                                        onClick={() => handleTemplateClick(1)}
                                    >
                                        1. Confirmar Veículo
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1.5 px-3 shadow-sm border border-secondary transition-colors"
                                        onClick={() => handleTemplateClick(2)}
                                    >
                                        2. Enviar Cotação
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1.5 px-3 shadow-sm border border-secondary transition-colors"
                                        onClick={() => handleTemplateClick(3)}
                                    >
                                        3. Fechamento
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs py-1.5 px-3 shadow-sm border border-secondary transition-colors"
                                        onClick={() => handleTemplateClick(4)}
                                    >
                                        4. Vistoria
                                    </Badge>
                                </div>
                            </ScrollArea>

                            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                                <Input
                                    placeholder="Escreva sua mensagem..."
                                    className="flex-1 pr-12 focus-visible:ring-primary h-11 rounded-full shadow-inner bg-muted/20 border-muted-foreground/10"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={isSending}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="absolute right-1 top-1 h-9 w-9 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                                    disabled={!newMessage.trim() || isSending}
                                >
                                    <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
                                </Button>
                            </form>
                            <p className="text-[10px] text-muted-foreground mt-2 text-right">
                                Pressione Enter para enviar. Mensagens via SMClick API.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 p-8 animate-in fade-in duration-700">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                            <UserCircle2 className="h-24 w-24 text-muted-foreground/30 relative" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Seleccione uma conversa</h3>
                        <p className="text-sm text-center max-w-xs mt-2">
                            Escolha um lead na lista lateral para visualizar o histórico de mensagens e responder em tempo real.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
