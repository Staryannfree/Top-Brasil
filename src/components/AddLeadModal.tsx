import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Lead, LeadOrigem } from '@/types/lead';
import { ATENDENTES } from '@/types/lead';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Omit<Lead, 'id' | 'created_at' | 'status' | 'data_entrada' | 'notas' | 'motivoPerda' | 'dadosVerificados'>) => void;
  initialData?: Partial<Lead> | null;
}

export function AddLeadModal({ open, onOpenChange, onSave, initialData }: AddLeadModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anoModelo, setAnoModelo] = useState('');
  const [valorFipe, setValorFipe] = useState('');
  const [categoria, setCategoria] = useState('Particular');
  const [atendente, setAtendente] = useState(ATENDENTES[0]);
  const [origem, setOrigem] = useState<LeadOrigem>('indicacao');
  const [consultoriaVip, setConsultoriaVip] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setPlaca(initialData.placa || '');
      setMarca(initialData.marca || initialData.veiculo_marca || '');
      setModelo(initialData.modelo || initialData.veiculo_modelo || '');
      setAnoModelo(initialData.ano_modelo || initialData.veiculo_ano || '');
      setValorFipe(initialData.valor_fipe ? String(initialData.valor_fipe) : '');
      setCategoria(initialData.categoria || 'Particular');
    } else if (open && !initialData) {
      reset();
    }
  }, [open, initialData]);

  const reset = () => {
    setNome(''); setTelefone(''); setPlaca(''); setMarca('');
    setModelo(''); setAnoModelo(''); setValorFipe(''); setCategoria('Particular');
    setAtendente(ATENDENTES[0]); setOrigem('indicacao'); setConsultoriaVip(false);
  };

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({
      nome: nome.trim(), telefone: telefone || null, cpf: null,
      placa: placa.toUpperCase() || null, marca: marca || null,
      modelo: modelo || null, ano_fabricacao: null, ano_modelo: anoModelo || null,
      valor_fipe: valorFipe ? Number(valorFipe) : null, codigo_fipe: null,
      categoria: categoria || null, cilindradas: null,
      atendente, origem, temLembrete: false,
      valorAdesao: null, valorMensalidade: null, dataFechamento: null, consultoriaVip,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Lead</DialogTitle>
          <DialogDescription>Preencha os dados do lead e veículo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>WhatsApp</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999887766" /></div>
            <div><Label>Placa</Label><Input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC1D23" className="uppercase" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Marca</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Toyota" /></div>
            <div><Label>Modelo</Label><Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Corolla" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ano Modelo</Label><Input value={anoModelo} onChange={(e) => setAnoModelo(e.target.value)} placeholder="2022" /></div>
            <div><Label>Valor FIPE</Label><Input type="number" value={valorFipe} onChange={(e) => setValorFipe(e.target.value)} placeholder="120000" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="App/Aluguel">App/Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Atendente</Label>
              <Select value={atendente} onValueChange={setAtendente}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ATENDENTES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as LeadOrigem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="smclick">🤖 SMClick</SelectItem>
                <SelectItem value="meta_ads">📱 Meta Ads</SelectItem>
                <SelectItem value="indicacao">🗣️ Indicação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Consultoria VIP</Label>
              <p className="text-xs text-muted-foreground">+R$ 20/mês</p>
            </div>
            <Switch checked={consultoriaVip} onCheckedChange={setConsultoriaVip} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!nome.trim()}>Salvar Lead</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}