import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import type { CommissionSettings } from '@/types/commissionSettings';
import { DEFAULT_COMMISSION_SETTINGS } from '@/types/commissionSettings';
import { toast } from 'sonner';

export function useCommissionSettings() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: settings = DEFAULT_COMMISSION_SETTINGS, isLoading } = useQuery({
        queryKey: ['commissionSettings', profile?.tenant_id],
        queryFn: async () => {
            if (!profile?.tenant_id) return DEFAULT_COMMISSION_SETTINGS;

            const { data, error } = await supabase
                .from('tenant_settings')
                .select('regras_comissao')
                .eq('tenant_id', profile.tenant_id)
                .maybeSingle();

            if (error) {
                console.error('Erro ao carregar configurações de comissão:', error);
                toast.error('Erro ao carregar configurações de comissão');
                throw error;
            }

            // Se não existir, use o padrão
            if (!data?.regras_comissao || Object.keys(data.regras_comissao).length === 0) {
                return DEFAULT_COMMISSION_SETTINGS;
            }

            // Merge defaults in case new properties were added to the interface
            return { ...DEFAULT_COMMISSION_SETTINGS, ...(data.regras_comissao as any) } as CommissionSettings;
        },
        enabled: !!profile?.tenant_id,
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: CommissionSettings) => {
            if (!profile?.tenant_id) throw new Error('Tenant não encontrado');

            const { error } = await supabase
                .from('tenant_settings')
                .upsert(
                    {
                        tenant_id: profile.tenant_id,
                        regras_comissao: newSettings as any
                    },
                    { onConflict: 'tenant_id' }
                );

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Configurações de comissão atualizadas!');
            queryClient.invalidateQueries({ queryKey: ['commissionSettings'] });
        },
        onError: (err) => toast.error('Erro ao salvar as configurações: ' + err.message)
    });

    return {
        settings,
        isLoading,
        updateSettings: (newSettings: CommissionSettings) => updateSettingsMutation.mutate(newSettings),
    };
}
