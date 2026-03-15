import React, { useState, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, Copy, Search, Image, FileText, Smartphone, 
  Plus, Play, Star, MessageSquare, Folder, ChevronRight, 
  Upload, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { useMarketingLocal, type MaterialType, type MarketingFolder, type MarketingMaterial } from '@/hooks/useMarketingLocal';
import { 
  type ProvaSocial, 
  type ProvaCategoriaVeiculo, 
  type ProvaEvento,
  CATEGORIA_VEICULO_CONFIG,
  EVENTO_CONFIG,
  initialProvas 
} from '@/types/marketing';

const TIPO_CONFIG: Record<MaterialType, { label: string; icon: any; color: string }> = {
  banner: { label: 'Banner', icon: Image, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  story: { label: 'Story', icon: Smartphone, color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  pdf: { label: 'PDF', icon: FileText, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  drive: { label: 'Drive', icon: ExternalLink, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};


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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<MarketingFolder[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<MaterialType | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'material' | 'folder' | 'upload'>('material');

  const { 
    materials, folders, isLoadingMaterials, isLoadingFolders,
    addFolder, addMaterial, uploadFile 
  } = useMarketingLocal(currentFolderId);

  // Form states
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState<MaterialType>('banner');
  const [file, setFile] = useState<File | null>(null);

  const filteredMaterials = materials.filter(m => {
    if (tipoFilter !== 'all' && m.tipo !== tipoFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.titulo.toLowerCase().includes(q) && !m.descricao.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredFolders = folders.filter(f => {
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleNavigate = (folder: MarketingFolder | null) => {
    if (!folder) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      setCurrentFolderId(folder.id);
      // Update breadcrumbs
      const idx = folderPath.findIndex(f => f.id === folder.id);
      if (idx !== -1) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        setFolderPath([...folderPath, folder]);
      }
    }
  };

  const handleSave = async () => {
    if (modalType === 'folder') {
      if (!title.trim()) return toast.error('Nome da pasta é obrigatório');
      addFolder(title);
    } else if (modalType === 'upload') {
      if (!file || !title.trim()) return toast.error('Preencha título e selecione arquivo');
      await uploadFile({ file, titulo: title, descricao: desc });
    } else {
      if (!title.trim() || !link.trim()) return toast.error('Preencha título e link');
      addMaterial({ titulo: title, descricao: desc, link, tipo: type, folder_id: currentFolderId });
    }
    
    // Reset form
    setTitle(''); setDesc(''); setLink(''); setFile(null);
    setModalOpen(false);
  };

  if (isLoadingMaterials || isLoadingFolders) return <div className="p-8 text-center text-muted-foreground">Carregando materiais...</div>;

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 border rounded-lg p-0.5">
            {(['all', 'banner', 'story', 'pdf', 'drive'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors ${tipoFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t === 'all' ? 'Todos' : TIPO_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setModalType('folder'); setModalOpen(true); }}>
                <Folder className="h-4 w-4" /> Nova Pasta
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setModalType('material'); setModalOpen(true); }}>
                <Plus className="h-4 w-4" /> Novo Material
            </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
        <button onClick={() => handleNavigate(null)} className="hover:text-primary transition-colors">Materiais</button>
        {folderPath.map((f, i) => (
          <Fragment key={f.id}>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => handleNavigate(f)} className={`hover:text-primary transition-colors ${i === folderPath.length - 1 ? 'font-semibold text-foreground' : ''}`}>
                {f.nome}
            </button>
          </Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Folders */}
        {filteredFolders.map(f => (
          <Card key={f.id} className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => handleNavigate(f)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Folder className="h-5 w-5 fill-current" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate uppercase">{f.nome}</p>
                <p className="text-[10px] text-muted-foreground">Pasta</p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Materials */}
        {filteredMaterials.map(m => {
          const cfg = TIPO_CONFIG[m.tipo];
          const Icon = cfg.icon;
          return (
            <Card key={m.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="h-32 bg-muted/30 flex items-center justify-center border-b relative">
                <Icon className="h-10 w-10 text-muted-foreground/20 group-hover:scale-110 transition-transform" />
                <Badge variant="outline" className={`${cfg.color} absolute top-2 right-2 text-[10px] uppercase font-bold`}>{cfg.label}</Badge>
              </div>
              <CardContent className="p-3 space-y-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1 uppercase">{m.titulo}</h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{m.descricao}</p>
                </div>
                <div className="flex gap-1.5">
                  {m.tipo === 'drive' ? (
                     <Button variant="outline" size="sm" className="w-full gap-1.5 text-[10px] h-7 font-bold uppercase" onClick={() => window.open(m.link, '_blank')}>
                        <ExternalLink className="h-3 w-3" /> Abrir Drive
                    </Button>
                  ) : (
                    <>
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[10px] h-7 font-bold uppercase" onClick={() => window.open(m.link, '_blank')}>
                            <Download className="h-3 w-3" /> Baixar
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[10px] h-7 font-bold uppercase" onClick={() => { navigator.clipboard.writeText(m.link); toast.success('Link copiado!'); }}>
                            <Copy className="h-3 w-3" /> Link
                        </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(filteredMaterials.length === 0 && filteredFolders.length === 0) && (
            <div className="col-span-full py-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                    <Search className="h-8 w-8" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum item encontrado nesta pasta.</p>
                <Button variant="ghost" className="mt-2 text-xs" onClick={() => setModalOpen(true)}>
                    Começar a organizar
                </Button>
            </div>
        )}
      </div>

      {/* Modal CRUD */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">
                {modalType === 'folder' ? 'Nova Pasta' : modalType === 'upload' ? 'Upload de Arquivo' : 'Novo Material'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {modalType === 'folder' ? (
              <div>
                <Label className="text-xs uppercase font-bold">Nome da Pasta</Label>
                <Input placeholder="Ex: Banners Janeiro" value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
              </div>
            ) : modalType === 'upload' ? (
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs uppercase font-bold">Título</Label>
                        <Input placeholder="Ex: Flyer Promocional" value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold">Arquivo</Label>
                        <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                             <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                             <p className="text-xs text-muted-foreground">{file ? file.name : 'Clique ou arraste para enviar'}</p>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold">Descrição</Label>
                        <Textarea placeholder="Opcional..." value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" rows={2} />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                         <div className="col-span-2">
                            <Label className="text-xs uppercase font-bold">Título</Label>
                            <Input placeholder="Ex: Pasta Google Drive" value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs uppercase font-bold">Tipo</Label>
                            <Select value={type} onValueChange={v => setType(v as MaterialType)}>
                                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="drive">Drive</SelectItem>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="story">Story</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button variant="secondary" className="w-full h-9 gap-1 text-[10px] font-bold uppercase" onClick={() => setModalType('upload')}>
                                <Upload className="h-3 w-3" /> Fazer Upload
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold">Link (URL)</Label>
                        <Input placeholder="https://drive.google.com/..." value={link} onChange={e => setLink(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs uppercase font-bold">Descrição</Label>
                        <Textarea placeholder="Opcional..." value={desc} onChange={e => setDesc(e.target.value)} className="mt-1" rows={2} />
                    </div>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-[10px] font-bold uppercase">Cancelar</Button>
            <Button size="sm" onClick={handleSave} className="text-[10px] font-bold uppercase">
                {modalType === 'upload' ? 'Iniciar Upload' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// MarketingHub.tsx is now fully corrected.
