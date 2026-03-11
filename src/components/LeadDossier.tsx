import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Copy, Upload, Car, Clock, Link, FileImage, Shield, Send, Zap, MessageSquare, Pencil, Save, StickyNote, ExternalLink, Star } from 'lucide-react';
import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Lead, LeadStatus, LeadNote } from '@/types/lead';
import { KANBAN_COLUMNS } from '@/types/lead';
import { useState, useEffect, useMemo } from 'react';
import { initialProvas, CATEGORIA_VEICULO_CONFIG, EVENTO_CONFIG } from '@/components/MarketingHub';
import type { ProvaSocial, ProvaCategoriaVeiculo } from '@/components/MarketingHub';

interface LeadDossierProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLead?: (lead: Lead) => void;
  onUpdateStatus?: (id: string, status: LeadStatus) => void;
  onAddNote?: (leadId: string, content: string) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const imgSlots = ['Frente', 'Traseira', 'Lateral Esq.', 'Lateral Dir.', 'CNH', 'CRLV'];

const VISTORIA_CHECKLIST = [
  { group: '🛞 Pneus', items: ['Pneu dianteiro esq.', 'Pneu dianteiro dir.', 'Pneu traseiro esq.', 'Pneu traseiro dir.', 'Estepe'] },
  { group: '🪟 Vidros', items: ['Para-brisa', 'Vidro traseiro', 'Vidros laterais', 'Retrovisores'] },
  { group: '🔧 Avarias', items: ['Sem amassados', 'Sem arranhões profundos', 'Pintura original', 'Faróis OK', 'Lanternas OK'] },
  { group: '⚙️ Mecânica', items: ['Chassi OK', 'Sem rebaixamento', 'Kit Gás (se aplicável)', 'Motor sem vazamento'] },
];

function calcFranquia(valorFipe: number | null, categoria: string | null) {
  if (valorFipe == null) return null;
  const isApp = categoria?.toLowerCase().includes('aluguel') || categoria?.toLowerCase().includes('app');
  if (isApp) return valorFipe * 0.06;
  return Math.max(valorFipe * 0.04, 1200);
}

const OBJECOES = [
  { title: 'Quebrar objeção de Preço', icon: '💰', text: 'Entendo que o valor parece alto, mas pense assim: a proteção cobre roubo, furto, colisão e muito mais. Se comparar com o seguro tradicional, nosso valor chega a ser 40% mais barato, e sem análise de perfil. Você paga menos e tem a mesma tranquilidade!' },
  { title: 'Explicar Rastreador Goiânia', icon: '📡', text: 'Sobre o rastreador: ele é obrigatório apenas para a região de Goiânia por questão de índice de sinistro. O custo é de R$ 49,90/mês e já vem com assistência 24h inclusa. É um investimento que protege ainda mais o seu veículo!' },
  { title: 'Diferença de Seguro vs Proteção', icon: '🛡️', text: 'A grande diferença: no seguro, a empresa pode NEGAR a sua cotação com base em perfil, idade, região. Na proteção veicular, TODO MUNDO é aceito. Não tem análise de perfil! Além disso, somos uma associação, então o custo é rateado entre os membros, por isso é muito mais acessível.' },
  { title: 'Carro para App/Aluguel', icon: '🚗', text: 'Trabalhamos sim com carros de aplicativo e aluguel! A cota é de 6% da FIPE e cobrimos inclusive durante o uso profissional. Muitas seguradoras não aceitam App, mas nós aceitamos sem burocracia.' },
  { title: 'Prazo de carência', icon: '⏰', text: 'A carência é de apenas 15 dias para colisão e 30 dias para furto/roubo. Após esse período, você já está 100% coberto. E o melhor: a vistoria pode ser feita pelo próprio celular, sem precisar ir a nenhum lugar!' },
];

export function LeadDossier({ lead, open, onOpenChange, onUpdateLead, onUpdateStatus, onAddNote }: LeadDossierProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [propostaOpen, setPropostaOpen] = useState(false);
  const [statusLinkOpen, setStatusLinkOpen] = useState(false);
  const [whatsMsg, setWhatsMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [powerCrmLoading, setPowerCrmLoading] = useState(false);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  useEffect(() => {
    if (lead) setEditData({ ...lead });
  }, [lead]);

  if (!lead) return null;

  const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
  const veiculo = [lead.veiculo_marca || lead.marca, lead.veiculo_modelo || lead.modelo, lead.veiculo_ano || lead.ano_modelo].filter(Boolean).join(' ');
  const franquia = calcFranquia(lead.valor_fipe, lead.categoria);
  const mensalidade = lead.valor_fipe != null ? lead.valor_fipe * 0.028 : null;

  const handleSaveEdit = () => {
    if (onUpdateLead && editData) {
      onUpdateLead({ ...lead, ...editData } as Lead);
      toast.success('Lead atualizado com sucesso!');
    }
    setEditing(false);
  };

  const handleStatusChange = (newStatus: string) => {
    if (onUpdateStatus) {
      onUpdateStatus(lead.id, newStatus as LeadStatus);
      toast.success('Status atualizado!');
    }
  };

  const handleCopy = () => {
    const text = `📋 Cotação – ${lead.nome}\n🚗 ${veiculo}\n🔢 Placa: ${lead.placa ?? '—'}\n💰 FIPE: ${lead.valor_fipe != null ? fmt(lead.valor_fipe) : '—'}\n📂 Categoria: ${lead.categoria ?? '—'}`;
    navigator.clipboard.writeText(text);
    toast.success('Resumo copiado!');
  };

  const handleCopyVistoria = () => {
    navigator.clipboard.writeText(`https://vistoria.protecaoveicular.app/auto/${lead.id}`);
    toast.success('Link copiado!');
  };

  const handleEnviarProposta = () => {
    setPropostaOpen(false);
    toast.success('Proposta gerada com sucesso!');
  };

  const handleCopyObjecao = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const handleWhatsApp = () => {
    if (!lead.telefone) return;
    const phone = lead.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(whatsMsg || `Olá ${lead.nome}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    setWhatsMsg('');
  };

  const handlePowerCRM = async () => {
    if (powerCrmLoading) return;
    setPowerCrmLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('powercrm-integration', {
        body: { leadId: lead.id }
      });

      if (error) throw error;
      if (data.success === false) throw new Error(data.error);

      toast.success('Cotação gerada no PowerCRM!');
      if (onUpdateLead) {
        onUpdateLead({ ...lead, link_cotacao: data.link_cotacao } as Lead);
      }
    } catch (error: any) {
      console.error('Erro PowerCRM:', error);
      toast.error('Erro ao integrar: ' + error.message);
    } finally {
      setPowerCrmLoading(false);
    }
  };

  const ed = (field: keyof Lead) => editing ? (editData[field] as string) ?? '' : undefined;
  const setEd = (field: keyof Lead, value: string) => setEditData((p) => ({ ...p, [field]: value }));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                {lead.nome}
              </SheetTitle>
              {lead.dadosVerificados ? (
                <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-[10px] gap-1 px-2 py-0.5 w-fit">
                  🛡️ Veículo Identificado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 px-2 py-0.5 w-fit">
                  ⚠️ Aguardando consulta de placa
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={editing ? handleSaveEdit : () => setEditing(true)}
              >
                {editing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </Button>
            </div>
            <SheetDescription className="flex items-center gap-2 flex-wrap">
              {lead.placa && <span className="font-mono uppercase">{lead.placa}</span>}
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-auto text-xs gap-1 border-dashed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isApp && <Badge variant="destructive">App/Aluguel</Badge>}
              {lead.atendente && <Badge variant="outline">👤 {lead.atendente}</Badge>}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="detalhes" className="mt-4">
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="detalhes" className="flex-1 text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="planos" className="flex-1 text-xs">Planos</TabsTrigger>
              <TabsTrigger value="arsenal" className="flex-1 text-xs">Arsenal</TabsTrigger>
              <TabsTrigger value="contrato" className="flex-1 text-xs">Contrato</TabsTrigger>
              <TabsTrigger value="vistoria" className="flex-1 text-xs">Vistoria</TabsTrigger>
              <TabsTrigger value="notas" className="flex-1 text-xs">Notas</TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 text-xs bg-primary/10 text-primary font-bold">Chat Live</TabsTrigger>
              <TabsTrigger value="historico" className="flex-1 text-xs">Histórico</TabsTrigger>
            </TabsList>

            {/* PLANOS */}
            <TabsContent value="planos" className="space-y-3 pt-4">
              <h4 className="text-sm font-semibold text-foreground">Comparador de Planos</h4>
              <p className="text-xs text-muted-foreground mb-2">Valores calculados com base no valor FIPE do veículo{lead.valor_fipe != null ? ` (${fmt(lead.valor_fipe)})` : ''}.</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { nome: 'Bronze', emoji: '🥉', cor: 'border-amber-700/30', multi: 0.025, beneficios: ['Colisão', 'Roubo/Furto', 'Assistência 24h'] },
                  { nome: 'Prata', emoji: '🥈', cor: 'border-muted-foreground/30', multi: 0.032, beneficios: ['Colisão', 'Roubo/Furto', 'Assistência 24h', 'Vidros', 'Carro Reserva 7 dias'] },
                  { nome: 'Ouro', emoji: '🥇', cor: 'border-primary/40', multi: 0.042, beneficios: ['Colisão', 'Roubo/Furto', 'Assistência 24h', 'Vidros', 'Carro Reserva 15 dias', 'APP Passageiros', 'Consultoria VIP'] },
                ].map(plano => {
                  const valor = lead.valor_fipe != null ? lead.valor_fipe * plano.multi : null;
                  return (
                    <Card key={plano.nome} className={`border-2 ${plano.cor}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{plano.emoji} {plano.nome}</span>
                          <span className="text-lg font-bold text-primary">{valor != null ? fmt(valor) : '—'}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                        </div>
                        <ul className="space-y-1">
                          {plano.beneficios.map(b => (
                            <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="text-emerald-500">✓</span> {b}
                            </li>
                          ))}
                        </ul>
                        <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={() => toast.success(`Plano ${plano.nome} selecionado!`)}>
                          Selecionar Plano
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* DETALHES */}
            <TabsContent value="detalhes" className="space-y-3 pt-4">
              <EditableField label="Nome" value={lead.nome} editing={editing} editValue={ed('nome')} onChange={(v) => setEd('nome', v)} />
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="WhatsApp" value={lead.telefone} editing={editing} editValue={ed('telefone')} onChange={(v) => setEd('telefone', v)} />
                <EditableField label="CPF" value={lead.cpf} editing={editing} editValue={ed('cpf')} onChange={(v) => setEd('cpf', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Placa" value={lead.placa} editing={editing} editValue={ed('placa')} onChange={(v) => setEd('placa', v)} />
                <EditableField label="Veículo" value={veiculo} editing={false} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Valor FIPE" value={lead.valor_fipe != null ? fmt(lead.valor_fipe) : null} editing={editing} editValue={editing ? String(editData.valor_fipe ?? '') : undefined} onChange={(v) => setEditData((p) => ({ ...p, valor_fipe: v ? Number(v) : null }))} type={editing ? 'number' : 'text'} />
                <EditableField label="Categoria" value={lead.categoria} editing={false} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Cód. FIPE" value={lead.codigo_fipe} editing={editing} editValue={ed('codigo_fipe')} onChange={(v) => setEd('codigo_fipe', v)} />
                <EditableField label="Cilindradas" value={lead.cilindradas} editing={editing} editValue={ed('cilindradas')} onChange={(v) => setEd('cilindradas', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Cor" value={lead.veiculo_cor || lead.cor} editing={editing} editValue={editing ? (editData.veiculo_cor ?? editData.cor ?? '') : undefined} onChange={(v) => { setEd('veiculo_cor', v); setEd('cor', v); }} />
                <EditableField label="Chassi Parcial" value={lead.chassi_parcial} editing={editing} editValue={ed('chassi_parcial')} onChange={(v) => setEd('chassi_parcial', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Cidade/Estado" value={lead.veiculo_cidade || `${lead.cidade || ''} ${lead.estado || ''}`.trim() || null} editing={editing} editValue={editing ? String(editData.veiculo_cidade ?? '') : undefined} onChange={(v) => setEd('veiculo_cidade', v)} />
                <EditableField label="Estado Antigo" value={lead.estado} editing={editing} editValue={ed('estado')} onChange={(v) => setEd('estado', v)} />
              </div>

              {franquia != null && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Cota de Participação (Franquia) — {isApp ? '6%' : '4%'}
                    </p>
                    <p className="text-2xl font-bold text-primary">{fmt(franquia)}</p>
                    {!isApp && franquia === 1200 && (
                      <p className="text-[10px] text-muted-foreground mt-1">Valor mínimo aplicado (R$ 1.200)</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Consultoria VIP</Label>
                  <p className="text-xs text-muted-foreground">+R$ 20/mês</p>
                </div>
                <Switch checked={editing ? (editData.consultoriaVip ?? lead.consultoriaVip) : lead.consultoriaVip} onCheckedChange={editing ? (v) => setEditData((p) => ({ ...p, consultoriaVip: v })) : undefined} disabled={!editing} />
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" /> Copiar Resumo da Cotação
              </Button>
              <Button className="w-full gap-2" onClick={() => setPropostaOpen(true)}>
                <FileImage className="h-4 w-4" /> Gerar Proposta Visual
              </Button>

              <div className="border-t pt-3 mt-3 space-y-2">
                <Label className="text-xs font-semibold text-primary">Integração PowerCRM</Label>
                {lead.link_cotacao ? (
                  <div className="space-y-2">
                    <Card className="bg-emerald-500/5 border-emerald-500/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">LIink de Checkout Gerado ✅</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(lead.link_cotacao!); toast.success('Link copiado!'); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <a
                          href={lead.link_cotacao}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all block"
                        >
                          {lead.link_cotacao}
                        </a>
                      </CardContent>
                    </Card>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handlePowerCRM} disabled={powerCrmLoading}>
                      <Zap className={`h-3.5 w-3.5 ${powerCrmLoading ? 'animate-pulse text-amber-500' : 'text-amber-500'}`} />
                      {powerCrmLoading ? 'Atualizando no PowerCRM...' : 'Atualizar Cotação no PowerCRM'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5 group" onClick={handlePowerCRM} disabled={powerCrmLoading}>
                    <Zap className={`h-4 w-4 ${powerCrmLoading ? 'animate-pulse text-amber-500' : 'text-amber-500 group-hover:scale-110 transition-transform'}`} />
                    {powerCrmLoading ? 'Gerando no PowerCRM...' : 'Enviar para PowerCRM (Gerar Link)'}
                  </Button>
                )}
              </div>

              <div className="border-t pt-3 mt-3 space-y-2">
                <Label className="text-xs text-muted-foreground">Disparo Rápido WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={`Olá ${lead.nome}, tudo bem?`}
                    value={whatsMsg}
                    onChange={(e) => setWhatsMsg(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleWhatsApp} disabled={!lead.telefone} className="gap-1.5">
                    <Send className="h-4 w-4" /> Enviar
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => setStatusLinkOpen(true)}>
                <ExternalLink className="h-4 w-4" /> Gerar Link de Acompanhamento para Cliente
              </Button>

              {/* Sugestão de Prova Social */}
              <SugestaoProvaSocial lead={lead} />
            </TabsContent>

            {/* ARSENAL */}
            <TabsContent value="arsenal" className="space-y-3 pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Respostas Rápidas</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Clique para copiar e colar direto no WhatsApp.</p>
              {OBJECOES.map((obj) => (
                <button
                  key={obj.title}
                  onClick={() => handleCopyObjecao(obj.text)}
                  className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{obj.icon}</span>
                    <span className="text-sm font-semibold text-foreground">{obj.title}</span>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{obj.text}</p>
                </button>
              ))}
            </TabsContent>

            {/* CONTRATO (ZAPSIGN) */}
            <TabsContent value="contrato" className="space-y-4 pt-4">
              <ContratoTab leadId={lead.id} leadNome={lead.nome} />
            </TabsContent>

            {/* VISTORIA */}
            <TabsContent value="vistoria" className="space-y-5 pt-4">
              <Button variant="secondary" className="w-full gap-2" onClick={handleCopyVistoria}>
                <Link className="h-4 w-4" /> Copiar Link de Auto-Vistoria para o Cliente
              </Button>
              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground">Upload de Imagens</h4>
                <div className="grid grid-cols-3 gap-3">
                  {imgSlots.map((slot) => (
                    <div key={slot} className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground font-medium">{slot}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Checklist Técnico de Vistoria</h4>
                  <span className="text-xs font-bold text-primary">
                    {(() => {
                      const allItems = VISTORIA_CHECKLIST.flatMap(g => g.items);
                      const done = allItems.filter(i => checks[i]).length;
                      return `${Math.round((done / allItems.length) * 100)}%`;
                    })()}
                  </span>
                </div>
                <Progress value={(() => {
                  const allItems = VISTORIA_CHECKLIST.flatMap(g => g.items);
                  const done = allItems.filter(i => checks[i]).length;
                  return Math.round((done / allItems.length) * 100);
                })()} className="h-2 mb-4" />
                <div className="space-y-4">
                  {VISTORIA_CHECKLIST.map((group) => (
                    <div key={group.group}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{group.group}</p>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <label key={item} className="flex items-center gap-3 cursor-pointer">
                            <Checkbox checked={!!checks[item]} onCheckedChange={(v) => setChecks((p) => ({ ...p, [item]: !!v }))} />
                            <span className={`text-sm ${checks[item] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">Aprovar Vistoria</Button>
                <Button className="flex-1">Gerar Contrato</Button>
              </div>
            </TabsContent>

            {/* NOTAS */}
            <TabsContent value="notas" className="space-y-4 pt-4">
              <NotasTab lead={lead} onAddNote={onAddNote} />
            </TabsContent>

            {/* HISTÓRICO */}
            <TabsContent value="historico" className="pt-4">
              <div className="relative border-l-2 border-muted ml-3 space-y-6 pb-4">
                <TimelineItem title="Lead criado" description="Lead adicionado ao sistema" time={lead.created_at} />
                <TimelineItem title="Cotação enviada" description="Cotação gerada e enviada via WhatsApp" time={new Date(new Date(lead.created_at).getTime() + 600000).toISOString()} />
              </div>
            </TabsContent>

            {/* CHAT LIVE */}
            <TabsContent value="chat" className="pt-4 space-y-4">
              <ChatTab lead={lead} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Modal Proposta Visual */}
      <Dialog open={propostaOpen} onOpenChange={setPropostaOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 space-y-5">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-400" />
              <span className="text-lg font-bold tracking-wide">Proteção Top Brasil</span>
            </div>
            <div className="border-t border-white/10 pt-4 space-y-1">
              <p className="text-sm text-white/60">Veículo</p>
              <p className="text-xl font-bold">{veiculo}</p>
              {lead.placa && <p className="font-mono text-sm text-white/70 uppercase">{lead.placa}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/50">Valor FIPE</p>
                <p className="text-lg font-bold text-emerald-400">{lead.valor_fipe != null ? fmt(lead.valor_fipe) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Mensalidade estimada</p>
                <p className="text-lg font-bold text-emerald-400">{mensalidade != null ? fmt(mensalidade) : '—'}</p>
              </div>
            </div>
            {franquia != null && (
              <div>
                <p className="text-xs text-white/50">Cota de Participação</p>
                <p className="text-lg font-bold">{fmt(franquia)}</p>
              </div>
            )}
            <p className="text-[10px] text-white/30 text-center pt-2">A sua Proteção Top Brasil • Proposta gerada automaticamente</p>
          </div>
          <div className="p-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPropostaOpen(false)}>Fechar</Button>
            <Button className="flex-1 gap-2" onClick={handleEnviarProposta}>
              <Send className="h-4 w-4" /> Enviar WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Link de Acompanhamento */}
      <Dialog open={statusLinkOpen} onOpenChange={setStatusLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link de Acompanhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Compartilhe este link com o cliente para que ele acompanhe o progresso da proteção veicular.</p>
            <div className="flex gap-2">
              <Input readOnly value={`https://status.protecao.app/t/${lead.id.slice(0, 8)}`} className="flex-1 font-mono text-xs" />
              <Button size="sm" onClick={() => { navigator.clipboard.writeText(`https://status.protecao.app/t/${lead.id.slice(0, 8)}`); toast.success('Link copiado!'); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-xs font-semibold text-foreground mb-3">Visualização do Cliente:</p>
              <div className="flex items-center gap-0">
                {[
                  { label: 'Cotação', done: ['cotacao_enviada', 'em_negociacao', 'vistoria_contrato'].includes(lead.status) || lead.status === 'perdido' },
                  { label: 'Vistoria', done: lead.status === 'vistoria_contrato' },
                  { label: 'Ativação', done: false },
                ].map((step, i) => (
                  <div key={step.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                    {i < 2 && <div className={`absolute h-0.5 w-full ${step.done ? 'bg-primary' : 'bg-muted'}`} style={{ display: 'none' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditableField({ label, value, editing, editValue, onChange, type = 'text' }: {
  label: string; value: string | null | undefined; editing: boolean;
  editValue?: string; onChange?: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing && onChange ? (
        <Input type={type} value={editValue ?? ''} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      ) : (
        <Input readOnly value={value ?? '—'} className="mt-1 bg-muted/50 cursor-default" />
      )}
    </div>
  );
}

function ContratoTab({ leadId, leadNome }: { leadId: string; leadNome: string }) {
  const [status, setStatus] = useState<'pendente' | 'enviado' | 'assinado'>('pendente');
  const [loading, setLoading] = useState(false);

  const handleGerar = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStatus('enviado');
      toast.success('Contrato gerado e enviado via ZapSign!');
    }, 1500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://app.zapsign.com.br/doc/${leadId}`);
    toast.success('Link de assinatura copiado!');
  };

  const statusConfig = {
    pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
    enviado: { label: 'Enviado - Aguardando Assinatura', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
    assinado: { label: 'Assinado ✓', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  };

  const st = statusConfig[status];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileImage className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Contrato (ZapSign)</h4>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status da Assinatura</span>
            <Badge variant="outline" className={st.className}>{st.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Contrato de proteção veicular para <strong className="text-foreground">{leadNome}</strong></p>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={handleGerar} disabled={loading || status === 'assinado'}>
        {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? 'Gerando contrato...' : status === 'pendente' ? 'Gerar e Enviar Contrato' : 'Reenviar Contrato'}
      </Button>

      {status !== 'pendente' && (
        <>
          <Button variant="secondary" className="w-full gap-2" onClick={handleCopyLink}>
            <Copy className="h-4 w-4" /> Copiar Link de Assinatura
          </Button>
          {status === 'enviado' && (
            <Button variant="outline" className="w-full gap-2" onClick={() => { setStatus('assinado'); toast.success('Contrato marcado como assinado!'); }}>
              <Shield className="h-4 w-4" /> Marcar como Assinado
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function NotasTab({ lead, onAddNote }: { lead: Lead; onAddNote?: (leadId: string, content: string) => void }) {
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim() || !onAddNote) return;
    onAddNote(lead.id, newNote.trim());
    setNewNote('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Anotações</h4>
      </div>
      <Textarea
        placeholder="Escreva uma anotação..."
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        rows={3}
      />
      <Button className="w-full gap-2" onClick={handleAddNote} disabled={!newNote.trim()}>
        <StickyNote className="h-4 w-4" /> Adicionar Nota
      </Button>
      {(lead.notas ?? []).length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma anotação ainda.</p>
      )}
      <div className="space-y-3">
        {(lead.notas ?? []).map((n) => (
          <div key={n.id} className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-sm text-foreground">{n.text}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(n.createdAt).toLocaleString('pt-BR')} · {n.author}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SugestaoProvaSocial({ lead }: { lead: Lead }) {
  const categoriaLead: ProvaCategoriaVeiculo = lead.categoria?.toLowerCase().includes('moto') ? 'moto'
    : (lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app')) ? 'app'
      : 'particular';

  const sugestoes = useMemo(() => {
    const matched = initialProvas.filter(p => p.categoriaVeiculo === categoriaLead);
    if (matched.length >= 2) return matched.slice(0, 3);
    return initialProvas.slice(0, 3);
  }, [categoriaLead]);

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Sugestão de Prova Social</span>
        <Badge variant="outline" className="text-[10px]">{CATEGORIA_VEICULO_CONFIG[categoriaLead].emoji} {CATEGORIA_VEICULO_CONFIG[categoriaLead].label}</Badge>
      </div>
      <div className="space-y-2">
        {sugestoes.map(p => {
          const evCfg = EVENTO_CONFIG[p.evento];
          return (
            <div key={p.id} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground line-clamp-1">{p.titulo}</span>
                <Badge variant="outline" className={`${evCfg.color} text-[9px] shrink-0`}>{evCfg.emoji}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{p.legendaWhatsApp}</p>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-[11px] h-7" onClick={() => { navigator.clipboard.writeText(p.legendaWhatsApp); toast.success('Legenda copiada!'); }}>
                <MessageSquare className="h-3 w-3" /> Copiar para WhatsApp
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineItem({ title, description, time }: { title: string; description: string; time: string }) {
  return (
    <div className="pl-6 relative">
      <div className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 border-primary bg-background" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
        <Clock className="h-3 w-3" />
        {new Date(time).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}

function ChatTab({ lead }: { lead: Lead }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!lead) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_tab_${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `lead_id=eq.${lead.id}` }, (payload) => {
        const newMsg = payload.new;
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lead.id]);

  // Radar SMClick v2 - Polling Otimizado (15s + Trava de Foco)
  useEffect(() => {
    if (!lead || !lead.protocolo) return;

    const pollingInterval = setInterval(async () => {
      // Trava de Foco: Só dispara se a aba estiver ativa
      if (!document.hasFocus()) return;

      try {
        await supabase.functions.invoke('fetch-novas-mensagens', {
          body: { protocol: lead.protocolo }
        });
      } catch (err) {
        console.error("Erro no radar do dossiê:", err);
      }
    }, 15000); // 15 segundos

    return () => clearInterval(pollingInterval);
  }, [lead.id, lead.protocolo]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const text = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('send-chat-message', {
        body: { lead_id: lead.id, telefone: lead.telefone, mensagem: text }
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
      toast.error("Erro ao enviar: " + error.message);
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <ScrollArea className="flex-1 p-2 bg-muted/20 rounded-lg mb-4 border shadow-inner">
        <div className="space-y-3 p-1">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-10">Inicie a conversa com este lead via Chat Live</div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs shadow-sm ${msg.from_me ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                <p className="text-[9px] opacity-70 mt-1 text-right">
                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSending}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
          <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
        </Button>
      </form>
    </div>
  );
}
