import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, QrCode, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useLeadsLocal } from '@/hooks/useLeadsLocal';
import type { Lead } from '@/types/lead';

// Component logic maps real leads to view

const STATUS_CONFIG = {
  em_dia: { label: 'Em Dia', variant: 'default' as const, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  atrasado: { label: 'Atrasado', variant: 'destructive' as const, className: '' },
  a_vencer: { label: 'A Vencer', variant: 'outline' as const, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

export function GestaoCarteira() {
  const { allLeads, isLoading } = useLeadsLocal();

  // Filter only active clients
  const clientesAtivos = allLeads.filter(l => l.status === 'vistoria_contrato');

  const totalAtrasados = clientesAtivos.filter(c => c.statusPagamento === 'atrasado').length;
  const inadimplencia = clientesAtivos.length > 0 ? ((totalAtrasados / clientesAtivos.length) * 100).toFixed(1) : '0.0';
  const mrr = clientesAtivos.filter(c => c.statusPagamento !== 'atrasado' && c.statusPagamento !== 'inadimplente').reduce((sum, c) => sum + (c.valorMensalidade ?? 0), 0);

  const handleCobrar = (cliente: Lead) => {
    if (!cliente.telefone) return toast.error('Lead sem telefone');
    const phone = cliente.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${cliente.nome}, identificamos uma pendência na sua mensalidade de proteção veicular. Podemos ajudar a regularizar?`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    toast.success(`Cobrança enviada para ${cliente.nome}`);
  };

  const handlePix = (cliente: Lead) => {
    toast.success(`2ª via do Pix gerada para ${cliente.nome} — ${fmt(cliente.valorMensalidade ?? 0)}`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando carteira de clientes...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inadimplência do Mês</p>
              <p className="text-2xl font-bold text-destructive">{inadimplencia}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR Ativo</p>
              <p className="text-2xl font-bold text-emerald-500">{fmt(mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold text-foreground">{clientesAtivos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingDown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes Atrasados</p>
              <p className="text-2xl font-bold text-foreground">{totalAtrasados}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead className="hidden sm:table-cell">Placa</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Mensalidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesAtivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cliente ativo na carteira.</TableCell>
                </TableRow>
              ) : (
                clientesAtivos.map((c) => {
                  const estatoKey = (c.statusPagamento as keyof typeof STATUS_CONFIG) || 'em_dia';
                  const st = STATUS_CONFIG[estatoKey] || STATUS_CONFIG.em_dia;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.marca} {c.modelo}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs uppercase">{c.placa || 'Sem placa'}</TableCell>
                      <TableCell>Dia {c.diaVencimento || 'N/A'}</TableCell>
                      <TableCell className="font-semibold">{fmt(c.valorMensalidade ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className={st.className}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {estatoKey === 'atrasado' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600" onClick={() => handleCobrar(c)} title="Cobrar via WhatsApp">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handlePix(c)} title="Gerar 2ª Via Pix">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
