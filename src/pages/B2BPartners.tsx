import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Edit, Trash2, Plus, ExternalLink, Loader2 } from 'lucide-react';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const B2BPartners = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome_empresa: '',
    slug: '',
    mensagem_beneficio: '',
    ativo: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parceiros_ativos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar parceiros: ' + error.message);
    } else {
      setPartners(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (partner: any = null) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        nome_empresa: partner.nome_empresa,
        slug: partner.slug,
        mensagem_beneficio: partner.mensagem_beneficio,
        ativo: partner.ativo
      });
    } else {
      setEditingPartner(null);
      setFormData({
        nome_empresa: '',
        slug: '',
        mensagem_beneficio: '',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nome = e.target.value;
    setFormData(prev => ({
      ...prev,
      nome_empresa: nome,
      slug: prev.slug === slugify(prev.nome_empresa) || prev.slug === '' ? slugify(nome) : prev.slug
    }));
  };

  const handleSave = async () => {
    if (!formData.nome_empresa || !formData.slug || !formData.mensagem_beneficio) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setSaving(true);
    try {
      // Obter tenant_id
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user?.id)
        .single();
      
      const tenant_id = profile?.tenant_id;

      const payload = {
        ...formData,
        tenant_id
      };

      let error;
      if (editingPartner) {
        const { error: updateError } = await supabase
          .from('parceiros_ativos')
          .update(payload)
          .eq('id', editingPartner.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('parceiros_ativos')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editingPartner ? 'Parceiro atualizado!' : 'Parceiro criado!');
      setIsModalOpen(false);
      fetchPartners();
    } catch (error: any) {
      toast.error('Erro ao salvar parceiro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este parceiro?')) {
      const { error } = await supabase
        .from('parceiros_ativos')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Erro ao excluir: ' + error.message);
      } else {
        toast.success('Parceiro excluído!');
        fetchPartners();
      }
    }
  };

  const toggleAtivo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('parceiros_ativos')
      .update({ ativo: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message);
    } else {
      setPartners(partners.map(p => p.id === id ? { ...p, ativo: !currentStatus } : p));
      toast.success('Status atualizado!');
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-[#111827]">Parceiros B2B</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Gerencie as Landing Pages dinâmicas dos seus parceiros credenciados.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#EB6607] hover:bg-[#d95a06] text-white gap-2 font-bold px-6">
          <Plus className="h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-[#EB6607] animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Buscando parceiros...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold underline decoration-[#EB6607] decoration-2 underline-offset-4 text-[#111827]">Empresa</TableHead>
                <TableHead className="font-bold underline decoration-[#EB6607] decoration-2 underline-offset-4 text-[#111827]">Benefício</TableHead>
                <TableHead className="font-bold underline decoration-[#EB6607] decoration-2 underline-offset-4 text-[#111827]">Página</TableHead>
                <TableHead className="font-bold underline decoration-[#EB6607] decoration-2 underline-offset-4 text-[#111827] text-center w-[120px]">Status</TableHead>
                <TableHead className="font-bold underline decoration-[#EB6607] decoration-2 underline-offset-4 text-[#111827] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold text-[#111827]">{partner.nome_empresa}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">
                      {partner.mensagem_beneficio}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">/p/{partner.slug}</code>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-[#EB6607] hover:text-[#d95a06] hover:bg-orange-50" onClick={() => copyToClipboard(partner.slug)}>
                         <Copy className="h-3.5 w-3.5" />
                       </Button>
                       <a href={`/p/${partner.slug}`} target="_blank" rel="noreferrer">
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-slate-100">
                           <ExternalLink className="h-3.5 w-3.5" />
                         </Button>
                       </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch 
                      checked={partner.ativo} 
                      onCheckedChange={() => toggleAtivo(partner.id, partner.ativo)}
                      className="data-[state=checked]:bg-[#EB6607]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(partner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(partner.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#111827]">
              {editingPartner ? 'Editar Parceiro' : 'Novo Parceiro B2B'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-bold text-[#111827]">Nome da Empresa</label>
              <Input 
                value={formData.nome_empresa}
                onChange={handleNomeChange}
                placeholder="Ex: Mecânica do João"
                className="font-medium focus:ring-2 focus:ring-[#EB6607]/20 border-slate-200"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-bold text-[#111827]">Slug da URL</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">p/</span>
                <Input 
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: slugify(e.target.value)})}
                  placeholder="slug-do-parceiro"
                  className="pl-8 font-mono text-sm focus:ring-2 focus:ring-[#EB6607]/20 border-slate-200"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">O link será: topbrasil.online/p/{formData.slug || '...'}</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-bold text-[#111827]">Mensagem de Benefício</label>
              <Textarea 
                value={formData.mensagem_beneficio}
                onChange={(e) => setFormData({...formData, mensagem_beneficio: e.target.value})}
                placeholder="Ex: Adesão Grátis + 10% de desconto"
                className="font-medium min-h-[100px] focus:ring-2 focus:ring-[#EB6607]/20 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch 
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({...formData, ativo: v})}
                className="data-[state=checked]:bg-[#EB6607]"
              />
              <span className="text-sm font-bold text-[#111827]">Parceiro Ativo</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#EB6607] hover:bg-[#d95a06] text-white font-black px-8">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPartner ? 'Atualizar' : 'Criar Parceiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default B2BPartners;
