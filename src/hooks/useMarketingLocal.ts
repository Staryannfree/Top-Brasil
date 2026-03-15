import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { type ProvaCategoriaVeiculo, type ProvaEvento, type ProvaSocial } from '@/types/marketing';

export type MaterialType = 'banner' | 'story' | 'pdf' | 'drive';

export interface MarketingFolder {
    id: string;
    nome: string;
    parent_id: string | null;
    created_at: string;
}

export interface MarketingMaterial {
    id: string;
    titulo: string;
    tipo: MaterialType;
    descricao: string;
    link: string;
    folder_id: string | null;
}

export function useMarketingLocal(folderId: string | null = null) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: folders = [], isLoading: isLoadingFolders } = useQuery({
        queryKey: ['marketing-folders', profile?.tenant_id, folderId],
        queryFn: async () => {
            if (!profile?.tenant_id) return [];
            let query = supabase
                .from('marketing_folders')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('nome', { ascending: true });

            if (folderId) {
                query = query.eq('parent_id', folderId);
            } else {
                query = query.is('parent_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as MarketingFolder[];
        },
        enabled: !!profile?.tenant_id,
    });

    const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
        queryKey: ['marketing-materials', profile?.tenant_id, folderId],
        queryFn: async () => {
            if (!profile?.tenant_id) return [];
            let query = supabase
                .from('marketing_materials')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('created_at', { ascending: false });

            if (folderId) {
                query = query.eq('folder_id', folderId);
            } else {
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data.map(m => ({
                id: m.id,
                titulo: m.titulo,
                tipo: m.tipo as MaterialType,
                descricao: m.descricao || '',
                link: m.link,
                folder_id: m.folder_id
            })) as MarketingMaterial[];
        },
        enabled: !!profile?.tenant_id,
    });

    // ... (rest of the hook for social proofs, mutations for folders and materials)
    const addFolderMutation = useMutation({
        mutationFn: async (nome: string) => {
            if (!profile?.tenant_id) throw new Error('Tenant não encontrado');
            const { data, error } = await supabase.from('marketing_folders').insert([{
                tenant_id: profile.tenant_id,
                nome,
                parent_id: folderId
            }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Pasta criada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['marketing-folders'] });
        }
    });

    const addMaterialMutation = useMutation({
        mutationFn: async (novo: Omit<MarketingMaterial, 'id'>) => {
            if (!profile?.tenant_id) throw new Error('Tenant não encontrado');
            const { data, error } = await supabase.from('marketing_materials').insert([{
                tenant_id: profile.tenant_id,
                titulo: novo.titulo,
                tipo: novo.tipo,
                descricao: novo.descricao,
                link: novo.link,
                folder_id: folderId
            }]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Material adicionado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['marketing-materials'] });
        }
    });

    const uploadFileMutation = useMutation({
        mutationFn: async ({ file, titulo, descricao }: { file: File, titulo: string, descricao: string }) => {
            if (!profile?.tenant_id) throw new Error('Tenant não encontrado');
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.tenant_id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('marketing-materials')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('marketing-materials')
                .getPublicUrl(fileName);

            const tipo: MaterialType = file.type.includes('pdf') ? 'pdf' : 'banner';
            
            return addMaterialMutation.mutateAsync({
                titulo,
                descricao,
                tipo,
                link: publicUrl,
                folder_id: folderId
            });
        }
    });

    const { data: provas = [], isLoading: isLoadingProvas } = useQuery({
        queryKey: ['social-proofs', profile?.tenant_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('social_proofs')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(p => ({
                id: p.id,
                slug: p.categoria || 'geral',
                titulo: p.legenda || 'Prova Social',
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
        folders,
        isLoadingFolders,
        materials,
        isLoadingMaterials,
        provas,
        isLoadingProvas,
        addFolder: (nome: string) => addFolderMutation.mutate(nome),
        addMaterial: (m: Omit<MarketingMaterial, 'id'>) => addMaterialMutation.mutate(m),
        uploadFile: (args: { file: File, titulo: string, descricao: string }) => uploadFileMutation.mutate(args),
        addProva: (p: Omit<ProvaSocial, 'id' | 'criadoEm'>) => addProvaMutation.mutate(p),
    };
}

