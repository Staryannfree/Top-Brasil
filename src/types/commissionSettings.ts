export interface PremioFaixa {
  meta: number;
  valor: number;
}

export interface RecorrenciaFixaFaixa {
  meta: number;
  valor: number;
}

export interface CommissionSettings {
  premioMensal: PremioFaixa[];
  bonusSemanal: { meta: number; valor: number };
  recorrenciaFixa: RecorrenciaFixaFaixa[];
  recorrenciaPercentual: {
    tier1Min: number;
    tier1Porcentagem: number;
    tier2Min: number;
    tier2Porcentagem: number;
  };
  valorConsultoriaVip: number;
}

export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  premioMensal: [
    { meta: 5, valor: 300 },
    { meta: 10, valor: 500 },
    { meta: 15, valor: 750 },
  ],
  bonusSemanal: { meta: 5, valor: 150 },
  recorrenciaFixa: [
    { meta: 15, valor: 900 },
    { meta: 20, valor: 1200 },
  ],
  recorrenciaPercentual: {
    tier1Min: 100,
    tier1Porcentagem: 5,
    tier2Min: 300,
    tier2Porcentagem: 8,
  },
  valorConsultoriaVip: 20,
};
