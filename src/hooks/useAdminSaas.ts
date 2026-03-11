import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantAdminData {
    id: string;
    nome: string; // Used `nome` instead of `nome_empresa` to match AdminSaas UI
    plano: string; // Used `plano` to match
    statusPlano: 'ativo' | 'inadimplente' | 'bloqueado';
    logoUrl?: string;
    corPrimaria?: string;
    totalVendedores: number;
    leadsAtivos: number;
    mrrTenant: number;
    masterNome: string;
    masterEmail: string;
    masterTelefone: string;
    limits: {
        maxVendedores: number;
        maxLeads: number;
        acessoApi: boolean;
        whiteLabel: boolean;
    };
    whiteLabel: { logoUrl: string; corPrimaria: string };
}

export function useAdminSaas() {
    const queryClient = useQueryClient();

    const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
        queryKey: ['admin-tenants'],
        queryFn: async () => {
            // Fetch all tenants
            const { data: tenantsData, error: errTenants } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (errTenants) throw errTenants;

            // Fetch all profiles
            const { data: profilesData, error: errProfiles } = await supabase
                .from('profiles')
                .select('id, tenant_id, nome_completo, role');

            if (errProfiles) throw errProfiles;

            const mapped = tenantsData.map(t => {
                const tProfiles = profilesData?.filter(p => p.tenant_id === t.id) || [];
                const master = tProfiles.sort((a, b) => a.role === 'admin' ? -1 : 1)[0];

                return {
                    id: t.id,
                    nome: t.nome_empresa,
                    plano: t.plano_ativo || 'starter',
                    statusPlano: 'ativo',
                    totalVendedores: tProfiles.length,
                    leadsAtivos: 0,
                    mrrTenant: 97,
                    masterNome: master?.nome_completo || 'Sem Admin',
                    masterEmail: `contato@${t.nome_empresa.replace(/\s/g, '').toLowerCase()}.com`,
                    masterTelefone: 'Não informado',
                    limits: {
                        maxVendedores: t.plano_ativo === 'enterprise' ? 50 : 10,
                        maxLeads: t.plano_ativo === 'enterprise' ? 999 : 200,
                        acessoApi: t.plano_ativo === 'enterprise',
                        whiteLabel: t.plano_ativo === 'enterprise'
                    },
                    whiteLabel: { logoUrl: t.logo_url || '', corPrimaria: t.cor_primaria || '#3B82F6' }
                } as TenantAdminData;
            });

            return mapped;
        }
    });

    const addTenantMutation = useMutation({
        mutationFn: async ({ nome_empresa, plano }: { nome_empresa: string; plano: string }) => {
            const { data, error } = await supabase.from('tenants').insert([
                { nome_empresa, plano_ativo: plano }
            ]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Corretora cadastrada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        },
        onError: (err) => toast.error('Erro ao cadastrar: ' + err.message)
    });

    const updateTenantStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            toast.info(`Atualizar status DB pendente (status: ${status})`);
            return { id, status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        }
    });

    return {
        tenants,
        isLoadingTenants,
        addTenant: (params: { nome_empresa: string; plano: string }) => addTenantMutation.mutate(params),
        updateTenantStatus: (id: string, status: string) => updateTenantStatusMutation.mutate({ id, status }),
    };
}
