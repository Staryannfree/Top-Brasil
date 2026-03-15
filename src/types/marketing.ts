// ── Social Proof types ──
export type ProvaCategoriaVeiculo = 'particular' | 'app' | 'moto';
export type ProvaEvento = 'roubo' | 'colisao' | 'assistencia';

export interface ProvaSocial {
  id: string;
  slug: string;
  titulo: string;
  categoriaVeiculo: ProvaCategoriaVeiculo;
  evento: ProvaEvento;
  urlMidia: string;
  legendaWhatsApp: string;
  criadoEm: string;
}

export const CATEGORIA_VEICULO_CONFIG: Record<ProvaCategoriaVeiculo, { label: string; emoji: string; color: string }> = {
  particular: { label: 'Particular', emoji: '🚗', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  app: { label: 'App/Aluguel', emoji: '📱', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  moto: { label: 'Moto', emoji: '🏍️', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

export const EVENTO_CONFIG: Record<ProvaEvento, { label: string; emoji: string; color: string }> = {
  roubo: { label: 'Roubo/Furto', emoji: '🚨', color: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
  colisao: { label: 'Colisão', emoji: '💥', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  assistencia: { label: 'Assistência 24h', emoji: '🛠️', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};

export const initialProvas: ProvaSocial[] = [
  { id: '1', slug: 'onix-batido-setor-bueno', titulo: 'Depoimento Onix Batido - Setor Bueno, Goiânia', categoriaVeiculo: 'particular', evento: 'colisao', urlMidia: 'https://cdn.protecao.app/provas/onix-batido.mp4', legendaWhatsApp: '🚗💥 Olha o que aconteceu com o Onix do nosso associado no Setor Bueno! Graças à proteção veicular, ele não teve prejuízo nenhum. Quer saber como proteger o seu? Me chama! ✅', criadoEm: '2026-02-10T10:00:00Z' },
  { id: '2', slug: 'hb20-roubo-aparecida', titulo: 'Recuperação HB20 Roubado - Aparecida de Goiânia', categoriaVeiculo: 'particular', evento: 'roubo', urlMidia: 'https://cdn.protecao.app/provas/hb20-roubo.jpg', legendaWhatsApp: '🚨 HB20 roubado em Aparecida de Goiânia foi RECUPERADO em 48h graças ao rastreador! O associado já recebeu o carro de volta. Sua proteção pode salvar o seu também! 🛡️', criadoEm: '2026-01-25T14:30:00Z' },
  { id: '3', slug: 'uber-kwid-guincho', titulo: 'Assistência Kwid Uber - Guincho Rápido', categoriaVeiculo: 'app', evento: 'assistencia', urlMidia: 'https://cdn.protecao.app/provas/kwid-guincho.mp4', legendaWhatsApp: '📱🛠️ Motorista de App com Kwid precisou de guincho às 2h da manhã e a assistência 24h resolveu em 40 minutos! Proteção para quem roda de App também. Consulte! 🚗✅', criadoEm: '2026-02-20T02:15:00Z' },
  { id: '4', slug: 'cg160-colisao-campinas', titulo: 'Colisão CG 160 - Setor Campinas', categoriaVeiculo: 'moto', evento: 'colisao', urlMidia: 'https://cdn.protecao.app/provas/cg160-colisao.jpg', legendaWhatsApp: '🏍️💥 CG 160 do nosso associado sofreu colisão no Setor Campinas. A proteção cobriu o conserto completo! Moto também tem proteção veicular. Quer saber mais? 🛡️', criadoEm: '2026-03-01T09:00:00Z' },
  { id: '5', slug: 'corolla-guincho-goiania', titulo: 'Assistência Corolla - Pneu Furado GO-060', categoriaVeiculo: 'particular', evento: 'assistencia', urlMidia: 'https://cdn.protecao.app/provas/corolla-pneu.jpg', legendaWhatsApp: '🚗🛠️ Corolla do associado furou o pneu na GO-060. Assistência 24h chegou em 25 min e resolveu no local! Isso é ter PROTEÇÃO de verdade. Faça sua cotação! ✅', criadoEm: '2026-02-28T17:45:00Z' },
  { id: '6', slug: 'mobi-app-roubo-dergo', titulo: 'Mobi App Roubado - DERGO', categoriaVeiculo: 'app', evento: 'roubo', urlMidia: 'https://cdn.protecao.app/provas/mobi-roubo.mp4', legendaWhatsApp: '🚨📱 Mobi de motorista de App foi roubado na região do DERGO. Em 5 dias o associado recebeu a indenização integral! Proteja seu carro de trabalho. Fale comigo! 💬', criadoEm: '2026-03-05T11:20:00Z' },
];
