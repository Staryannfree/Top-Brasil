import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, Search, Image, FileText, Smartphone, Plus, Play, Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketingLocal, type MaterialType } from '@/hooks/useMarketingLocal';

// ── Material types ──
// ── Material types ──
// MaterialType and MarketingMaterial now imported from useMarketingLocal

const TIPO_CONFIG: Record<MaterialType, { label: string; icon: typeof Image; color: string }> = {
  banner: { label: 'Banner', icon: Image, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  story: { label: 'Story', icon: Smartphone, color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  pdf: { label: 'PDF', icon: FileText, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

const mockMaterials: Material[] = [
  { id: '1', titulo: 'Banner Promoção Janeiro', tipo: 'banner', descricao: 'Banner 1200x628 para Facebook e Instagram Feed', link: 'https://cdn.protecao.app/banners/promo-jan.png' },
  { id: '2', titulo: 'Story - Proteção Completa', tipo: 'story', descricao: 'Story 1080x1920 com CTA de cotação', link: 'https://cdn.protecao.app/stories/protecao-completa.png' },
  { id: '3', titulo: 'Tabela FIPE Atualizada', tipo: 'pdf', descricao: 'PDF com valores atualizados da tabela FIPE para consulta', link: 'https://cdn.protecao.app/pdfs/tabela-fipe-2026.pdf' },
  { id: '4', titulo: 'Banner Indicação Premiada', tipo: 'banner', descricao: 'Banner para campanha de indicação com bônus', link: 'https://cdn.protecao.app/banners/indicacao.png' },
  { id: '5', titulo: 'Story - Depoimento Cliente', tipo: 'story', descricao: 'Template para depoimento de cliente satisfeito', link: 'https://cdn.protecao.app/stories/depoimento.png' },
  { id: '6', titulo: 'Regulamento Proteção Veicular', tipo: 'pdf', descricao: 'PDF do regulamento completo para envio ao cliente', link: 'https://cdn.protecao.app/pdfs/regulamento.pdf' },
  { id: '7', titulo: 'Banner App/Aluguel', tipo: 'banner', descricao: 'Banner específico para motoristas de aplicativo', link: 'https://cdn.protecao.app/banners/app-aluguel.png' },
  { id: '8', titulo: 'Story - Rastreador Goiânia', tipo: 'story', descricao: 'Story informativo sobre rastreador obrigatório em Goiânia', link: 'https://cdn.protecao.app/stories/rastreador.png' },
  { id: '9', titulo: 'Tabela de Cotas e Franquias', tipo: 'pdf', descricao: 'PDF com valores de cota de participação por categoria', link: 'https://cdn.protecao.app/pdfs/cotas-franquias.pdf' },
];

// ── Social Proof types ──
export type ProvaCategoriaVeiculo = 'particular' | 'app' | 'moto';
export type ProvaEvento = 'roubo' | 'colisao' | 'assistencia';

export interface ProvaSocial {
  id: string;
  slug: string;
  titulo: string;
  categoriaVeiculo: ProvaCategoriaVeiculo;
  evento: ProvaEvento;
  urlMidia: string;
  legendaWhatsApp: string;
  criadoEm: string;
}

const CATEGORIA_VEICULO_CONFIG: Record<ProvaCategoriaVeiculo, { label: string; emoji: string; color: string }> = {
  particular: { label: 'Particular', emoji: '🚗', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  app: { label: 'App/Aluguel', emoji: '📱', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  moto: { label: 'Moto', emoji: '🏍️', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

const EVENTO_CONFIG: Record<ProvaEvento, { label: string; emoji: string; color: string }> = {
  roubo: { label: 'Roubo/Furto', emoji: '🚨', color: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
  colisao: { label: 'Colisão', emoji: '💥', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  assistencia: { label: 'Assistência 24h', emoji: '🛠️', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};

const initialProvas: ProvaSocial[] = [
  { id: '1', slug: 'onix-batido-setor-bueno', titulo: 'Depoimento Onix Batido - Setor Bueno, Goiânia', categoriaVeiculo: 'particular', evento: 'colisao', urlMidia: 'https://cdn.protecao.app/provas/onix-batido.mp4', legendaWhatsApp: '🚗💥 Olha o que aconteceu com o Onix do nosso associado no Setor Bueno! Graças à proteção veicular, ele não teve prejuízo nenhum. Quer saber como proteger o seu? Me chama! ✅', criadoEm: '2026-02-10T10:00:00Z' },
  { id: '2', slug: 'hb20-roubo-aparecida', titulo: 'Recuperação HB20 Roubado - Aparecida de Goiânia', categoriaVeiculo: 'particular', evento: 'roubo', urlMidia: 'https://cdn.protecao.app/provas/hb20-roubo.jpg', legendaWhatsApp: '🚨 HB20 roubado em Aparecida de Goiânia foi RECUPERADO em 48h graças ao rastreador! O associado já recebeu o carro de volta. Sua proteção pode salvar o seu também! 🛡️', criadoEm: '2026-01-25T14:30:00Z' },
  { id: '3', slug: 'uber-kwid-guincho', titulo: 'Assistência Kwid Uber - Guincho Rápido', categoriaVeiculo: 'app', evento: 'assistencia', urlMidia: 'https://cdn.protecao.app/provas/kwid-guincho.mp4', legendaWhatsApp: '📱🛠️ Motorista de App com Kwid precisou de guincho às 2h da manhã e a assistência 24h resolveu em 40 minutos! Proteção para quem roda de App também. Consulte! 🚗✅', criadoEm: '2026-02-20T02:15:00Z' },
  { id: '4', slug: 'cg160-colisao-campinas', titulo: 'Colisão CG 160 - Setor Campinas', categoriaVeiculo: 'moto', evento: 'colisao', urlMidia: 'https://cdn.protecao.app/provas/cg160-colisao.jpg', legendaWhatsApp: '🏍️💥 CG 160 do nosso associado sofreu colisão no Setor Campinas. A proteção cobriu o conserto completo! Moto também tem proteção veicular. Quer saber mais? 🛡️', criadoEm: '2026-03-01T09:00:00Z' },
  { id: '5', slug: 'corolla-guincho-goiania', titulo: 'Assistência Corolla - Pneu Furado GO-060', categoriaVeiculo: 'particular', evento: 'assistencia', urlMidia: 'https://cdn.protecao.app/provas/corolla-pneu.jpg', legendaWhatsApp: '🚗🛠️ Corolla do associado furou o pneu na GO-060. Assistência 24h chegou em 25 min e resolveu no local! Isso é ter PROTEÇÃO de verdade. Faça sua cotação! ✅', criadoEm: '2026-02-28T17:45:00Z' },
  { id: '6', slug: 'mobi-app-roubo-dergo', titulo: 'Mobi App Roubado - DERGO', categoriaVeiculo: 'app', evento: 'roubo', urlMidia: 'https://cdn.protecao.app/provas/mobi-roubo.mp4', legendaWhatsApp: '🚨📱 Mobi de motorista de App foi roubado na região do DERGO. Em 5 dias o associado recebeu a indenização integral! Proteja seu carro de trabalho. Fale comigo! 💬', criadoEm: '2026-03-05T11:20:00Z' },
];

export function MarketingHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">📢 Marketing Hub</h2>
        <p className="text-sm text-muted-foreground">Materiais e provas sociais para suas campanhas.</p>
      </div>

      <Tabs defaultValue="materiais">
        <TabsList>
          <TabsTrigger value="materiais">📦 Materiais</TabsTrigger>
          <TabsTrigger value="provas">⭐ Provas Sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="materiais" className="pt-4">
          <MateriaisSection />
        </TabsContent>
        <TabsContent value="provas" className="pt-4">
          <ProvasSociaisSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Materiais Section ──
function MateriaisSection() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<MaterialType | 'all'>('all');
  const { materials, isLoadingMaterials } = useMarketingLocal();

  const filtered = materials.filter(m => {
    if (tipoFilter !== 'all' && m.tipo !== tipoFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.titulo.toLowerCase().includes(q) && !m.descricao.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (isLoadingMaterials) return <div className="p-8 text-center text-muted-foreground">Carregando materiais...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar material..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          {(['all', 'banner', 'story', 'pdf'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tipoFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'all' ? 'Todos' : TIPO_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => {
          const cfg = TIPO_CONFIG[m.tipo];
          const Icon = cfg.icon;
          return (
            <Card key={m.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-muted/50 flex items-center justify-center border-b">
                <Icon className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{m.titulo}</h3>
                  <Badge variant="outline" className={`${cfg.color} text-[10px] shrink-0`}>{cfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{m.descricao}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={() => toast.success(`Download iniciado: ${m.titulo}`)}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={() => { navigator.clipboard.writeText(m.link); toast.success('Link copiado!'); }}>
                    <Copy className="h-3.5 w-3.5" /> Copiar Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Nenhum material encontrado.</p>
        </div>
      )}
    </div>
  );
}

// ── Provas Sociais Section ──
function ProvasSociaisSection() {
  const { provas, isLoadingProvas, addProva } = useMarketingLocal();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<ProvaCategoriaVeiculo | 'all'>('all');
  const [eventoFilter, setEventoFilter] = useState<ProvaEvento | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<ProvaCategoriaVeiculo>('particular');
  const [evento, setEvento] = useState<ProvaEvento>('colisao');
  const [urlMidia, setUrlMidia] = useState('');
  const [legenda, setLegenda] = useState('');

  const filtered = provas.filter(p => {
    if (catFilter !== 'all' && p.categoriaVeiculo !== catFilter) return false;
    if (eventoFilter !== 'all' && p.evento !== eventoFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.titulo.toLowerCase().includes(q) && !p.legendaWhatsApp.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleAdd = () => {
    if (!titulo.trim()) { toast.error('Preencha o título'); return; }
    const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    addProva({
      slug,
      titulo: titulo.trim(),
      categoriaVeiculo: categoria,
      evento,
      urlMidia: urlMidia.trim() || 'https://cdn.protecao.app/provas/placeholder.jpg',
      legendaWhatsApp: legenda.trim(),
    });
    setTitulo(''); setUrlMidia(''); setLegenda('');
    setModalOpen(false);
  };

  const handleCopyLegenda = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Legenda copiada para o WhatsApp!');
  };

  if (isLoadingProvas) return <div className="p-8 text-center text-muted-foreground">Carregando provas sociais...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar prova social..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 border rounded-lg p-0.5">
            {(['all', 'particular', 'app', 'moto'] as const).map(t => (
              <button key={t} onClick={() => setCatFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${catFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'all' ? 'Todos' : CATEGORIA_VEICULO_CONFIG[t].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 border rounded-lg p-0.5">
            {(['all', 'roubo', 'colisao', 'assistencia'] as const).map(t => (
              <button key={t} onClick={() => setEventoFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${eventoFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'all' ? 'Todos' : EVENTO_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>
        <Button className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar Prova Social
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const catCfg = CATEGORIA_VEICULO_CONFIG[p.categoriaVeiculo];
          const evCfg = EVENTO_CONFIG[p.evento];
          const isVideo = p.urlMidia.endsWith('.mp4') || p.urlMidia.endsWith('.webm');
          return (
            <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-muted/50 flex items-center justify-center border-b relative">
                {isVideo ? <Play className="h-12 w-12 text-muted-foreground/30" /> : <Star className="h-12 w-12 text-muted-foreground/30" />}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="outline" className={`${catCfg.color} text-[10px]`}>{catCfg.emoji} {catCfg.label}</Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2">{p.titulo}</h3>
                  <Badge variant="outline" className={`${evCfg.color} text-[10px] shrink-0`}>{evCfg.emoji} {evCfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{p.legendaWhatsApp}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/60 font-mono">#{p.slug}</span>
                  <span className="text-[10px] text-muted-foreground/60">{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8" onClick={() => handleCopyLegenda(p.legendaWhatsApp)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Copiar para WhatsApp
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Star className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Nenhuma prova social encontrada.</p>
        </div>
      )}

      {/* Modal Adicionar Prova Social */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Prova Social</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Título da Prova</Label>
              <Input placeholder='Ex: "Depoimento Onix Batido - Setor Bueno"' value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria do Veículo</Label>
                <Select value={categoria} onValueChange={v => setCategoria(v as ProvaCategoriaVeiculo)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">🚗 Particular</SelectItem>
                    <SelectItem value="app">📱 App/Aluguel</SelectItem>
                    <SelectItem value="moto">🏍️ Moto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de Evento</Label>
                <Select value={evento} onValueChange={v => setEvento(v as ProvaEvento)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roubo">🚨 Roubo/Furto</SelectItem>
                    <SelectItem value="colisao">💥 Colisão</SelectItem>
                    <SelectItem value="assistencia">🛠️ Assistência 24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">URL da Mídia (imagem ou vídeo)</Label>
              <Input placeholder="https://..." value={urlMidia} onChange={e => setUrlMidia(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Legenda para WhatsApp</Label>
              <Textarea placeholder="Texto que será copiado para enviar ao lead..." value={legenda} onChange={e => setLegenda(e.target.value)} className="mt-1" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export provas for use in LeadDossier
export { initialProvas, CATEGORIA_VEICULO_CONFIG, EVENTO_CONFIG };
