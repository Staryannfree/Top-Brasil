export type LeadStatus =
  | 'novo_lead'
  | 'cotacao_enviada'
  | 'em_negociacao'
  | 'vistoria_contrato'
  | 'perdido';

export type LeadOrigem = 'smclick' | 'meta_ads' | 'indicacao';

export interface LeadNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type MotivoPerda = 'preco' | 'concorrencia' | 'nao_qualificado' | 'desistiu';

export const MOTIVOS_PERDA: { id: MotivoPerda; label: string; emoji: string }[] = [
  { id: 'preco', label: 'Preço', emoji: '💰' },
  { id: 'concorrencia', label: 'Concorrência', emoji: '🏁' },
  { id: 'nao_qualificado', label: 'Não qualificado', emoji: '❌' },
  { id: 'desistiu', label: 'Desistiu', emoji: '👋' },
];

export interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  status: LeadStatus;
  created_at: string;
  data_entrada: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  valor_fipe: number | null;
  codigo_fipe: string | null;
  categoria: string | null;
  cilindradas: string | null;
  atendente: string | null;
  origem: LeadOrigem | null;
  temLembrete: boolean;
  valorAdesao: number | null;
  valorMensalidade: number | null;
  dataFechamento: string | null;
  consultoriaVip: boolean;
  notas: LeadNote[];
  motivoPerda: MotivoPerda | null;
  dadosVerificados: boolean;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cor?: string | null;
  chassi_parcial?: string | null;
  protocolo?: string | null;
  diaVencimento?: number | null;
  statusPagamento?: 'em_dia' | 'atrasado' | 'inadimplente' | null;
  veiculo_marca?: string | null;
  veiculo_modelo?: string | null;
  veiculo_ano?: string | null;
  veiculo_cor?: string | null;
  veiculo_cidade?: string | null;
  valor_cota_participacao?: number | null;
  valor_mensalidade?: number | null;
  link_cotacao?: string | null;
}

export const KANBAN_COLUMNS: { id: LeadStatus; title: string }[] = [
  { id: 'novo_lead', title: 'Novo Lead' },
  { id: 'cotacao_enviada', title: 'Cotação Enviada' },
  { id: 'em_negociacao', title: 'Em Negociação' },
  { id: 'vistoria_contrato', title: 'Vistoria / Contrato' },
  { id: 'perdido', title: 'Perdido' },
];

export const ATENDENTES = ['Carlos', 'Ana', 'Yann'];

export const ORIGEM_CONFIG: Record<LeadOrigem, { label: string; emoji: string; color: string }> = {
  smclick: { label: 'SMClick', emoji: '🤖', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  meta_ads: { label: 'Meta Ads', emoji: '📱', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  indicacao: { label: 'Indicação', emoji: '🗣️', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};
