import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { ProvaCategoriaVeiculo, ProvaEvento, ProvaSocial } from '@/components/MarketingHub';

export type MaterialType = 'banner' | 'story' | 'pdf';

export interface MarketingMaterial {
    id: string;
    titulo: string;
    tipo: MaterialType;
    descricao: string;
    link: string;
}

export function useMarketingLocal() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
        queryKey: ['marketing-materials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('marketing_materials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(m => ({
                id: m.id,
                titulo: m.titulo,
                tipo: m.tipo as MaterialType,
                descricao: m.descricao || '',
                link: m.link
            })) as MarketingMaterial[];
        }
    });

    const { data: provas = [], isLoading: isLoadingProvas } = useQuery({
        queryKey: ['social-proofs', profile?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('social_proofs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(p => ({
                id: p.id,
                slug: p.categoria || 'geral', // map slug to categorio for now
                titulo: p.legenda || 'Prova Social', // We didn't have titulo column explicitly in Phase 1 SQL, we used legenda
                categoriaVeiculo: (p.categoria as ProvaCategoriaVeiculo) || 'particular',
                evento: (p.tipo_evento as ProvaEvento) || 'colisao',
                urlMidia: p.midia_url,
                legendaWhatsApp: p.legenda || '',
                criadoEm: p.created_at
            })) as ProvaSocial[];
        },
        enabled: !!profile?.tenant_id,
    });

    const addProvaMutation = useMutation({
        mutationFn: async (novaProva: Omit<ProvaSocial, 'id' | 'criadoEm'>) => {
            if (!profile?.tenant_id) throw new Error('Tenant não encontrado');

            const { data, error } = await supabase.from('social_proofs').insert([{
                tenant_id: profile.tenant_id,
                categoria: novaProva.categoriaVeiculo,
                tipo_evento: novaProva.evento,
                midia_url: novaProva.urlMidia,
                legenda: novaProva.legendaWhatsApp,
                // Optional: If we had a title column, we'd add it here.
                // For now, legenda takes both roles mostly, but let's just save legendaWhatsApp
            }]).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Prova social adicionada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['social-proofs'] });
        },
        onError: (err: any) => {
            toast.error('Erro ao adicionar prova social: ' + err.message);
        }
    });

    return {
        materials,
        isLoadingMaterials,
        provas,
        isLoadingProvas,
        addProva: (p: Omit<ProvaSocial, 'id' | 'criadoEm'>) => addProvaMutation.mutate(p),
    };
}
