import { type ProfessionalRecord, type ProfessionOption } from "@/lib/coreclin-types";

const PROFESSION_AREA_LABELS: Record<ProfessionOption, string> = {
  "Farmacêutico": "Farmácia",
  Medicina: "Medicina",
  Enfermagem: "Enfermagem",
  Nutrição: "Nutrição",
  Fisioterapia: "Fisioterapia"
};

export function formatProfessionalAreaLabel(profession: ProfessionOption): string {
  return PROFESSION_AREA_LABELS[profession] ?? profession;
}

export function formatProfessionalCouncilSummary(input: {
  councilType: ProfessionalRecord["councilType"];
  stateUf: ProfessionalRecord["stateUf"];
  councilNumber: ProfessionalRecord["councilNumber"];
}): string | null {
  if (!input.councilType || !input.stateUf || !input.councilNumber) {
    return null;
  }

  return `${input.councilType}/${input.stateUf} ${input.councilNumber}`;
}

export function formatProfessionalOwnSignature(professional: ProfessionalRecord): string {
  const councilSummary = formatProfessionalCouncilSummary(professional);
  return councilSummary
    ? `${professional.fullName} - ${councilSummary}`
    : `${professional.fullName} - ${professional.profession}`;
}

export function formatProfessionalDisplayLabel(professional: ProfessionalRecord): string {
  if (!professional.isTrainee) {
    return professional.profession;
  }

  return `Estagiária de ${formatProfessionalAreaLabel(professional.profession)}`;
}

export function formatProfessionalSupervisorSignature(
  professional: ProfessionalRecord
): string | null {
  if (!professional.supervisingPharmacistName) {
    return null;
  }

  const supervisorCouncilSummary = formatProfessionalCouncilSummary({
    councilType: professional.supervisingPharmacistCouncilType,
    stateUf: professional.supervisingPharmacistStateUf,
    councilNumber: professional.supervisingPharmacistCouncilNumber
  });

  return supervisorCouncilSummary
    ? `${professional.supervisingPharmacistName} - ${supervisorCouncilSummary}`
    : professional.supervisingPharmacistName;
}

export function buildProfessionalSignatureLines(
  professional: ProfessionalRecord | null,
  fallbackLogin: string
): string[] {
  if (!professional) {
    return [fallbackLogin];
  }

  if (!professional.isTrainee) {
    return [formatProfessionalOwnSignature(professional)];
  }

  const signatureLines = [
    `${professional.fullName} - ${formatProfessionalDisplayLabel(professional)}`
  ];
  const supervisorSignature = formatProfessionalSupervisorSignature(professional);
  if (supervisorSignature) {
    signatureLines.push(supervisorSignature);
  }

  return signatureLines;
}
