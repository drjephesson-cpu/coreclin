import { type BmiFormulaId, type BsaFormulaId } from "@/lib/coreclin-types";

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
