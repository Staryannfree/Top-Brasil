import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import type { Lead, LeadStatus, MotivoPerda } from '@/types/lead';
import { toast } from 'sonner';

const META_MENSAL = 5000;
const ADESAO = 300;

export function useLeadsLocal() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'particular' | 'app'>('all');
  const [atendenteFilter, setAtendenteFilter] = useState<string>('all');
  const [renewalFilter, setRenewalFilter] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await (supabase as any)
        .from('leads')
        .select(`
          *,
          notas:notes(id, conteudo, created_at, profiles(nome_completo))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar leads: ' + error.message);
        throw error;
      }

      return data.map((lead: any) => ({
        ...lead,
        temLembrete: lead.tem_lembrete,
        valorAdesao: lead.valor_adesao,
        valorMensalidade: lead.valor_mensalidade,
        dataFechamento: lead.data_fechamento,
        consultoriaVip: lead.consultoria_vip,
        motivoPerda: lead.motivo_perda,
        dadosVerificados: lead.dados_verificados,
        bairro: lead.bairro,
        cidade: lead.cidade,
        estado: lead.estado,
        cor: lead.cor,
        chassi_parcial: lead.chassi_parcial,
        diaVencimento: lead.dia_vencimento,
        statusPagamento: lead.status_pagamento,
        notas: (lead.notas || []).map((n: any) => ({
          id: n.id,
          text: n.conteudo,
          author: Array.isArray(n.profiles)
            ? n.profiles[0]?.nome_completo
            : (n.profiles?.nome_completo || 'Desconhecido'),
          createdAt: n.created_at,
        })),
        atendente: lead.vendedor_id,
      })) as Lead[];
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 10000, // Sync a cada 10 segundos (segurança)
  });

  // Inscrever para atualizações em Tempo Real (Supabase Realtime)
  useEffect(() => {
    if (!profile?.tenant_id) return;

    // Canal para LEADS
    const leadsChannel = (supabase as any)
      .channel('leads-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        () => {
          console.log('Realtime Lead update - invalidating leads query');
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    // Canal para NOTAS (invalidar leads quando notas mudam)
    const notesChannel = (supabase as any)
      .channel('notes-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes'
        },
        () => {
          console.log('Realtime Note update - invalidating leads query');
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(leadsChannel);
      (supabase as any).removeChannel(notesChannel);
    };
  }, [profile?.tenant_id, queryClient]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (search) {
        const q = search.toLowerCase();
        if (!lead.nome.toLowerCase().includes(q) && !lead.placa?.toLowerCase().includes(q) && !lead.telefone?.includes(q)) return false;
      }
      if (categoryFilter === 'particular') {
        const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
        if (isApp) return false;
      }
      if (categoryFilter === 'app') {
        const isApp = lead.categoria?.toLowerCase().includes('aluguel') || lead.categoria?.toLowerCase().includes('app');
        if (!isApp) return false;
      }
      if (atendenteFilter !== 'all' && lead.atendente !== atendenteFilter) return false;
      if (renewalFilter && lead.data_entrada) {
        const months = (Date.now() - new Date(lead.data_entrada).getTime()) / (30 * 24 * 3600000);
        if (months < 11) return false;
      }
      return true;
    });
  }, [leads, search, categoryFilter, atendenteFilter, renewalFilter]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, motivoPerda }: { id: string; status: LeadStatus; motivoPerda?: MotivoPerda }) => {
      const updateData: any = { status };
      if (status === 'perdido' && motivoPerda) {
        updateData.motivo_perda = motivoPerda;
      }
      const { error } = await supabase.from('leads').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao atualizar status: ' + err.message)
  });

  const updateLeadStatus = useCallback((id: string, status: LeadStatus, motivoPerda?: MotivoPerda) => {
    updateStatusMutation.mutate({ id, status, motivoPerda });
  }, [updateStatusMutation]);

  const addLeadMutation = useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'created_at' | 'status' | 'data_entrada' | 'notas' | 'motivoPerda' | 'dadosVerificados'>) => {
      const leadData = {
        tenant_id: profile?.tenant_id,
        nome: lead.nome,
        telefone: lead.telefone,
        cpf: lead.cpf,
        placa: lead.placa,
        marca: lead.marca,
        modelo: lead.modelo,
        ano_fabricacao: lead.ano_fabricacao,
        ano_modelo: lead.ano_modelo,
        valor_fipe: lead.valor_fipe,
        codigo_fipe: lead.codigo_fipe,
        categoria: lead.categoria,
        cilindradas: lead.cilindradas,
        cor: lead.cor,
        chassi_parcial: lead.chassi_parcial,
        cidade: lead.cidade,
        estado: lead.estado,
        origem: lead.origem,
        tem_lembrete: lead.temLembrete,
        valor_adesao: lead.valorAdesao,
        valor_mensalidade: lead.valorMensalidade,
        data_fechamento: lead.dataFechamento,
        consultoria_vip: lead.consultoriaVip,
        dados_verificados: !!(lead.marca && lead.modelo),
        status: 'novo_lead',
      };

      const { error } = await supabase.from('leads').insert([leadData]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lead adicionado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao adicionar lead: ' + err.message)
  });

  const addLead = useCallback((lead: Omit<Lead, 'id' | 'created_at' | 'status' | 'data_entrada' | 'notas' | 'motivoPerda' | 'dadosVerificados'>) => {
    addLeadMutation.mutate(lead);
  }, [addLeadMutation]);

  const updateLeadMutation = useMutation({
    mutationFn: async (updated: Lead) => {
      const leadData = {
        nome: updated.nome,
        telefone: updated.telefone,
        cpf: updated.cpf,
        placa: updated.placa,
        marca: updated.marca,
        modelo: updated.modelo,
        ano_fabricacao: updated.ano_fabricacao,
        ano_modelo: updated.ano_modelo,
        valor_fipe: updated.valor_fipe,
        codigo_fipe: updated.codigo_fipe,
        categoria: updated.categoria,
        cilindradas: updated.cilindradas,
        cor: updated.cor,
        chassi_parcial: updated.chassi_parcial,
        cidade: updated.cidade,
        estado: updated.estado,
        origem: updated.origem,
        tem_lembrete: updated.temLembrete,
        valor_adesao: updated.valorAdesao,
        valor_mensalidade: updated.valorMensalidade,
        data_fechamento: updated.dataFechamento,
        consultoria_vip: updated.consultoriaVip,
        motivo_perda: updated.motivoPerda,
        dados_verificados: updated.dadosVerificados,
        status: updated.status,
      };

      const { error } = await supabase.from('leads').update(leadData).eq('id', updated.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lead atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao atualizar lead: ' + err.message)
  });

  const updateLead = useCallback((updated: Lead) => {
    updateLeadMutation.mutate(updated);
  }, [updateLeadMutation]);

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao excluir lead: ' + err.message)
  });

  const deleteLead = useCallback((id: string) => {
    deleteLeadMutation.mutate(id);
  }, [deleteLeadMutation]);

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: LeadStatus }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status de múltiplos leads atualizados');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao atualizar leads em massa: ' + err.message)
  });

  const bulkUpdateStatus = useCallback((ids: string[], status: LeadStatus) => {
    bulkUpdateStatusMutation.mutate({ ids, status });
  }, [bulkUpdateStatusMutation]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leads excluídos com sucesso');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao excluir leads em massa: ' + err.message)
  });

  const bulkDeleteLeads = useCallback((ids: string[]) => {
    bulkDeleteMutation.mutate(ids);
  }, [bulkDeleteMutation]);

  const bulkActivateLeads = useCallback(async (ids: string[]) => {
    let successCount = 0;
    let failCount = 0;

    const promise = (async () => {
      for (const id of ids) {
        try {
          const { data, error } = await supabase.functions.invoke('powercrm-integration', {
            body: { leadId: id }
          });

          if (error || (data && data.success === false)) {
            failCount++;
          } else {
            successCount++;
            // Update status to cotacao_enviada after activation
            await supabase.from('leads').update({ status: 'cotacao_enviada' }).eq('id', id);
          }
        } catch (err) {
          failCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] });

      if (failCount > 0) {
        throw new Error(`${successCount} ativados, ${failCount} falharam.`);
      }
      return `${successCount} leads ativados no PowerCRM com sucesso!`;
    })();

    toast.promise(promise, {
      loading: 'Ativando leads no PowerCRM...',
      success: (data: any) => data,
      error: (err: any) => `Aviso: ${err.message}`
    });
  }, [queryClient]);

  const clearLostMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('status', 'perdido')
        .eq('tenant_id', profile?.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao limpar leads perdidos: ' + err.message)
  });

  const clearLost = useCallback(() => {
    if (profile?.tenant_id) clearLostMutation.mutate();
  }, [clearLostMutation, profile?.tenant_id]);

  const addNoteMutation = useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { error } = await supabase.from('notes').insert([{
        lead_id: leadId,
        conteudo: content,
        autor_id: profile?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota adicionada!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error('Erro ao adicionar nota: ' + err.message)
  });

  const addNote = useCallback((leadId: string, content: string) => {
    addNoteMutation.mutate({ leadId, content });
  }, [addNoteMutation]);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const totalToday = leads.filter((l) => l.created_at && new Date(l.created_at).toDateString() === today).length;
    const emNegociacao = leads.filter((l) => l.status === 'em_negociacao');
    const valorPotencial = emNegociacao.reduce((sum, l) => sum + (l.valor_fipe ?? 0), 0);
    const vistoriaLeads = leads.filter((l) => l.status === 'vistoria_contrato');
    const contratosFechados = vistoriaLeads.length;
    const totalLeads = leads.length;
    const comissoesEstimadas = contratosFechados * ADESAO * 0.10;
    const metaProgresso = (comissoesEstimadas / META_MENSAL) * 100;
    return { totalToday, valorPotencial, contratosFechados, totalLeads, comissoesEstimadas, metaProgresso };
  }, [leads]);

  return {
    leads: filteredLeads, allLeads: leads,
    search, setSearch,
    categoryFilter, setCategoryFilter,
    atendenteFilter, setAtendenteFilter,
    renewalFilter, setRenewalFilter,
    updateLeadStatus, updateLead, addLead, deleteLead, clearLost, addNote, metrics,
    bulkUpdateStatus, bulkDeleteLeads, bulkActivateLeads,
    isLoading
  };
}
