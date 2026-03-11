import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

export type ContentType = 'video' | 'pdf';
export type Category = 'onboarding' | 'vendas' | 'produto' | 'compliance';

export interface TrainContent {
    id: string;
    titulo: string;
    tipo: ContentType;
    categoria: Category;
    duracao: string;
    concluido: boolean;
    descricao: string;
    link?: string;
}

export function useTrainingsLocal() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: contents = [], isLoading } = useQuery({
        queryKey: ['trainings', profile?.id],
        queryFn: async () => {
            // Fetch all trainings
            const { data: trainData, error: errT } = await supabase
                .from('trainings')
                .select('*')
                .order('created_at', { ascending: false });

            if (errT) throw errT;

            // Fetch user progress
            let progressData: any[] = [];
            if (profile?.id) {
                const { data: prog, error: errP } = await supabase
                    .from('user_trainings_progress')
                    .select('training_id, concluido')
                    .eq('user_id', profile.id);

                if (!errP && prog) progressData = prog;
            }

            return trainData.map(t => {
                const p = progressData.find(pr => pr.training_id === t.id);
                return {
                    id: t.id,
                    titulo: t.titulo,
                    tipo: t.tipo as ContentType,
                    categoria: t.categoria as Category,
                    duracao: t.duracao || 'N/D',
                    descricao: t.descricao || '',
                    link: t.link || '',
                    concluido: p ? p.concluido : false,
                } as TrainContent;
            });
        }
    });

    const toggleConcluidoMutation = useMutation({
        mutationFn: async ({ trainingId, concluido }: { trainingId: string, concluido: boolean }) => {
            if (!profile?.id) throw new Error('Usuário não autenticado');

            const { data, error } = await supabase.from('user_trainings_progress').upsert({
                user_id: profile.id,
                training_id: trainingId,
                concluido: concluido,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, training_id' });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (err: any) => {
            toast.error('Erro ao atualizar progresso: ' + err.message);
        }
    });

    return {
        contents,
        isLoading,
        toggleConcluido: (trainingId: string, currentlyConcluido: boolean) => {
            toggleConcluidoMutation.mutate({ trainingId, concluido: !currentlyConcluido });
        }
    };
}
