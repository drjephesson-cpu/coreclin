import { type BmiFormulaId, type BsaFormulaId, type PatientSex } from "@/lib/coreclin-types";

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateBmi(weightKg: number, heightCm: number, formula: BmiFormulaId): number {
  const heightMeters = heightCm / 100;
  if (formula === "trefethen") {
    return 1.3 * weightKg / heightMeters ** 2.5;
  }

  return weightKg / (heightMeters * heightMeters);
}

function calculateBodySurfaceArea(weightKg: number, heightCm: number, formula: BsaFormulaId): number {
  if (formula === "dubois") {
    return 0.007184 * weightKg ** 0.425 * heightCm ** 0.725;
  }

  if (formula === "haycock") {
    return 0.024265 * weightKg ** 0.5378 * heightCm ** 0.3964;
  }

  return Math.sqrt((weightKg * heightCm) / 3600);
}

export function calculateClinicalIndexes(
  weightKg: number,
  heightCm: number,
  bmiFormula: BmiFormulaId,
  bsaFormula: BsaFormulaId
): {
  bmi: number;
  bodySurfaceArea: number;
} {
  const bmi = calculateBmi(weightKg, heightCm, bmiFormula);
  const bodySurfaceArea = calculateBodySurfaceArea(weightKg, heightCm, bsaFormula);

  return {
    bmi: roundTo(bmi, 2),
    bodySurfaceArea: roundTo(bodySurfaceArea, 2)
  };
}

export function calculateEstimatedGfr(
  creatinineMgDl: number,
  ageYears: number,
  sex: PatientSex
): number {
  const safeCreatinine = Number.isFinite(creatinineMgDl) ? creatinineMgDl : Number.NaN;
  const safeAge = Number.isFinite(ageYears) ? ageYears : Number.NaN;
  if (safeCreatinine <= 0 || safeAge <= 0) {
    return Number.NaN;
  }

  const parameters =
    sex === "female"
      ? { kappa: 0.7, alpha: -0.241, multiplier: 1.012 }
      : { kappa: 0.9, alpha: -0.302, multiplier: 1 };
  const ratio = safeCreatinine / parameters.kappa;
  const estimatedGfr =
    142 *
    Math.min(ratio, 1) ** parameters.alpha *
    Math.max(ratio, 1) ** -1.2 *
    0.9938 ** safeAge *
    parameters.multiplier;

  return roundTo(estimatedGfr, 1);
}

export type PaduaAssessmentInput = {
  activeCancer: boolean;
  previousVte: boolean;
  reducedMobility: boolean;
  knownThrombophilia: boolean;
  recentTraumaOrSurgery: boolean;
  ageYears: number | null;
  heartOrRespiratoryFailure: boolean;
  acuteMiOrIschemicStroke: boolean;
  acuteInfectionOrRheumatologicDisorder: boolean;
  bmi: number | null;
  hormonalTreatment: boolean;
  contraindicationToPharmacologicProphylaxis: boolean;
};

export type PaduaCriterionResult = {
  label: string;
  points: number;
  active: boolean;
  automatic?: boolean;
};

export type PaduaAssessmentResult = {
  total: number;
  highRisk: boolean;
  recommendation: string;
  recommendationKind: "farmacologica" | "mecanica" | "nenhuma";
  criteria: PaduaCriterionResult[];
};

export type LamgAssessmentInput = {
  criticallyIll: boolean;
  shock: boolean;
  coagulopathy: boolean;
  chronicLiverDisease: boolean;
  neurocritical: boolean;
  enteralNutrition: boolean;
  isIntubated: boolean | null;
};

export type LamgAssessmentResult = {
  indicated: boolean;
  recommendationKind: "indicar" | "considerar" | "nao-indicar";
  strongRiskFactorCount: number;
  recommendation: string;
};

export function calculatePaduaAssessment(input: PaduaAssessmentInput): PaduaAssessmentResult {
  const criteria: PaduaCriterionResult[] = [
    { label: "Cancer ativo", points: 3, active: input.activeCancer },
    { label: "TEV previo", points: 3, active: input.previousVte },
    { label: "Mobilidade reduzida", points: 3, active: input.reducedMobility, automatic: true },
    { label: "Trombofilia conhecida", points: 3, active: input.knownThrombophilia },
    { label: "Trauma/cirurgia recente (< 1 mes)", points: 2, active: input.recentTraumaOrSurgery },
    { label: "Idade > 70 anos", points: 1, active: input.ageYears !== null && input.ageYears > 70, automatic: true },
    {
      label: "Insuficiencia cardiaca ou respiratoria",
      points: 1,
      active: input.heartOrRespiratoryFailure
    },
    {
      label: "IAM ou AVC isquemico agudo",
      points: 1,
      active: input.acuteMiOrIschemicStroke
    },
    {
      label: "Infeccao aguda ou doenca reumatologica",
      points: 1,
      active: input.acuteInfectionOrRheumatologicDisorder
    },
    { label: "IMC > 30", points: 1, active: input.bmi !== null && input.bmi > 30, automatic: true },
    { label: "Tratamento hormonal em curso", points: 1, active: input.hormonalTreatment }
  ];

  const total = criteria.reduce((sum, criterion) => sum + (criterion.active ? criterion.points : 0), 0);
  const highRisk = total >= 4;

  let recommendationKind: PaduaAssessmentResult["recommendationKind"] = "nenhuma";
  let recommendation =
    "Padua < 4: risco nao elevado pelo escore. Em geral, nao indicar profilaxia farmacologica apenas com base no Padua.";

  if (highRisk && input.contraindicationToPharmacologicProphylaxis) {
    recommendationKind = "mecanica";
    recommendation =
      "Padua >= 4 com contraindicacao/alto risco de sangramento: evitar profilaxia farmacologica e avaliar profilaxia mecanica enquanto persistir a restricao.";
  } else if (highRisk) {
    recommendationKind = "farmacologica";
    recommendation =
      "Padua >= 4 sem contraindicacao registrada: considerar profilaxia farmacologica intra-hospitalar, preferindo LMWH quando apropriado.";
  }

  return {
    total,
    highRisk,
    recommendation,
    recommendationKind,
    criteria
  };
}

export function calculateLamgAssessment(input: LamgAssessmentInput): LamgAssessmentResult {
  const strongRiskFactorCount = [
    input.shock,
    input.coagulopathy,
    input.chronicLiverDisease
  ].filter(Boolean).length;

  if (!input.criticallyIll) {
    return {
      indicated: false,
      recommendationKind: "nao-indicar",
      strongRiskFactorCount,
      recommendation:
        "LAMG: sem criterio de paciente critico/UTI. Em geral, nao indicar profilaxia rotineira fora desse contexto."
    };
  }

  if (strongRiskFactorCount > 0) {
    return {
      indicated: true,
      recommendationKind: "indicar",
      strongRiskFactorCount,
      recommendation:
        "LAMG: ha fator(es) de maior risco em paciente critico. Considerar profilaxia enquanto o criterio clinico persistir, com reavaliacao diaria."
    };
  }

  if (input.neurocritical) {
    return {
      indicated: true,
      recommendationKind: "considerar",
      strongRiskFactorCount,
      recommendation:
        "LAMG: em paciente neurocritico, considerar profilaxia apos balancear beneficio e risco, com revisao diaria da necessidade."
    };
  }

  if (input.isIntubated) {
    return {
      indicated: false,
      recommendationKind: "nao-indicar",
      strongRiskFactorCount,
      recommendation:
        "LAMG: IOT/ventilacao mecanica isolada nao sustenta indicacao automatica pela diretriz atual; avaliar outros fatores de risco."
    };
  }

  if (input.enteralNutrition) {
    return {
      indicated: false,
      recommendationKind: "nao-indicar",
      strongRiskFactorCount,
      recommendation:
        "LAMG: sem fator maior de risco e com dieta enteral registrada, a tendencia e nao indicar profilaxia rotineira."
    };
  }

  return {
    indicated: false,
    recommendationKind: "nao-indicar",
    strongRiskFactorCount,
    recommendation:
      "LAMG: sem fator maior de risco registrado. Em geral, nao indicar profilaxia rotineira; reavaliar se choque, coagulopatia, hepatopatia cronica ou contexto neurocritico surgirem."
  };
}
