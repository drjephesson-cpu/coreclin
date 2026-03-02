function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function calculateClinicalIndexes(weightKg: number, heightCm: number): {
  bmi: number;
  bodySurfaceArea: number;
} {
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  const bodySurfaceArea = Math.sqrt((weightKg * heightCm) / 3600);

  return {
    bmi: roundTo(bmi, 2),
    bodySurfaceArea: roundTo(bodySurfaceArea, 2)
  };
}

