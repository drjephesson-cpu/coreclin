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
