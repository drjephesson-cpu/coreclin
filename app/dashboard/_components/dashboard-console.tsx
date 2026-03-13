"use client";

import { FormEvent, Fragment, memo, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  type AdmissionRecord,
  type AdmissionRoundNoteRecord,
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  INTERVIEW_INFORMATION_QUALITY_OPTIONS,
  INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS,
  COUNCIL_OPTIONS,
  MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS,
  PATIENT_SEX_OPTIONS,
  PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS,
  PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS,
  PROFESSION_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId,
  type CouncilOption,
  type DashboardData,
  type InpatientEntry,
  type InpatientWorkflowState,
  type InpatientWorkflowStatus,
  type InterviewInformationQuality,
  type InterviewInformationSourceType,
  type LatestMeasurement,
  type MedicationRecord,
  type MedicalPrescriptionRecord,
  type MedicalPrescriptionInterventionResponse,
  type InpatientWorkflowStoragePayload,
  type PatientDashboardDetails,
  type PatientExamImportRecord,
  type PatientExamResultRecord,
  type PatientAllergyRecord,
  type PatientRecord,
  type PatientSex,
  type PrescriptionInterventionContactStatus,
  type PrescriptionInterventionErrorType,
  type PriorMedicationRecord,
  type ProfessionalRecord,
  type ProfessionOption,
  type TeamRecord
} from "@/lib/coreclin-types";
import {
  HEPATOTOXIC_MEDICATIONS,
  RENAL_ADJUSTMENT_MEDICATIONS
} from "@/lib/medication-safety-flags";
import { buildImportantExamCards, isImportantExamRecord } from "@/lib/exam-highlights";
import {
  buildProfessionalSignatureLines,
  formatProfessionalCouncilSummary,
  formatProfessionalDisplayLabel
} from "@/lib/professional-display";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
] as const;

const DASHBOARD_NAV_ITEMS = [
  { id: "professional", label: "Cadastrar profissional" },
  { id: "team", label: "Cadastrar equipe" },
  { id: "patient", label: "Cadastrar pacientes" },
  { id: "medication", label: "Cadastrar medicamentos" },
  { id: "interventions", label: "Intervenções" },
  { id: "validated-medications", label: "Medicamentos validados" },
  { id: "inpatients", label: "Pacientes internados" }
] as const;

const DASHBOARD_NAV_GROUPS = [
  { label: "Profissionais", items: [{ id: "professional", label: "Cadastrar profissional" }] },
  { label: "Equipe", items: [{ id: "team", label: "Cadastrar equipe" }] },
  { label: "Paciente", items: [{ id: "patient", label: "Cadastrar pacientes" }] },
  {
    label: "Medicamentos",
    items: [{ id: "medication", label: "Cadastrar medicamentos" }]
  },
  {
    label: "Relatórios",
    items: [
      { id: "interventions", label: "Intervenções" },
      { id: "validated-medications", label: "Medicamentos validados" }
    ]
  }
] as const;

function formatPatientSexLabel(sex: PatientSex | null | undefined): string {
  if (sex === "female") {
    return "Feminino";
  }

  if (sex === "male") {
    return "Masculino";
  }

  return "Não informado";
}

function formatWorkflowEditorLabel(workflow: InpatientWorkflowState): string {
  return workflow.updatedByProfessionalName ?? workflow.updatedByProfessionalLogin ?? "-";
}

function getMandatoryInpatientRowClassName(status: InpatientWorkflowStatus): string {
  if (status === "Visitado") {
    return "dashboard-row-visited";
  }

  if (status === "Ausente") {
    return "dashboard-row-absent";
  }

  return "";
}

function getMandatoryInpatientStatusSelectClassName(status: InpatientWorkflowStatus): string {
  if (status === "Visitado") {
    return "dashboard-status-select-visited";
  }

  if (status === "Ausente") {
    return "dashboard-status-select-absent";
  }

  return "";
}

const INPATIENT_SIDEBAR_ITEMS = [
  { id: "all", label: "Todos" },
  { id: "team", label: "Por equipe" },
  { id: "mandatory", label: "Lista diária" },
  { id: "discharged", label: "Pacientes de alta" }
] as const;

const PATIENT_VIEW_ITEMS = [
  { id: "allergies", label: "Alergias" },
  { id: "admission-info", label: "Informações da internação" },
  { id: "interview", label: "Entrevista" },
  { id: "exams", label: "Exames" },
  { id: "prior-use", label: "Medicamentos de uso prévio" },
  { id: "medication-validation", label: "Validação de medicamentos" },
  { id: "prescriptions", label: "Prescrição médica" },
  { id: "round-summary", label: "Resumo do round" },
  { id: "evolution", label: "Evolução atualizada" }
] as const;

const PRIOR_MEDICATION_FREQUENCY_OPTIONS = [
  "1x ao dia",
  "2x ao dia",
  "3x ao dia",
  "4x ao dia",
  "5x ao dia",
  "6x ao dia",
  "1 vez por semana",
  "2 vezes por semana",
  "3 vezes por semana",
  "4 vezes por semana",
  "5 vezes por semana"
] as const;

const INPATIENT_STATUS_OPTIONS = ["Visitado", "Pendente", "Ausente", "Alta", "Concluído"] as const;
const INPATIENT_WORKFLOW_STORAGE_KEY = "coreclin.inpatient-workflow.v1";
const TEAM_GROUP_RULES = [
  { key: "clinica-medica-1", label: "Clínica médica 1", aliases: ["cm1", "clinica medica 1"] },
  { key: "clinica-medica-2", label: "Clínica médica 2", aliases: ["cm2", "clinica medica 2"] },
  { key: "clinica-cirurgica", label: "Clínica cirúrgica", aliases: ["cirurgia", "clinica cirurgica"] },
  { key: "clinica-pediatrica", label: "Clínica pediátrica", aliases: ["pediatria", "clinica pediatrica"] },
  { key: "obstetricia", label: "Obstetrícia", aliases: ["obstetricia", "obstetra"] },
  { key: "pneumologia", label: "Pneumologia", aliases: ["pneumo", "pneumologia"] },
  { key: "oncologia", label: "Oncologia", aliases: ["onco", "oncologia"] }
] as const;
const INTERVIEW_INFORMATION_QUALITY_LABELS: Record<InterviewInformationQuality, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta"
};
const CONCEPT_STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "com",
  "sem",
  "para",
  "uso",
  "oral",
  "solucao",
  "comprimido",
  "comprimidos",
  "capsula",
  "capsulas",
  "ampola",
  "ampolas",
  "medicamento",
  "cadastrado",
  "nao",
  "mg",
  "g",
  "ml",
  "ui",
  "ev",
  "vo",
  "im",
  "iv"
]);
const MEDICATION_VARIANT_STOPWORDS = new Set([
  "maleato",
  "fumarato",
  "hemifumarato",
  "cloridrato",
  "hidrocloridrato",
  "bromidrato",
  "carbonato",
  "citrato",
  "fosfato",
  "succinato",
  "acetato",
  "besilato",
  "mesilato",
  "brometo",
  "tartrato",
  "nitrato",
  "lactato",
  "pamoato",
  "oxalato",
  "benzoato",
  "cloreto",
  "sodica",
  "sodico",
  "sodio",
  "potassica",
  "potassico",
  "potassio",
  "calcica",
  "calcico",
  "calcio",
  "magnesio",
  "monoidratado",
  "diidratado",
  "triidratado",
  "hidratado",
  "anidro",
  "base"
]);
type DashboardSectionId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
type PatientViewId = (typeof PATIENT_VIEW_ITEMS)[number]["id"];
type PrescriptionMode = "view" | "raw";
type InpatientOverviewMode = (typeof INPATIENT_SIDEBAR_ITEMS)[number]["id"];
type DashboardRouteSnapshot = {
  patientId: string | null;
  patientView: PatientViewId;
  section: DashboardSectionId | null;
  inpatientMode: InpatientOverviewMode;
};
type FeedbackType = "success" | "error";

type TeamGroupOption = {
  key: string;
  label: string;
  representativeTeamId: number;
  memberTeamIds: number[];
};

type FeedbackState = {
  type: FeedbackType;
  message: string;
} | null;

type AllergyConflictKind = "direct" | "active-ingredient" | "therapeutic-class";

type AllergyConflictResult = {
  allergyName: string;
  kind: AllergyConflictKind;
  detail: string;
};

type MedicationSafetyFlags = {
  renalAdjustment: boolean;
  hepatotoxic: boolean;
};

type AllergySuggestionItem = {
  key: string;
  label: string;
  value: string;
  source: "medication" | "active-ingredient" | "therapeutic-class";
  normalizedValue: string;
  normalizedSearch: string;
};

type RawPrescriptionDraft = {
  lineNumber: number;
  rawLine: string;
  medicationId: number | null;
  medicationName: string;
  dose: number | null;
  doseUnit: string;
  administrationRoute: string;
  frequency: string;
  shifts: string;
  notes: string;
  validationStartAt: string | null;
  validationEndAt: string | null;
  validationStatus: string;
  allergyConflict: AllergyConflictResult | null;
  safetyFlags: MedicationSafetyFlags;
  isValid: boolean;
  validationMessage: string;
  shouldAddToPriorMedicationValidation: boolean;
};

type RawPrescriptionParsedBlock = {
  lineNumber: number;
  rawLine: string;
  prescriptionContent: string;
  validationStartRaw: string;
  validationEndRaw: string;
  validationStatus: string;
};

type SummaryMedicationCandidate = {
  medicationId: number | null;
  medicationName: string;
  dose: number | null;
  doseUnit: string;
  frequency: string;
  shifts: string;
};

type MedicalPrescriptionGroup = {
  key: string;
  admissionDate: string | null;
  bed: string | null;
  validationStartAt: string | null;
  validationEndAt: string | null;
  validationStatus: string | null;
  prescriptions: MedicalPrescriptionRecord[];
};

type ExtractedExamImportResult = {
  fileName: string;
  pageCount: number;
  importedAt: string;
  records: PatientExamResultRecord[];
  rawText: string;
};

type StockValidationFormState = {
  quantityTablets: string;
  lotNumber: string;
  expirationDate: string;
  manufacturer: string;
  patientDidNotBring: boolean;
  stockValidationNote: string;
};

type PriorMedicationReconciliationFormState = {
  dose: string;
  frequency: string;
  shifts: string;
  reconciliationManualStatus: "" | "sim" | "nao";
  reconciliationPrescriptionId: string;
};

type PrescriptionInterventionFormState = {
  interventionNotes: string;
  interventionErrorType: "" | PrescriptionInterventionErrorType;
  interventionContactStatus: "" | PrescriptionInterventionContactStatus;
  interventionRequestedToPrescriber: "" | "sim" | "nao";
  interventionResponse: "" | MedicalPrescriptionInterventionResponse;
};

type InterventionReportFormState = {
  startDate: string;
  endDate: string;
};

type MandatoryEvolutionPreviewPayload = {
  patient: PatientRecord;
  allergies: PatientAllergyRecord[];
  priorMedications: PriorMedicationRecord[];
  latestExamImport: PatientExamImportRecord | null;
  prescriptions: MedicalPrescriptionRecord[];
  professionalSignatureLines: string[];
};

type MandatoryEvolutionPreviewState = {
  entry: InpatientEntry;
  baseText: string;
  includeTitles: boolean;
  feedback: FeedbackState;
};

type DashboardConsoleProps = {
  currentLogin: string;
  data: DashboardData | null;
  dbError: string | null;
};

function createEmptyStockValidationFormState(): StockValidationFormState {
  return {
    quantityTablets: "",
    lotNumber: "",
    expirationDate: "",
    manufacturer: "",
    patientDidNotBring: false,
    stockValidationNote: ""
  };
}

function createEmptyAdmissionFormState() {
  return {
    admissionId: "",
    admissionDate: "",
    bed: "",
    admissionReason: "",
    deniesContinuousMedicationUse: false,
    admissionSummary: "",
    roundSummary: "",
    roundSummaryDate: "",
    admissionImportExcerpt: "",
    interviewInformationQuality: "",
    interviewInformationSourceType: "",
    interviewInformationSourceName: "",
    interviewInformationSourceRelationship: "",
    interviewInterventionMotive: "",
    interviewSubjective: "",
    interviewRelevantSymptoms: "",
    interviewPendingIssues: "",
    interviewPlan: "",
    teamId: "",
    weightKg: "",
    heightCm: "",
    bmiFormula: "quetelet" as BmiFormulaId,
    bsaFormula: "mosteller" as BsaFormulaId
  };
}

function createPriorMedicationReconciliationFormState(
  priorMedication?: Pick<
    PriorMedicationRecord,
    | "dose"
    | "doseUnit"
    | "frequency"
    | "shifts"
    | "reconciliationManualStatus"
    | "reconciliationPrescriptionId"
  >
): PriorMedicationReconciliationFormState {
  const formattedDose =
    priorMedication && priorMedication.dose > 0
      ? `${formatNumber(priorMedication.dose)} ${priorMedication.doseUnit}`.trim()
      : "";

  return {
    dose: formattedDose,
    frequency: priorMedication?.frequency ?? "",
    shifts: priorMedication?.shifts ?? "",
    reconciliationManualStatus:
      priorMedication?.reconciliationManualStatus === true
        ? "sim"
        : priorMedication?.reconciliationManualStatus === false
          ? "nao"
          : "",
    reconciliationPrescriptionId:
      priorMedication?.reconciliationPrescriptionId !== null &&
      priorMedication?.reconciliationPrescriptionId !== undefined
        ? String(priorMedication.reconciliationPrescriptionId)
        : ""
  };
}

function arePriorMedicationReconciliationFormsEqual(
  formState: PriorMedicationReconciliationFormState,
  reference: Pick<
    PriorMedicationRecord,
    | "dose"
    | "doseUnit"
    | "frequency"
    | "shifts"
    | "reconciliationManualStatus"
    | "reconciliationPrescriptionId"
  >
): boolean {
  const formattedReferenceDose =
    reference.dose > 0 ? `${formatNumber(reference.dose)} ${reference.doseUnit}`.trim() : "";

  return (
    formState.dose.trim() === formattedReferenceDose &&
    formState.frequency.trim() === (reference.frequency ?? "") &&
    formState.shifts.trim() === (reference.shifts ?? "") &&
    formState.reconciliationManualStatus ===
      (reference.reconciliationManualStatus === true
        ? "sim"
        : reference.reconciliationManualStatus === false
          ? "nao"
          : "") &&
    formState.reconciliationPrescriptionId ===
      (reference.reconciliationPrescriptionId !== null &&
      reference.reconciliationPrescriptionId !== undefined
        ? String(reference.reconciliationPrescriptionId)
        : "")
  );
}

function createPrescriptionInterventionFormState(
  prescription?: Pick<
    MedicalPrescriptionRecord,
    | "interventionNotes"
    | "interventionErrorType"
    | "interventionContactStatus"
    | "interventionRequestedToPrescriber"
    | "interventionResponse"
  >
): PrescriptionInterventionFormState {
  return {
    interventionNotes: prescription?.interventionNotes ?? "",
    interventionErrorType: prescription?.interventionErrorType ?? "",
    interventionContactStatus:
      prescription?.interventionContactStatus ??
      (prescription?.interventionRequestedToPrescriber === true
        ? "Realizado"
        : prescription?.interventionRequestedToPrescriber === false
          ? "Não realizado"
          : ""),
    interventionRequestedToPrescriber:
      prescription?.interventionRequestedToPrescriber === true
        ? "sim"
        : prescription?.interventionRequestedToPrescriber === false
          ? "nao"
          : "",
    interventionResponse: prescription?.interventionResponse ?? ""
  };
}

function hasPrescriptionIntervention(
  prescription: Pick<
    MedicalPrescriptionRecord,
    | "interventionNotes"
    | "interventionErrorType"
    | "interventionContactStatus"
    | "interventionRequestedToPrescriber"
    | "interventionResponse"
  >
): boolean {
  return Boolean(
    prescription.interventionNotes?.trim() ||
      prescription.interventionErrorType ||
      prescription.interventionContactStatus ||
      prescription.interventionRequestedToPrescriber !== null ||
      prescription.interventionResponse
  );
}

function formatPrescriptionInterventionSummary(
  prescription: Pick<
    MedicalPrescriptionRecord,
    | "interventionNotes"
    | "interventionErrorType"
    | "interventionContactStatus"
    | "interventionRequestedToPrescriber"
    | "interventionResponse"
  >
): string {
  if (!hasPrescriptionIntervention(prescription)) {
    return "-";
  }

  const parts = [];
  if (prescription.interventionNotes?.trim()) {
    parts.push(prescription.interventionNotes.trim());
  }

  if (prescription.interventionErrorType) {
    parts.push(`Tipo de erro: ${prescription.interventionErrorType}`);
  }

  if (prescription.interventionContactStatus) {
    parts.push(`Contato: ${prescription.interventionContactStatus}`);
  }

  if (prescription.interventionRequestedToPrescriber !== null) {
    parts.push(
      `Solicitado ao prescritor: ${
        prescription.interventionRequestedToPrescriber ? "Sim" : "Não"
      }`
    );
  }

  if (prescription.interventionResponse) {
    parts.push(`Resposta: ${prescription.interventionResponse}`);
  }

  return parts.join(" | ");
}

function stripEvolutionTitles(input: string): string {
  return input
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPrescriptionReferenceDateKey(prescription: MedicalPrescriptionRecord): string {
  return normalizeDateOnlyKey(
    prescription.validationEndAt ?? prescription.validationStartAt ?? prescription.createdAt
  );
}

function getPrescriptionRecordSortTime(prescription: MedicalPrescriptionRecord): number {
  return new Date(
    prescription.validationStartAt ?? prescription.validationEndAt ?? prescription.createdAt
  ).getTime();
}

function chooseEarlierPrescriptionDate(
  current: string | null,
  next: string | null
): string | null {
  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  return new Date(next).getTime() < new Date(current).getTime() ? next : current;
}

function chooseLaterPrescriptionDate(current: string | null, next: string | null): string | null {
  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function buildPrescriptionLineDedupKey(prescription: MedicalPrescriptionRecord): string {
  return [
    prescription.medicationId ?? "sem-medicamento",
    normalizeMedicationName(prescription.medicationName),
    prescription.dose,
    normalizeMedicationName(prescription.doseUnit),
    normalizeMedicationName(prescription.administrationRoute ?? ""),
    normalizeMedicationName(prescription.frequency),
    normalizeMedicationName(prescription.shifts),
    normalizeMedicationName(prescription.notes ?? ""),
    prescription.externalValidationCandidate ? "externo" : "catalogo"
  ].join("|");
}

function pickMostRecentPrescription(
  current: MedicalPrescriptionRecord,
  next: MedicalPrescriptionRecord
): MedicalPrescriptionRecord {
  const currentScore = [
    current.patientDidNotBring,
    current.stockValidationNote?.trim(),
    current.quantityTablets !== null,
    current.lotNumber?.trim(),
    current.expirationDate,
    current.manufacturer?.trim(),
    current.interventionNotes?.trim(),
    current.interventionRequestedToPrescriber !== null,
    current.interventionResponse
  ].filter(Boolean).length;
  const nextScore = [
    next.patientDidNotBring,
    next.stockValidationNote?.trim(),
    next.quantityTablets !== null,
    next.lotNumber?.trim(),
    next.expirationDate,
    next.manufacturer?.trim(),
    next.interventionNotes?.trim(),
    next.interventionRequestedToPrescriber !== null,
    next.interventionResponse
  ].filter(Boolean).length;

  if (nextScore !== currentScore) {
    return nextScore > currentScore ? next : current;
  }

  const currentTime = getPrescriptionRecordSortTime(current);
  const nextTime = getPrescriptionRecordSortTime(next);
  if (nextTime !== currentTime) {
    return nextTime > currentTime ? next : current;
  }

  const currentCreatedAt = new Date(current.createdAt).getTime();
  const nextCreatedAt = new Date(next.createdAt).getTime();
  if (nextCreatedAt !== currentCreatedAt) {
    return nextCreatedAt > currentCreatedAt ? next : current;
  }

  return next.id > current.id ? next : current;
}

function groupPrescriptionRecordsBySet(
  prescriptions: MedicalPrescriptionRecord[]
): MedicalPrescriptionGroup[] {
  const groups = new Map<
    string,
    Omit<MedicalPrescriptionGroup, "prescriptions"> & {
      prescriptionsByKey: Map<string, MedicalPrescriptionRecord>;
    }
  >();

  for (const prescription of prescriptions) {
    const key = [
      prescription.admissionId ?? "sem-admissao",
      getPrescriptionReferenceDateKey(prescription),
      prescription.validationStatus ?? "sem-status"
    ].join("|");

    const currentGroup = groups.get(key);
    if (currentGroup) {
      if (!currentGroup.admissionDate && prescription.admissionDate) {
        currentGroup.admissionDate = prescription.admissionDate;
      }

      if (!currentGroup.bed && prescription.bed) {
        currentGroup.bed = prescription.bed;
      }

      currentGroup.validationStartAt = chooseEarlierPrescriptionDate(
        currentGroup.validationStartAt,
        prescription.validationStartAt
      );
      currentGroup.validationEndAt = chooseLaterPrescriptionDate(
        currentGroup.validationEndAt,
        prescription.validationEndAt
      );

      const lineKey = buildPrescriptionLineDedupKey(prescription);
      const currentPrescription = currentGroup.prescriptionsByKey.get(lineKey);
      currentGroup.prescriptionsByKey.set(
        lineKey,
        currentPrescription ? pickMostRecentPrescription(currentPrescription, prescription) : prescription
      );
      continue;
    }

    groups.set(key, {
      key,
      admissionDate: prescription.admissionDate,
      bed: prescription.bed,
      validationStartAt: prescription.validationStartAt,
      validationEndAt: prescription.validationEndAt,
      validationStatus: prescription.validationStatus,
      prescriptionsByKey: new Map([[buildPrescriptionLineDedupKey(prescription), prescription]])
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      admissionDate: group.admissionDate,
      bed: group.bed,
      validationStartAt: group.validationStartAt,
      validationEndAt: group.validationEndAt,
      validationStatus: group.validationStatus,
      prescriptions: Array.from(group.prescriptionsByKey.values()).sort(
        (first, second) => getPrescriptionRecordSortTime(second) - getPrescriptionRecordSortTime(first)
      )
    }))
    .sort((firstGroup, secondGroup) => {
      const firstTime = getPrescriptionValiditySortTime(
        firstGroup.validationEndAt ?? firstGroup.validationStartAt
      );
      const secondTime = getPrescriptionValiditySortTime(
        secondGroup.validationEndAt ?? secondGroup.validationStartAt
      );
      return secondTime - firstTime;
    });
}

function buildMandatoryEvolutionPreviewText(payload: MandatoryEvolutionPreviewPayload): string {
  const latestAdmission = payload.patient.latestAdmission;
  const latestMeasurement = payload.patient.latestMeasurement;
  const patientAge = payload.patient.ageYears;

  const sections: string[] = [
    `${payload.patient.fullName.toUpperCase()} - ${payload.patient.chartNumber}${
      patientAge !== null ? ` - Idade: ${patientAge} anos` : ""
    }`
  ];

  const pushSection = (title: string, lines: string[]) => {
    const sanitizedLines = lines.map((line) => line.trim()).filter((line) => line.length > 0);
    if (sanitizedLines.length === 0) {
      return;
    }

    sections.push("", title, ...sanitizedLines.map((line) => `- ${line}`));
  };

  const patientDataLines: string[] = [];
  patientDataLines.push(
    payload.allergies.length === 0
      ? "ALERGIAS - Paciente NÃO possui ou DESCONHECE alergias/reações adversas"
      : `ALERGIAS - ${payload.allergies.map((allergy) => formatAllergyDisplay(allergy)).join("; ")}`
  );

  const anthropometricParts = [
    latestAdmission?.weightKg ?? latestMeasurement?.weightKg,
    latestAdmission?.heightCm ?? latestMeasurement?.heightCm,
    latestAdmission?.bmi ?? latestMeasurement?.bmi,
    latestAdmission?.bodySurfaceArea ?? latestMeasurement?.bodySurfaceArea
  ];
  const [weightKg, heightCm, bmiValue, bodySurfaceAreaValue] = anthropometricParts;

  const anthropometricText = [
    weightKg !== null && weightKg !== undefined ? `PESO ${formatNumber(weightKg)} kg` : "",
    heightCm !== null && heightCm !== undefined ? `ALTURA ${formatNumber(heightCm)} cm` : "",
    bmiValue !== null && bmiValue !== undefined ? `IMC ${formatNumber(bmiValue)}` : "",
    bodySurfaceAreaValue !== null && bodySurfaceAreaValue !== undefined
      ? `ÁREA DE SUPERFÍCIE ${formatNumber(bodySurfaceAreaValue)}`
      : ""
  ].filter((item) => item.length > 0);

  if (anthropometricText.length > 0) {
    patientDataLines.push(anthropometricText.join(" | "));
  }
  pushSection("#DADOS DO PACIENTE", patientDataLines);

  const examSummaryLines = payload.latestExamImport
    ? groupExamRecordsByDate(
        resolveExamRecordsWithDates(
          payload.latestExamImport.records,
          payload.latestExamImport.rawText
        )
      ).map((group) =>
        `${group.label}: ${group.records
          .map((record) =>
            [
              record.examName,
              record.result,
              record.unit || ""
            ]
              .filter((part) => part.length > 0)
              .join(" ")
          )
          .join("; ")}`
      )
    : [];
  pushSection("#EXAMES", examSummaryLines);

  const qualityLabel = formatInterviewInformationQualityLabel(
    latestAdmission?.interviewInformationQuality ?? null
  );
  const sourceType = latestAdmission?.interviewInformationSourceType ?? null;
  const sourceName = latestAdmission?.interviewInformationSourceName?.trim() ?? "";
  const sourceRelationship = latestAdmission?.interviewInformationSourceRelationship?.trim() ?? "";
  const hasInformantDetails = sourceName.length > 0 || sourceRelationship.length > 0;
  const informationSourceSummary =
    sourceType === "patient"
      ? `Próprio paciente fornece as informações${
          qualityLabel ? ` com ${qualityLabel.toUpperCase()} CONFIABILIDADE` : ""
        }`
      : sourceType === "informant" || hasInformantDetails
        ? [
            [sourceName, sourceRelationship ? `(${sourceRelationship})` : ""]
              .filter((part) => part.length > 0)
              .join(" ")
              .trim() || "Informante",
            "fornece as informações",
            qualityLabel ? `com ${qualityLabel.toUpperCase()} CONFIABILIDADE` : ""
          ]
            .filter((part) => part.length > 0)
            .join(" ")
        : qualityLabel
          ? `Informações com ${qualityLabel.toUpperCase()} CONFIABILIDADE`
          : "";
  pushSection("#FONTE INFORMAÇÃO", informationSourceSummary ? [informationSourceSummary] : []);

  const prescriptionGroups = groupPrescriptionRecordsBySet(payload.prescriptions);
  const priorMedicationLines =
    payload.priorMedications.length > 0
      ? payload.priorMedications.map((priorMedication) => {
          const history = prescriptionGroups.map((group, groupIndex) =>
            resolvePriorMedicationReconciliationForGroup(priorMedication, group, groupIndex)
          );
          const latestReconciled = history[0]?.reconciled ?? null;
          const scheduleParts = [
            priorMedication.dose > 0 ? `${formatNumber(priorMedication.dose)} ${priorMedication.doseUnit}` : "",
            priorMedication.frequency.trim(),
            priorMedication.shifts.trim()
          ].filter((part) => part.length > 0);
          const scheduleText = scheduleParts.length > 0 ? ` (${scheduleParts.join(" | ")})` : "";
          const reconciledText =
            latestReconciled === null ? "Não avaliado" : latestReconciled ? "Sim" : "Não";
          return `${priorMedication.medicationName}${scheduleText} | Reconciliado: ${reconciledText}`;
        })
      : latestAdmission?.deniesContinuousMedicationUse
        ? ["Paciente nega uso de medicamentos de uso contínuo (MUC)."]
        : [];
  pushSection("#MEDICAMENTO DE USO CONTÍNUO E RECONCILIAÇÃO", priorMedicationLines);

  pushSection(
    "#VALIDAÇÃO DE MEDICAMENTOS",
    payload.prescriptions
      .filter((prescription) => isPrescriptionMedicationValidationCandidate(prescription))
      .map((prescription) => {
        const dailyTabletUse = calculateDailyTabletUse({
          dose: prescription.dose,
          doseUnit: prescription.doseUnit,
          frequency: prescription.frequency,
          shifts: prescription.shifts
        });
        const displayMedicationName = getMedicationReferenceName(prescription.medicationName);
        const durationDays = prescription.patientDidNotBring
          ? null
          : calculateDurationDays(prescription.quantityTablets, dailyTabletUse);
        return buildMedicationValidationSummary({
          displayMedicationName,
          quantityTablets: prescription.quantityTablets,
          lotNumber: prescription.lotNumber,
          expirationDate: prescription.expirationDate,
          manufacturer: prescription.manufacturer,
          durationDays,
          patientDidNotBring: prescription.patientDidNotBring,
          stockValidationNote: prescription.stockValidationNote
        });
      })
  );

  const subjectiveLines = [
    ...splitTextIntoBulletLines(latestAdmission?.interviewSubjective),
    ...splitTextIntoBulletLines(latestAdmission?.interviewRelevantSymptoms).map(
      (line) => `Sintomas relevantes: ${line}`
    )
  ];
  pushSection("#SUBJETIVO", subjectiveLines);

  pushSection(
    "#INTERVENÇÕES",
    payload.prescriptions
      .filter((prescription) => hasPrescriptionIntervention(prescription))
      .map(
        (prescription) =>
          `${getPrescriptionMedicationDisplayName(
            prescription.medicationName,
            prescription.externalValidationCandidate
          )} | ${formatPrescriptionInterventionSummary(prescription)}`
      )
  );

  pushSection(
    "#PLANO E CONDUTA FARMACÊUTICA",
    splitTextIntoBulletLines(latestAdmission?.interviewPlan)
  );
  pushSection("#PENDÊNCIAS", splitTextIntoBulletLines(latestAdmission?.interviewPendingIssues));

  sections.push("", ...payload.professionalSignatureLines);
  return sections.join("\n").trim();
}

type PrescriptionInterventionEditorProps = {
  prescription: Pick<
    MedicalPrescriptionRecord,
    | "id"
    | "interventionNotes"
    | "interventionErrorType"
    | "interventionContactStatus"
    | "interventionRequestedToPrescriber"
    | "interventionResponse"
  >;
  isSaving: boolean;
  onSave: (prescriptionId: number, formState: PrescriptionInterventionFormState) => Promise<void>;
};

const PrescriptionInterventionEditor = memo(function PrescriptionInterventionEditor({
  prescription,
  isSaving,
  onSave
}: PrescriptionInterventionEditorProps) {
  const [formState, setFormState] = useState<PrescriptionInterventionFormState>(() =>
    createPrescriptionInterventionFormState(prescription)
  );

  useEffect(() => {
    setFormState(createPrescriptionInterventionFormState(prescription));
  }, [
    prescription.id,
    prescription.interventionNotes,
    prescription.interventionErrorType,
    prescription.interventionContactStatus,
    prescription.interventionRequestedToPrescriber,
    prescription.interventionResponse
  ]);

  return (
    <div className="dashboard-inline-editor">
      <h4>Intervenção farmacêutica</h4>
      <textarea
        placeholder="Escreva a intervenção para este medicamento"
        value={formState.interventionNotes}
        onChange={(event) =>
          setFormState((current) => ({
            ...current,
            interventionNotes: event.target.value
          }))
        }
        rows={4}
      />
      <div className="dashboard-two-columns">
        <select
          value={formState.interventionErrorType}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              interventionErrorType:
                event.target.value as PrescriptionInterventionFormState["interventionErrorType"]
            }))
          }
        >
          <option value="">Tipo de erro</option>
          {PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={formState.interventionContactStatus}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              interventionContactStatus:
                event.target.value as PrescriptionInterventionFormState["interventionContactStatus"],
              interventionRequestedToPrescriber:
                event.target.value === ""
                  ? ""
                  : event.target.value === "Realizado" ||
                      event.target.value === "Contato realizado anteriormente"
                    ? "sim"
                    : "nao"
            }))
          }
        >
          <option value="">Contato</option>
          {PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="dashboard-two-columns">
        <input
          value={
            formState.interventionRequestedToPrescriber === "sim"
              ? "Solicitado ao prescritor: Sim"
              : formState.interventionRequestedToPrescriber === "nao"
                ? "Solicitado ao prescritor: Não"
                : "Solicitado ao prescritor: não informado"
          }
          disabled
          aria-label="Solicitado ao prescritor"
        />
        <select
          value={formState.interventionResponse}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              interventionResponse:
                event.target.value as PrescriptionInterventionFormState["interventionResponse"]
            }))
          }
        >
          <option value="">Intervenção</option>
          {MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="dashboard-inline-actions">
        <button type="button" onClick={() => void onSave(prescription.id, formState)} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar intervenção"}
        </button>
      </div>
    </div>
  );
});

function formatInterviewInformationQualityLabel(
  quality: InterviewInformationQuality | null | undefined
): string {
  return quality ? INTERVIEW_INFORMATION_QUALITY_LABELS[quality] : "";
}

function splitTextIntoBulletLines(input: string | null | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-#*]+/, "").trim())
    .filter((line) => line.length > 0);
}

function formatAllergyDisplay(
  allergy: Pick<PatientAllergyRecord, "allergyName" | "reactionDescription">
): string {
  const reactionDescription = allergy.reactionDescription?.trim();
  return reactionDescription
    ? `${allergy.allergyName} (${reactionDescription})`
    : allergy.allergyName;
}

function parseStockValidationQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function areStockValidationFormsEqual(
  formState: StockValidationFormState,
  reference: {
    quantityTablets: number | null;
    lotNumber: string | null;
    expirationDate: string | null;
    manufacturer: string | null;
    patientDidNotBring: boolean;
    stockValidationNote: string | null;
  }
): boolean {
  return (
    formState.quantityTablets.trim() ===
      (reference.quantityTablets === null ? "" : String(reference.quantityTablets)) &&
    formState.lotNumber.trim() === (reference.lotNumber ?? "") &&
    formState.expirationDate.trim() === (reference.expirationDate ?? "") &&
    formState.manufacturer.trim() === (reference.manufacturer ?? "") &&
    formState.patientDidNotBring === reference.patientDidNotBring &&
    formState.stockValidationNote.trim() === (reference.stockValidationNote ?? "")
  );
}

function buildInpatientWorkflowStorageKey(currentLogin: string): string {
  const normalizedLogin = normalizeSearchValue(currentLogin) || "default";
  return `${INPATIENT_WORKFLOW_STORAGE_KEY}:${normalizedLogin}`;
}

function createEmptyInpatientWorkflowStoragePayload(): InpatientWorkflowStoragePayload {
  return {
    workflowByKey: {},
    trackedEntries: [],
    priorityTeamIds: []
  };
}

function normalizeInpatientWorkflowStoragePayload(
  payload: Partial<InpatientWorkflowStoragePayload> | null | undefined
): InpatientWorkflowStoragePayload {
  if (!payload) {
    return createEmptyInpatientWorkflowStoragePayload();
  }

  const workflowByKey =
    payload.workflowByKey && typeof payload.workflowByKey === "object"
      ? Object.fromEntries(
          Object.entries(payload.workflowByKey).flatMap(([entryKey, workflowValue]) => {
            if (!workflowValue || typeof workflowValue !== "object") {
              return [];
            }

            const workflow = workflowValue as Partial<InpatientWorkflowState>;
            const status =
              workflow.status === "Visitado" ||
              workflow.status === "Ausente" ||
              workflow.status === "Concluído" ||
              workflow.status === "Alta"
                ? workflow.status
                : "Pendente";
            const evolutionGeneratedAt =
              typeof workflow.evolutionGeneratedAt === "string" ? workflow.evolutionGeneratedAt : null;
            const firstVisitCompletedAt =
              typeof workflow.firstVisitCompletedAt === "string"
                ? workflow.firstVisitCompletedAt
                : status === "Visitado" || status === "Concluído"
                  ? typeof workflow.updatedAt === "string"
                    ? workflow.updatedAt
                    : new Date().toISOString()
                  : null;

            return [
              [
                entryKey,
                {
                  status,
                  assignedTeamId:
                    typeof workflow.assignedTeamId === "number" ? workflow.assignedTeamId : null,
                  mandatory: shouldRemainMandatory(status, evolutionGeneratedAt),
                  firstVisitCompletedAt,
                  evolutionGeneratedAt,
                  updatedByProfessionalName:
                    typeof workflow.updatedByProfessionalName === "string"
                      ? workflow.updatedByProfessionalName
                      : null,
                  updatedByProfessionalLogin:
                    typeof workflow.updatedByProfessionalLogin === "string"
                      ? workflow.updatedByProfessionalLogin
                      : null,
                  updatedAt:
                    typeof workflow.updatedAt === "string" ? workflow.updatedAt : new Date().toISOString()
                } satisfies InpatientWorkflowState
              ]
            ];
          })
        )
      : {};

  const trackedEntries = Array.isArray(payload.trackedEntries)
    ? payload.trackedEntries
        .filter((entry): entry is InpatientEntry => {
          if (!entry || typeof entry !== "object") {
            return false;
          }
          return (
            typeof entry.key === "string" &&
            typeof entry.patientName === "string" &&
            typeof entry.chartNumber === "string" &&
            typeof entry.admissionDate === "string" &&
            typeof entry.bed === "string" &&
            (entry.reportedAgeYears === null || typeof entry.reportedAgeYears === "number") &&
            (entry.patientId === null || typeof entry.patientId === "number") &&
            (entry.teamId === null || typeof entry.teamId === "number") &&
            (entry.teamName === null || typeof entry.teamName === "string") &&
            (entry.source === "active" || entry.source === "manual")
          );
        })
        .map((entry) => ({
          ...entry,
          reportedAgeYears: typeof entry.reportedAgeYears === "number" ? entry.reportedAgeYears : null,
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString()
        }))
    : [];

  const priorityTeamIds = Array.isArray(payload.priorityTeamIds)
    ? payload.priorityTeamIds.filter((teamId): teamId is number => typeof teamId === "number")
    : [];

  return {
    workflowByKey,
    trackedEntries,
    priorityTeamIds
  };
}

function mergeMandatoryEntriesIntoPayload(
  payload: InpatientWorkflowStoragePayload,
  manualEntries: InpatientEntry[],
  entriesToPending: Map<string, number | null>,
  updatedByProfessionalName: string,
  updatedByProfessionalLogin: string
): InpatientWorkflowStoragePayload {
  const nextTrackedEntriesByKey = new Map(payload.trackedEntries.map((entry) => [entry.key, entry]));
  for (const manualEntry of manualEntries) {
    if (!nextTrackedEntriesByKey.has(manualEntry.key)) {
      nextTrackedEntriesByKey.set(manualEntry.key, manualEntry);
    }
  }

  const nextWorkflowByKey = { ...payload.workflowByKey };
  for (const [entryKey, assignedTeamId] of entriesToPending.entries()) {
    const currentWorkflow = nextWorkflowByKey[entryKey];
    if (currentWorkflow) {
      nextWorkflowByKey[entryKey] = {
        ...currentWorkflow,
        mandatory: true,
        assignedTeamId: currentWorkflow.assignedTeamId ?? assignedTeamId ?? null
      };
      continue;
    }

    nextWorkflowByKey[entryKey] = {
      status: "Pendente",
      assignedTeamId: assignedTeamId ?? null,
      mandatory: true,
      firstVisitCompletedAt: null,
      evolutionGeneratedAt: null,
      updatedByProfessionalName,
      updatedByProfessionalLogin,
      updatedAt: new Date().toISOString()
    };
  }

  return {
    workflowByKey: nextWorkflowByKey,
    trackedEntries: Array.from(nextTrackedEntriesByKey.values()),
    priorityTeamIds: payload.priorityTeamIds
  };
}

const DASHBOARD_SECTION_IDS = new Set<string>(DASHBOARD_NAV_ITEMS.map((item) => item.id));
const INPATIENT_OVERVIEW_IDS = new Set<string>(INPATIENT_SIDEBAR_ITEMS.map((item) => item.id));
const PATIENT_VIEW_IDS = new Set<string>(PATIENT_VIEW_ITEMS.map((item) => item.id));

function parseDashboardRouteSnapshot(searchParams: Pick<URLSearchParams, "get">): DashboardRouteSnapshot {
  const searchPatientId = searchParams.get("patientId");
  const searchPatientView = searchParams.get("patientView");
  const searchSection = searchParams.get("section");
  const searchInpatientMode = searchParams.get("inpatientMode");

  return {
    patientId:
      typeof searchPatientId === "string" && searchPatientId.trim().length > 0
        ? searchPatientId
        : null,
    patientView: PATIENT_VIEW_IDS.has(searchPatientView ?? "")
      ? (searchPatientView as PatientViewId)
      : "admission-info",
    section: DASHBOARD_SECTION_IDS.has(searchSection ?? "")
      ? (searchSection as DashboardSectionId)
      : null,
    inpatientMode: INPATIENT_OVERVIEW_IDS.has(searchInpatientMode ?? "")
      ? (searchInpatientMode as InpatientOverviewMode)
      : "all"
  };
}

function calculateAge(dateString: string): number | null {
  if (!dateString) {
    return null;
  }
  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDosePart(input: string): { dose: number | null; doseUnit: string } {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) {
    return { dose: null, doseUnit: "" };
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([^\d\s].+)?$/);
  if (!match) {
    return { dose: null, doseUnit: "" };
  }

  const dose = Number(match[1]);
  if (!Number.isFinite(dose) || dose <= 0) {
    return { dose: null, doseUnit: "" };
  }

  return {
    dose,
    doseUnit: match[2]?.trim() ?? ""
  };
}

function sanitizeMedicationName(input: string): { medicationName: string; isNonCatalog: boolean } {
  const trimmed = input.trim();
  const uncatalogedMatch = trimmed.match(/^medicamento nao cadastrado\s*:\s*(.+)$/i);
  if (uncatalogedMatch) {
    return {
      medicationName: uncatalogedMatch[1]?.trim() ?? trimmed,
      isNonCatalog: true
    };
  }

  return {
    medicationName: trimmed,
    isNonCatalog: false
  };
}

function getMedicationReferenceName(input: string): string {
  const sanitizedMedication = sanitizeMedicationName(input);
  return sanitizedMedication.medicationName || input.trim();
}

function collectMedicationMatchTerms(input: string): string[] {
  const referenceName = getMedicationReferenceName(input)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!referenceName) {
    return [];
  }

  const terms = new Set<string>();
  const normalizedReference = normalizeMedicationName(referenceName);
  if (normalizedReference) {
    terms.add(normalizedReference);
  }

  const identityLabel = extractMedicationIdentityLabel(referenceName);
  const normalizedIdentity = normalizeMedicationName(identityLabel);
  if (normalizedIdentity) {
    terms.add(normalizedIdentity);
  }

  return Array.from(terms);
}

function getPrescriptionMedicationDisplayName(
  medicationName: string,
  externalValidationCandidate: boolean
): string {
  const trimmedName = medicationName.trim();
  if (!trimmedName) {
    return "";
  }

  if (!externalValidationCandidate) {
    return trimmedName;
  }

  const hasUncatalogedPrefix = normalizeMedicationName(trimmedName).startsWith(
    "medicamento nao cadastrado"
  );
  if (hasUncatalogedPrefix) {
    return trimmedName;
  }

  const referenceName = getMedicationReferenceName(trimmedName);
  return referenceName ? `MEDICAMENTO NAO CADASTRADO: ${referenceName}` : trimmedName;
}

function extractDoseFromText(input: string): { dose: number | null; doseUnit: string } {
  const compactInput = input.replace(/(\d),(?=\d)/g, "$1.");
  const match = compactInput.match(
    /(\d+(?:\.\d+)?)\s*(mg|mcg|g|kg|mL|ml|UI|ui|U|cp|cps|cmp|comprimidos?|caps?|cápsulas?|gotas?)/i
  );
  if (!match) {
    return { dose: null, doseUnit: "" };
  }

  return parseDosePart(`${match[1]} ${match[2]}`);
}

function extractShiftPatternFromText(input: string): string {
  const match = input.match(/\b(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?){2,5})\b/i);
  if (!match) {
    return "";
  }

  return match[1]?.replace(/\s+/g, "") ?? "";
}

function buildDailyFrequencyLabel(administrationsPerDay: number): string {
  if (!Number.isFinite(administrationsPerDay) || administrationsPerDay <= 0) {
    return "";
  }

  return `${Math.round(administrationsPerDay)}x ao dia`;
}

function countScheduledAdministrations(shifts: string): number | null {
  const normalizedShifts = shifts.trim();
  if (!normalizedShifts) {
    return null;
  }

  const administrations = normalizedShifts
    .split("-")
    .map((part) => Number(part.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0).length;

  return administrations > 0 ? administrations : null;
}

function extractFrequencyFromText(input: string): string {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return "";
  }

  const shiftsPattern = extractShiftPatternFromText(normalizedInput);
  const administrationsFromShifts = countScheduledAdministrations(shiftsPattern);
  if (administrationsFromShifts !== null) {
    return buildDailyFrequencyLabel(administrationsFromShifts);
  }

  if (/\b(?:s\/?\s*n|sn|sos|se\s+necess[aá]rio)\b/i.test(normalizedInput)) {
    return "Se necessário";
  }

  const hourlyMatch = normalizedInput.match(/(?:de\s+)?(\d+)\s*\/\s*(\d+)\s*(?:h|horas?)/i);
  if (hourlyMatch) {
    const hours = Number(hourlyMatch[2] ?? hourlyMatch[1]);
    if (Number.isFinite(hours) && hours > 0 && 24 % hours === 0) {
      return buildDailyFrequencyLabel(24 / hours);
    }

    return hourlyMatch[0].replace(/\s+/g, " ").trim();
  }

  const patterns = [
    /(\d+\s*x\s*\/?\s*d(?:ia)?)/i,
    /(\d+\s*vez(?:es)?\s+ao\s+dia)/i,
    /(1x\s*\/\s*m[eê]s)/i,
    /(antes\s+das?\s+refei[cç][oõ]es)/i,
    /(se\s+necess[aá]rio)/i
  ];

  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      if (pattern === patterns[0] || pattern === patterns[1]) {
        const administrations = Number(match[1]?.match(/\d+/)?.[0] ?? "");
        if (Number.isFinite(administrations) && administrations > 0) {
          return buildDailyFrequencyLabel(administrations);
        }
      }

      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return "";
}

function extractShiftsFromText(input: string): string {
  const shiftPattern = extractShiftPatternFromText(input);
  if (shiftPattern) {
    return shiftPattern;
  }

  const normalizedInput = normalizeMedicationName(input);
  const shifts = [
    normalizedInput.includes("manha") ? "Manhã" : "",
    normalizedInput.includes("tarde") ? "Tarde" : "",
    normalizedInput.includes("noite") ? "Noite" : "",
    normalizedInput.includes("almoco") ? "Almoço" : "",
    normalizedInput.includes("jantar") ? "Jantar" : ""
  ].filter((value) => value.length > 0);

  return shifts.length > 0 ? shifts.join(", ") : "";
}

function normalizeMedicationName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function parseAdministrationCountPerDay(frequency: string): number | null {
  const normalized = normalizeMedicationName(frequency);
  if (!normalized) {
    return null;
  }

  const hourlyMatch = normalized.match(/(?:de\s+)?(\d+)\s*\/\s*(\d+)\s*horas?/);
  if (hourlyMatch) {
    const hours = Number(hourlyMatch[2]);
    if (Number.isFinite(hours) && hours > 0) {
      return 24 / hours;
    }
  }

  const dailyMatch =
    normalized.match(/(\d+)\s*x\s*ao\s*dia/) ??
    normalized.match(/(\d+)\s*vez(?:es)?\s*ao\s*dia/);
  if (dailyMatch) {
    const times = Number(dailyMatch[1]);
    return Number.isFinite(times) && times > 0 ? times : null;
  }

  return null;
}

function parseScheduleUnits(shifts: string): number | null {
  const matches = shifts.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const total = matches.reduce((sum, item) => {
    const value = Number(item.replace(",", "."));
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  return total > 0 ? total : null;
}

function calculateDailyTabletUse(input: {
  dose: number;
  doseUnit: string;
  frequency: string;
  shifts: string;
}): number | null {
  const shiftsTotal = parseScheduleUnits(input.shifts);
  if (shiftsTotal !== null) {
    return shiftsTotal;
  }

  const administrationsPerDay = parseAdministrationCountPerDay(input.frequency);
  if (administrationsPerDay === null) {
    return null;
  }

  return input.dose > 0 ? input.dose * administrationsPerDay : null;
}

function calculateDurationDays(quantityTablets: number | null, dailyTabletUse: number | null): number | null {
  if (quantityTablets === null || dailyTabletUse === null || dailyTabletUse <= 0) {
    return null;
  }

  return quantityTablets / dailyTabletUse;
}

function formatDurationDays(durationDays: number | null): string {
  if (durationDays === null) {
    return "-";
  }

  return `${formatNumber(durationDays)} dias`;
}

function buildMedicationValidationSummary(input: {
  displayMedicationName: string;
  quantityTablets: number | null;
  lotNumber: string | null | undefined;
  expirationDate: string | null | undefined;
  manufacturer: string | null | undefined;
  durationDays: number | null;
  patientDidNotBring: boolean;
  stockValidationNote: string | null | undefined;
}): string {
  const details = [
    input.patientDidNotBring ? "Paciente não trouxe" : "",
    input.quantityTablets !== null ? `${input.quantityTablets} comp` : "",
    input.lotNumber?.trim() ? `Lote ${input.lotNumber.trim()}` : "",
    input.expirationDate ? `Validade ${formatAdmissionDateValue(input.expirationDate)}` : "",
    input.manufacturer?.trim() ? `Marca/Laboratório ${input.manufacturer.trim()}` : "",
    !input.patientDidNotBring && input.durationDays !== null
      ? `Duração estimada ${formatDurationDays(input.durationDays)}`
      : "",
    input.stockValidationNote?.trim() ? `Nota: ${input.stockValidationNote.trim()}` : ""
  ].filter((part) => part.length > 0);

  return details.length > 0
    ? `${input.displayMedicationName} | ${details.join(" | ")}`
    : input.displayMedicationName;
}

function isPrescriptionMedicationValidationCandidate(
  prescription: Pick<MedicalPrescriptionRecord, "externalValidationCandidate" | "medicationName">
): boolean {
  if (prescription.externalValidationCandidate) {
    return true;
  }

  return normalizeMedicationName(prescription.medicationName).startsWith(
    "medicamento nao cadastrado"
  );
}

function hasPrescriptionStockValidation(
  prescription: Pick<
    MedicalPrescriptionRecord,
    | "quantityTablets"
    | "lotNumber"
    | "expirationDate"
    | "manufacturer"
    | "patientDidNotBring"
    | "stockValidationNote"
    | "stockValidationRecordedAt"
    | "stockValidationProfessionalId"
  >
): boolean {
  return (
    prescription.stockValidationRecordedAt !== null ||
    prescription.stockValidationProfessionalId !== null ||
    prescription.quantityTablets !== null ||
    Boolean(prescription.lotNumber?.trim()) ||
    Boolean(prescription.expirationDate) ||
    Boolean(prescription.manufacturer?.trim()) ||
    prescription.patientDidNotBring ||
    Boolean(prescription.stockValidationNote?.trim())
  );
}

function formatPrescriptionPosology(
  prescription: Pick<MedicalPrescriptionRecord, "dose" | "doseUnit" | "frequency" | "shifts">
): string {
  const shiftsLabel = prescription.shifts.trim();
  return [
    prescription.dose > 0 ? `${formatNumber(prescription.dose)} ${prescription.doseUnit}`.trim() : "",
    prescription.frequency.trim(),
    shiftsLabel && shiftsLabel !== "-" ? shiftsLabel : ""
  ]
    .filter((part) => part.length > 0)
    .join(" | ");
}

function formatMedicationValidationExpiry(expirationDate: string | null): string {
  const normalized = expirationDate ? normalizeAdmissionDateValue(expirationDate) : null;
  if (!normalized) {
    return "-";
  }

  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return formatAdmissionDateValue(normalized);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit"
  })
    .format(parsed)
    .replace(".", "");
}

function calculateMedicationRevalidationDate(
  validationRecordedAt: string | null,
  quantityTablets: number | null,
  dailyTabletUse: number | null
): string | null {
  const normalizedValidationDate = validationRecordedAt
    ? normalizeAdmissionDateValue(validationRecordedAt)
    : null;
  const durationDays = calculateDurationDays(quantityTablets, dailyTabletUse);

  if (!normalizedValidationDate || durationDays === null) {
    return null;
  }

  const baseDate = new Date(`${normalizedValidationDate}T12:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  baseDate.setDate(baseDate.getDate() + Math.ceil(durationDays));
  return baseDate.toISOString().slice(0, 10);
}

function isLikelyExamResultValue(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  if (/^[<>]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return true;
  }

  const normalized = normalizeSearchValue(trimmed);
  return [
    "positivo",
    "negativo",
    "reagente",
    "nao reagente",
    "detectado",
    "nao detectado",
    "presente",
    "ausente"
  ].includes(normalized);
}

function isLikelyExamUnitValue(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  return /^(%|[a-zA-Zµ/0-9.^:-]+)$/.test(trimmed) && /[a-zA-Zµ%]/.test(trimmed);
}

function isLikelyExamReferenceValue(input: string): boolean {
  const normalized = normalizeSearchValue(input);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("referencia") ||
    normalized.includes("ate") ||
    normalized.includes("adultos") ||
    normalized.includes("criancas") ||
    /[<>]?\d+(?:[.,]\d+)?\s*(?:-|a)\s*[<>]?\d+(?:[.,]\d+)?/.test(normalized)
  );
}

function isLikelyExamName(input: string): boolean {
  const normalized = normalizeSearchValue(input.replace(/:$/, ""));
  if (!normalized || normalized.length < 3) {
    return false;
  }

  const blockedTokens = [
    "paciente",
    "prontuario",
    "convenio",
    "cartao sus",
    "pagina",
    "origem",
    "data de nascimento",
    "emissao do laudo",
    "solicitacao",
    "metodo",
    "valor de referencia",
    "valores de referencia",
    "recebimento material",
    "liberado em",
    "responsavel tecnico",
    "dr a",
    "dr",
    "bioquimica",
    "hematologia",
    "uroanalise",
    "parasitologia",
    "microbiologia",
    "observacao",
    "obs"
  ];

  return !blockedTokens.some((token) => normalized.includes(token));
}

function buildExamPdfLines(
  items: Array<{ str?: string; transform?: number[]; width?: number }>
): string[] {
  const positionedItems = items
    .map((item) => ({
      text: item.str?.trim() ?? "",
      x: Array.isArray(item.transform) ? Number(item.transform[4] ?? 0) : 0,
      y: Array.isArray(item.transform) ? Number(item.transform[5] ?? 0) : 0,
      width: typeof item.width === "number" ? item.width : 0
    }))
    .filter((item) => item.text.length > 0)
    .sort((first, second) => {
      if (Math.abs(second.y - first.y) > 2) {
        return second.y - first.y;
      }

      return first.x - second.x;
    });

  const lines: Array<{ y: number; items: typeof positionedItems }> = [];

  for (const item of positionedItems) {
    const existingLine = lines.find((line) => Math.abs(line.y - item.y) <= 2);
    if (existingLine) {
      existingLine.items.push(item);
      continue;
    }

    lines.push({ y: item.y, items: [item] });
  }

  return lines
    .sort((first, second) => second.y - first.y)
    .map((line) => {
      const orderedItems = [...line.items].sort((first, second) => first.x - second.x);
      let content = "";

      for (let index = 0; index < orderedItems.length; index += 1) {
        const currentItem = orderedItems[index];
        const previousItem = orderedItems[index - 1];

        if (!previousItem) {
          content = currentItem.text;
          continue;
        }

        const previousEndX = previousItem.x + previousItem.width;
        const gap = currentItem.x - previousEndX;
        content += gap > 14 ? "\t" : " ";
        content += currentItem.text;
      }

      return content.replace(/\s+\t/g, "\t").replace(/\t\s+/g, "\t").trim();
    })
    .filter((line) => line.length > 0);
}

function parseExtractedExamRecords(
  pageLines: Array<{ pageNumber: number; line: string }>
): PatientExamResultRecord[] {
  const records: PatientExamResultRecord[] = [];

  for (const { pageNumber, line } of pageLines) {
    const segments = line
      .split("\t")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (segments.length < 2) {
      continue;
    }

    const resultIndex = segments.findIndex(
      (segment, index) => index > 0 && isLikelyExamResultValue(segment)
    );
    if (resultIndex <= 0) {
      continue;
    }

    const examName = segments.slice(0, resultIndex).join(" ").replace(/:\s*$/, "").trim();
    if (!isLikelyExamName(examName)) {
      continue;
    }

    const result = segments[resultIndex] ?? "";
    const afterResultSegments = segments.slice(resultIndex + 1);
    const unit = afterResultSegments.find((segment) => isLikelyExamUnitValue(segment)) ?? "";
    const referenceRange =
      afterResultSegments.find((segment) => isLikelyExamReferenceValue(segment)) ??
      afterResultSegments.filter((segment) => !isLikelyExamUnitValue(segment)).join(" | ");

    const key = normalizeSearchValue(`${pageNumber}-${examName}-${result}-${unit}`);
    if (records.some((record) => record.key === key)) {
      continue;
    }

    records.push({
      key,
      examName,
      result,
      unit,
      referenceRange,
      pageNumber,
      examDate: null
    });
  }

  return records;
}

function normalizeSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function normalizeTeamAlias(input: string): string {
  return normalizeSearchValue(input).replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveTeamGroupIdentity(teamName: string | null | undefined): { key: string; label: string } | null {
  const rawName = typeof teamName === "string" ? teamName.trim() : "";
  if (!rawName) {
    return null;
  }

  const normalizedName = normalizeTeamAlias(rawName);
  const matchedRule = TEAM_GROUP_RULES.find((rule) =>
    rule.aliases.some((alias) => normalizeTeamAlias(alias) === normalizedName)
  );

  if (matchedRule) {
    return { key: matchedRule.key, label: matchedRule.label };
  }

  return {
    key: normalizedName.replace(/\s+/g, "-"),
    label: rawName
  };
}

function formatCanonicalTeamName(teamName: string | null | undefined): string {
  const identity = resolveTeamGroupIdentity(teamName);
  return identity?.label ?? "-";
}

function getInpatientEntryIdentity(entry: InpatientEntry): string {
  const normalizedChart = normalizeSearchValue(entry.chartNumber);
  const normalizedName = normalizeSearchValue(entry.patientName);

  if (entry.patientId !== null) {
    return `patient:${entry.patientId}`;
  }

  if (normalizedChart) {
    return `chart:${normalizedChart}`;
  }

  return `name:${normalizedName || entry.key}`;
}

function formatInterventionUnitLabel(teamName: string | null | undefined): string {
  const normalizedTeamName = typeof teamName === "string" ? normalizeTeamAlias(teamName) : "";
  if (!normalizedTeamName) {
    return "-";
  }

  const teamGroupIdentity = resolveTeamGroupIdentity(teamName);
  switch (teamGroupIdentity?.key ?? normalizedTeamName) {
    case "clinica-medica-1":
    case "clinica-medica-2":
    case "cm3":
      return "Clínica Médica";
    case "clinica-cirurgica":
      return "Cirurgia";
    case "obstetricia":
      return "Obstetrícia";
    case "clinica-pediatrica":
      return "Pediatria";
    default:
      return teamGroupIdentity?.label ?? teamName?.trim() ?? "-";
  }
}

function normalizeMandatoryBedLabel(input: string): string {
  const sanitized = input.trim().toUpperCase().replace(/^L:/, "");
  if (!sanitized) {
    return "";
  }

  const parts = sanitized
    .split("-")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length >= 2) {
    const bedNumber = parts[parts.length - 2].replace(/^0+/, "") || "0";
    const bedSuffix = parts[parts.length - 1];
    return `${bedNumber}-${bedSuffix}`;
  }

  return sanitized.replace(/^0+/, "") || sanitized;
}

function buildIsoAdmissionDate(year: number, month: number, day: number): string | null {
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeAdmissionDateValue(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|T|$)/);
  if (isoMatch) {
    return buildIsoAdmissionDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\b|\s|$)/);
  if (!brMatch) {
    return null;
  }

  const day = Number(brMatch[1]);
  const month = Number(brMatch[2]);
  const year = Number(brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3]);

  return buildIsoAdmissionDate(year, month, day);
}

function formatEditableDateInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = normalizeAdmissionDateValue(trimmed);
  if (normalized) {
    return formatAdmissionDateValue(normalized);
  }

  const digitsOnly = trimmed.replace(/\D/g, "").slice(0, 8);
  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.length <= 2) {
    return digitsOnly;
  }

  if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  }

  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
}

function formatEditableDecimalInput(input: string): string {
  const sanitized = input.replace(/\./g, ",").replace(/[^\d,]/g, "");
  if (!sanitized) {
    return "";
  }

  const startsWithSeparator = sanitized.startsWith(",");
  const [integerPartRaw, ...decimalParts] = sanitized.split(",");
  const integerPart = startsWithSeparator ? `0${integerPartRaw}` : integerPartRaw;

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart || "0"},${decimalParts.join("")}`;
}

function parseOptionalDecimalInput(input: string): number | undefined {
  const formatted = formatEditableDecimalInput(input);
  if (!formatted) {
    return undefined;
  }

  const normalized = formatted.endsWith(",") ? formatted.slice(0, -1) : formatted;
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatAdmissionDateValue(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  const normalized = normalizeAdmissionDateValue(input);
  if (!normalized) {
    return input.trim();
  }

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function formatAdmissionDate(input: string | null | undefined): string {
  return formatAdmissionDateValue(input) || "-";
}

function getCurrentFormattedDateValue(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  return `${day}/${month}/${year}`;
}

function getCurrentMonthStartFormattedDateValue(): string {
  const now = new Date();
  return `01/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getFullYear())}`;
}

function escapeCsvCell(input: string): string {
  const normalized = input.replace(/"/g, "\"\"");
  return /[",;\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function scoreExamDateCandidateLine(line: string): number {
  const normalizedLine = normalizeSearchValue(line);
  if (!normalizedLine) {
    return Number.NEGATIVE_INFINITY;
  }

  if (
    normalizedLine.includes("nascimento") ||
    normalizedLine.includes("idade") ||
    normalizedLine.includes("internacao") ||
    normalizedLine.includes("admissao")
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 1;
  const weightedTokens = [
    ["coleta", 8],
    ["coletado", 8],
    ["colhido", 8],
    ["liberado", 7],
    ["resultado", 6],
    ["emissao", 5],
    ["emitido", 5],
    ["solicitacao", 4],
    ["solicitado", 4],
    ["recebimento", 4],
    ["material", 3],
    ["laudo", 3],
    ["data", 2],
    ["exame", 2]
  ] as const;

  for (const [token, tokenScore] of weightedTokens) {
    if (normalizedLine.includes(token)) {
      score += tokenScore;
    }
  }

  if (/\b\d{1,2}:\d{2}\b/.test(normalizedLine)) {
    score += 1;
  }

  return score;
}

function extractExamPageLines(rawText: string): Array<{ pageNumber: number; line: string }> {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      const match = line.match(/^\[P(?:á|a)g\.\s*(\d+)\]\s*(.+)$/i);
      if (!match) {
        return [];
      }

      const pageNumber = Number(match[1]);
      const content = match[2]?.trim() ?? "";
      if (!Number.isInteger(pageNumber) || pageNumber <= 0 || !content) {
        return [];
      }

      return [{ pageNumber, line: content }];
    });
}

function inferExamDatesByPageFromRawText(rawText: string): Map<number, string | null> {
  const pageLines = extractExamPageLines(rawText);
  const linesByPage = new Map<number, string[]>();

  for (const { pageNumber, line } of pageLines) {
    const currentLines = linesByPage.get(pageNumber) ?? [];
    currentLines.push(line);
    linesByPage.set(pageNumber, currentLines);
  }

  const pageDates = new Map<number, string | null>();
  const datePattern = /\b(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;

  for (const [pageNumber, lines] of linesByPage.entries()) {
    let bestCandidate: { examDate: string; score: number; lineIndex: number } | null = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex] ?? "";
      const score = scoreExamDateCandidateLine(line);
      if (!Number.isFinite(score)) {
        continue;
      }

      const matches = line.match(datePattern);
      if (!matches || matches.length === 0) {
        continue;
      }

      for (const match of matches) {
        const normalizedDate = normalizeAdmissionDateValue(match);
        if (!normalizedDate) {
          continue;
        }

        if (
          !bestCandidate ||
          score > bestCandidate.score ||
          (score === bestCandidate.score && lineIndex < bestCandidate.lineIndex)
        ) {
          bestCandidate = { examDate: normalizedDate, score, lineIndex };
        }
      }
    }

    pageDates.set(pageNumber, bestCandidate?.examDate ?? null);
  }

  return pageDates;
}

function resolveExamRecordsWithDates(
  records: PatientExamResultRecord[],
  rawText?: string
): PatientExamResultRecord[] {
  if (!rawText || records.every((record) => Boolean(record.examDate))) {
    return records;
  }

  const pageDates = inferExamDatesByPageFromRawText(rawText);
  return records.map((record) => ({
    ...record,
    examDate: record.examDate ?? pageDates.get(record.pageNumber) ?? null
  }));
}

function formatExamDateLabel(input: string | null | undefined): string {
  return formatAdmissionDateValue(input) || "Data nao identificada no PDF";
}

function getExamDateSortTime(input: string | null | undefined): number {
  const normalized = normalizeAdmissionDateValue(input ?? "");
  if (!normalized) {
    return -1;
  }

  const [year, month, day] = normalized.split("-");
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getTime();
}

function groupExamRecordsByDate(
  records: PatientExamResultRecord[]
): Array<{
  key: string;
  label: string;
  sortTime: number;
  records: PatientExamResultRecord[];
}> {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      sortTime: number;
      records: PatientExamResultRecord[];
    }
  >();
  const recordOrderByKey = new Map(records.map((record, index) => [record.key, index]));

  for (const record of records) {
    const normalizedDate = normalizeAdmissionDateValue(record.examDate ?? "");
    const key = normalizedDate ?? "sem-data";
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.records.push(record);
      continue;
    }

    groups.set(key, {
      key,
      label: formatExamDateLabel(normalizedDate),
      sortTime: getExamDateSortTime(normalizedDate),
      records: [record]
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      records: [...group.records].sort((first, second) => {
        const firstOrder = recordOrderByKey.get(first.key) ?? Number.MAX_SAFE_INTEGER;
        const secondOrder = recordOrderByKey.get(second.key) ?? Number.MAX_SAFE_INTEGER;
        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        if (first.pageNumber !== second.pageNumber) {
          return first.pageNumber - second.pageNumber;
        }

        return 0;
      })
    }))
    .sort((first, second) => {
      if (first.sortTime !== second.sortTime) {
        return second.sortTime - first.sortTime;
      }

      return first.label.localeCompare(second.label, "pt-BR");
    });
}

function ExamResultsPanel({
  records,
  rawText,
  emptyMessage,
  onRemoveRecord,
  removingRecordKey
}: {
  records: PatientExamResultRecord[];
  rawText?: string;
  emptyMessage: string;
  onRemoveRecord?: (record: PatientExamResultRecord) => void;
  removingRecordKey?: string | null;
}) {
  if (records.length === 0) {
    return <p className="dashboard-muted">{emptyMessage}</p>;
  }

  const groupedRecords = groupExamRecordsByDate(resolveExamRecordsWithDates(records, rawText));

  return (
    <div className="dashboard-exam-panel">
      {groupedRecords.map((group) => (
        <section key={group.key} className="dashboard-exam-group">
          <div className="dashboard-exam-group-header">
            <div>
              <h4>{group.label}</h4>
              <p>{`${group.records.length} resultado${group.records.length === 1 ? "" : "s"} identificado${group.records.length === 1 ? "" : "s"}`}</p>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Exame</th>
                  <th>Resultado</th>
                  <th>Unidade</th>
                  <th>Referência</th>
                  <th>Página</th>
                  {onRemoveRecord ? <th>Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {group.records.map((record) => (
                  <tr key={record.key}>
                    <td>{record.examName}</td>
                    <td>{record.result}</td>
                    <td>{record.unit || "-"}</td>
                    <td>{record.referenceRange || "-"}</td>
                    <td>{record.pageNumber}</td>
                    {onRemoveRecord ? (
                      <td>
                        <button
                          type="button"
                          className="dashboard-chip-remove"
                          onClick={() => onRemoveRecord(record)}
                          disabled={removingRecordKey === record.key}
                          aria-label={`Remover exame ${record.examName}`}
                        >
                          {removingRecordKey === record.key ? "Removendo..." : "Remover"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function ImportantExamCardsPanel({
  records,
  rawText,
  patientAgeYears,
  patientSex,
  emptyMessage,
  onRemoveRecord,
  removingRecordKey
}: {
  records: PatientExamResultRecord[];
  rawText?: string;
  patientAgeYears?: number | null;
  patientSex?: PatientSex | null;
  emptyMessage: string;
  onRemoveRecord?: (record: PatientExamResultRecord) => void;
  removingRecordKey?: string | null;
}) {
  if (records.length === 0) {
    return <p className="dashboard-muted">{emptyMessage}</p>;
  }

  const cards = buildImportantExamCards({ records, rawText, patientAgeYears, patientSex });
  const visibleCards = cards.filter((card) => card.result.trim().length > 0);
  const recordByKey = new Map(records.map((record) => [record.key, record]));

  if (visibleCards.length === 0) {
    return <p className="dashboard-muted">{emptyMessage}</p>;
  }

  return (
    <div className="dashboard-important-exams">
      <p className="dashboard-muted">
        {`${visibleCards.length} card${visibleCards.length === 1 ? "" : "s"} laboratorial${
          visibleCards.length === 1 ? "" : "ais"
        } preenchido${visibleCards.length === 1 ? "" : "s"} com resultado.`}
      </p>

      <div className="dashboard-important-exam-grid">
        {visibleCards.map((card) => {
          const indicator =
            card.status === "high" ? "↑" : card.status === "low" ? "↓" : card.status === "normal" ? "✓" : "";
          const statusLabel =
            card.status === "high"
              ? "Acima da referência"
              : card.status === "low"
                ? "Abaixo da referência"
                : card.status === "normal"
                  ? "Dentro da referência"
                  : card.note
                    ? "Aguardando dados clínicos"
                    : "Não identificado";
          const meta = [
            card.examDate ? formatExamDateLabel(card.examDate) : "",
            card.pageNumber ? `Pág. ${card.pageNumber}` : ""
          ]
            .filter((item) => item.length > 0)
            .join(" · ");
          const matchingRecord = card.resultRecordKey ? recordByKey.get(card.resultRecordKey) : null;

          return (
            <article
              key={card.id}
              className={`dashboard-important-exam-card dashboard-important-exam-card-${card.status}`}
            >
              <div className="dashboard-important-exam-card-header">
                <h4>{card.label}</h4>
                {card.id === "tfge" ? <span className="dashboard-important-exam-badge">Calculado</span> : null}
              </div>

              <strong className="dashboard-important-exam-value">
                {card.result.trim() ? (
                  <>
                    {[card.result, card.unit].filter((item) => item.length > 0).join(" ")}
                    {indicator ? (
                      <span className="dashboard-important-exam-value-indicator" aria-hidden="true">
                        {indicator}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Não identificado"
                )}
              </strong>

              <p className="dashboard-important-exam-reference">{`VR: ${card.referenceText}`}</p>
              {card.note ? <p className="dashboard-important-exam-note">{card.note}</p> : null}
              <span className="dashboard-important-exam-status">{statusLabel}</span>
              {onRemoveRecord && matchingRecord ? (
                <button
                  type="button"
                  className="dashboard-chip-remove"
                  onClick={() => onRemoveRecord(matchingRecord)}
                  disabled={removingRecordKey === matchingRecord.key}
                >
                  {removingRecordKey === matchingRecord.key ? "Removendo..." : "Remover"}
                </button>
              ) : null}
              {meta ? <span className="dashboard-important-exam-meta">{meta}</span> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function normalizeDateOnlyKey(input: string | null | undefined): string {
  if (!input) {
    return "sem-data";
  }

  return formatAdmissionDateValue(input) || "sem-data";
}

function formatPrescriptionValidityDate(input: string | null | undefined): string {
  return formatAdmissionDateValue(input) || "-";
}

function getPrescriptionValiditySortTime(input: string | null | undefined): number {
  const dateKey = normalizeDateOnlyKey(input);
  if (dateKey === "sem-data") {
    return 0;
  }

  const [day, month, year] = dateKey.split("/");
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function parseMandatoryAdmissionDate(input: string): string {
  const normalized = normalizeAdmissionDateValue(input);
  if (!normalized) {
    return new Date().toISOString().slice(0, 10);
  }

  return normalized;
}

function shouldRemainMandatory(
  status: InpatientWorkflowStatus,
  _evolutionGeneratedAt: string | null
): boolean {
  return status !== "Concluído" && status !== "Alta";
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTokenBoundaryMatch(source: string, target: string): boolean {
  if (!source || !target) {
    return false;
  }

  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(target)}(?:\\s|$)`);
  return pattern.test(source);
}

function isMedicationNameCompatible(firstName: string, secondName: string): boolean {
  const first = normalizeMedicationName(firstName);
  const second = normalizeMedicationName(secondName);
  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  if (hasTokenBoundaryMatch(first, second) || hasTokenBoundaryMatch(second, first)) {
    return true;
  }

  if (hasEquivalentMedicationIdentity(firstName, secondName)) {
    return true;
  }

  return hasConceptTermMatch(first, second);
}

function isStrictMedicationReferenceMatch(firstName: string, secondName: string): boolean {
  const first = normalizeMedicationName(firstName);
  const second = normalizeMedicationName(secondName);
  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  if (hasTokenBoundaryMatch(first, second) || hasTokenBoundaryMatch(second, first)) {
    return true;
  }

  return hasEquivalentMedicationIdentity(firstName, secondName);
}

function doesManualReconciliationApplyToGroup(
  manualStatus: boolean | null,
  reconciliationPrescriptionId: number | null,
  group: MedicalPrescriptionGroup,
  groupIndex: number
): boolean {
  if (manualStatus === null) {
    return false;
  }

  if (reconciliationPrescriptionId !== null) {
    return group.prescriptions.some((prescription) => prescription.id === reconciliationPrescriptionId);
  }

  return groupIndex === 0;
}

function resolvePriorMedicationReconciliationForGroup(
  priorMedication: Pick<
    PriorMedicationRecord,
    "medicationName" | "reconciliationManualStatus" | "reconciliationPrescriptionId"
  >,
  group: MedicalPrescriptionGroup,
  groupIndex: number
): { reconciled: boolean; source: "automatic" | "manual" } {
  const automaticMatch = group.prescriptions.some((prescription) =>
    isMedicationNameCompatible(prescription.medicationName, priorMedication.medicationName)
  );

  if (
    doesManualReconciliationApplyToGroup(
      priorMedication.reconciliationManualStatus,
      priorMedication.reconciliationPrescriptionId,
      group,
      groupIndex
    )
  ) {
    return {
      reconciled: priorMedication.reconciliationManualStatus === true,
      source: "manual"
    };
  }

  return {
    reconciled: automaticMatch,
    source: "automatic"
  };
}

function matchesMedicationReferenceList(
  medicationName: string,
  references: readonly string[]
): boolean {
  return references.some((reference) => isStrictMedicationReferenceMatch(reference, medicationName));
}

function hasMedicationSafetyFlag(flags: MedicationSafetyFlags): boolean {
  return flags.renalAdjustment || flags.hepatotoxic;
}

function resolveCatalogMedicationSafetyFlags(medication: {
  name: string;
  activeIngredients: string | null;
  searchAliases: string | null;
}): MedicationSafetyFlags {
  const searchCandidates = [
    medication.name,
    ...splitCatalogTerms(medication.activeIngredients ?? "").map((term) => term.raw),
    ...splitCatalogTerms(medication.searchAliases ?? "").map((term) => term.raw)
  ].filter((value, index, current) => value && current.indexOf(value) === index);

  return {
    renalAdjustment: searchCandidates.some((value) =>
      matchesMedicationReferenceList(value, RENAL_ADJUSTMENT_MEDICATIONS)
    ),
    hepatotoxic: searchCandidates.some((value) =>
      matchesMedicationReferenceList(value, HEPATOTOXIC_MEDICATIONS)
    )
  };
}

function splitCatalogTerms(input: string): Array<{ raw: string; normalized: string }> {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return [];
  }

  const fragments = normalizedInput
    .replace(/\s+[eE]\s+/g, " + ")
    .split(/[+;,|/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const uniqueTerms = new Map<string, string>();
  for (const fragment of fragments) {
    const normalizedFragment = normalizeMedicationName(fragment);
    if (normalizedFragment && !uniqueTerms.has(normalizedFragment)) {
      uniqueTerms.set(normalizedFragment, fragment);
    }
  }

  return Array.from(uniqueTerms.entries()).map(([normalized, raw]) => ({ raw, normalized }));
}

function extractConceptTokens(input: string): string[] {
  const normalized = normalizeMedicationName(getMedicationReferenceName(input));
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/\d/.test(token))
    .filter((token) => !CONCEPT_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
}

function extractMedicationIdentityTokens(input: string): string[] {
  return extractConceptTokens(input).filter((token) => !MEDICATION_VARIANT_STOPWORDS.has(token));
}

function extractMedicationIdentityLabel(input: string): string {
  const referenceName = getMedicationReferenceName(input);
  if (!referenceName) {
    return "";
  }

  return referenceName
    .split(/\s+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0)
    .filter((fragment) => {
      const normalizedFragment = normalizeMedicationName(fragment);
      return (
        normalizedFragment.length >= 3 &&
        !/\d/.test(normalizedFragment) &&
        !CONCEPT_STOPWORDS.has(normalizedFragment) &&
        !MEDICATION_VARIANT_STOPWORDS.has(normalizedFragment)
      );
    })
    .join(" ")
    .trim();
}

function isStrictMedicationAllergyMatch(firstName: string, secondName: string): boolean {
  const firstIdentity = normalizeMedicationName(extractMedicationIdentityLabel(firstName));
  const secondIdentity = normalizeMedicationName(extractMedicationIdentityLabel(secondName));
  if (!firstIdentity || !secondIdentity) {
    return false;
  }

  if (firstIdentity === secondIdentity) {
    return true;
  }

  if (hasTokenBoundaryMatch(firstIdentity, secondIdentity) || hasTokenBoundaryMatch(secondIdentity, firstIdentity)) {
    return true;
  }

  return hasEquivalentMedicationIdentity(firstName, secondName);
}

function areMedicationTokensEquivalent(firstToken: string, secondToken: string): boolean {
  if (firstToken === secondToken) {
    return true;
  }

  if (firstToken.length >= 5 && secondToken.length >= 5) {
    return firstToken.startsWith(secondToken) || secondToken.startsWith(firstToken);
  }

  return false;
}

function hasEquivalentMedicationIdentity(firstName: string, secondName: string): boolean {
  const firstTokens = extractMedicationIdentityTokens(firstName);
  const secondTokens = extractMedicationIdentityTokens(secondName);
  if (firstTokens.length === 0 || secondTokens.length === 0) {
    return false;
  }

  if (firstTokens.length !== secondTokens.length) {
    return false;
  }

  const remainingSecondTokens = [...secondTokens];
  for (const firstToken of firstTokens) {
    const secondTokenIndex = remainingSecondTokens.findIndex((secondToken) =>
      areMedicationTokensEquivalent(firstToken, secondToken)
    );
    if (secondTokenIndex < 0) {
      return false;
    }
    remainingSecondTokens.splice(secondTokenIndex, 1);
  }

  return remainingSecondTokens.length === 0;
}

function extractTherapeuticClassCodes(input: string): string[] {
  const source = input.trim().toUpperCase();
  if (!source) {
    return [];
  }

  const firstChunk = source.split("-")[0] ?? source;
  const rawCandidates = firstChunk
    .split(/[;,|/ ]+/)
    .map((part) => part.replace(/[^A-Z0-9]/g, "").trim())
    .filter((part) => part.length >= 3)
    .filter((part) => /^[A-Z]\d[A-Z0-9]+$/.test(part));

  const collected = new Set<string>();
  for (const candidate of rawCandidates) {
    collected.add(candidate);
    if (candidate.length > 3) {
      collected.add(candidate.slice(0, 3));
    }
  }

  return Array.from(collected);
}

function hasTherapeuticClassCodeMatch(firstCodes: string[], secondCodes: string[]): boolean {
  if (firstCodes.length === 0 || secondCodes.length === 0) {
    return false;
  }

  const secondCodeSet = new Set(secondCodes);
  if (firstCodes.some((firstCode) => secondCodeSet.has(firstCode))) {
    return true;
  }

  const firstFamilySet = new Set(firstCodes.map((code) => code.slice(0, 3)));
  const secondFamilySet = new Set(secondCodes.map((code) => code.slice(0, 3)));
  for (const familyCode of firstFamilySet) {
    if (secondFamilySet.has(familyCode)) {
      return true;
    }
  }

  return false;
}

function hasConceptTermMatch(source: string, target: string): boolean {
  if (!source || !target) {
    return false;
  }

  if (source === target) {
    return true;
  }

  if (hasTokenBoundaryMatch(source, target) || hasTokenBoundaryMatch(target, source)) {
    return true;
  }

  if (target.length >= 5 && source.includes(target)) {
    return true;
  }

  const sourceTokens = extractConceptTokens(source);
  const targetTokens = extractConceptTokens(target);
  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return false;
  }

  return targetTokens.some((targetToken) =>
    sourceTokens.some((sourceToken) => {
      if (sourceToken === targetToken) {
        return true;
      }

      if (targetToken.length >= 4) {
        if (sourceToken.startsWith(targetToken) || targetToken.startsWith(sourceToken)) {
          return true;
        }
      }

      if (targetToken.length >= 5) {
        if (sourceToken.includes(targetToken) || targetToken.includes(sourceToken)) {
          return true;
        }
      }

      return false;
    })
  );
}

function buildAllergyConflictBadge(conflict: AllergyConflictResult): string {
  if (conflict.kind === "active-ingredient") {
    return `Alergia (contém: ${conflict.detail})`;
  }

  if (conflict.kind === "therapeutic-class") {
    return `Alergia a classe (${conflict.detail})`;
  }

  return `Alergia (${conflict.allergyName})`;
}

function normalizeHospitalDateTime(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const hour = Number(brMatch[4] ?? "0");
    const minute = Number(brMatch[5] ?? "0");
    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed.toISOString();
  }

  const directParsed = new Date(trimmed);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.toISOString();
  }

  return null;
}

function isRawPrescriptionStatusLine(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  if (normalizeHospitalDateTime(trimmed)) {
    return false;
  }

  return (
    !trimmed.includes(" - Administrar ") &&
    !trimmed.includes(";") &&
    !trimmed.includes("|") &&
    !/\d/.test(trimmed) &&
    trimmed.length <= 40
  );
}

function parseRawPrescriptionBlocks(rawInput: string): RawPrescriptionParsedBlock[] {
  const lines = rawInput
    .split("\n")
    .map((line, index) => ({
      lineNumber: index + 1,
      value: line.trim()
    }))
    .filter((line) => line.value.length > 0);

  const blocks: RawPrescriptionParsedBlock[] = [];
  let currentBlock: RawPrescriptionParsedBlock | null = null;

  const commitCurrentBlock = () => {
    if (!currentBlock) {
      return;
    }

    blocks.push(currentBlock);
    currentBlock = null;
  };

  for (const line of lines) {
    const tabParts = line.value
      .split("\t")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const isDateLine = Boolean(normalizeHospitalDateTime(line.value));
    const isStatusLine = isRawPrescriptionStatusLine(line.value);

    if (tabParts.length >= 4) {
      commitCurrentBlock();
      blocks.push({
        lineNumber: line.lineNumber,
        rawLine: line.value,
        prescriptionContent: tabParts[0] ?? line.value,
        validationStartRaw: tabParts[1] ?? "",
        validationEndRaw: tabParts[2] ?? "",
        validationStatus: tabParts[3] ?? "Validado"
      });
      continue;
    }

    if (!currentBlock && (isDateLine || isStatusLine)) {
      continue;
    }

    if (currentBlock) {
      if (!currentBlock.validationStartRaw && isDateLine) {
        currentBlock.validationStartRaw = line.value;
        currentBlock.rawLine = `${currentBlock.rawLine}\n${line.value}`;
        continue;
      }

      if (!currentBlock.validationEndRaw && isDateLine) {
        currentBlock.validationEndRaw = line.value;
        currentBlock.rawLine = `${currentBlock.rawLine}\n${line.value}`;
        continue;
      }

      if (!currentBlock.validationStatus && isStatusLine) {
        currentBlock.validationStatus = line.value;
        currentBlock.rawLine = `${currentBlock.rawLine}\n${line.value}`;
        continue;
      }

      if (isDateLine || isStatusLine) {
        continue;
      }
    }

    commitCurrentBlock();
    currentBlock = {
      lineNumber: line.lineNumber,
      rawLine: line.value,
      prescriptionContent: line.value,
      validationStartRaw: "",
      validationEndRaw: "",
      validationStatus: ""
    };
  }

  commitCurrentBlock();
  return blocks;
}

function inferRawPrescriptionSharedSet(
  blocks: RawPrescriptionParsedBlock[]
): { startAt: string; endAt: string; status: string } {
  const collectUniqueValues = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

  const starts = collectUniqueValues(blocks.map((block) => block.validationStartRaw.trim()));
  const ends = collectUniqueValues(blocks.map((block) => block.validationEndRaw.trim()));
  const statuses = collectUniqueValues(blocks.map((block) => block.validationStatus.trim()));

  return {
    startAt: starts.length === 1 && blocks.every((block) => block.validationStartRaw.trim()) ? starts[0] ?? "" : "",
    endAt: ends.length === 1 && blocks.every((block) => block.validationEndRaw.trim()) ? ends[0] ?? "" : "",
    status:
      statuses.length === 1 && blocks.every((block) => block.validationStatus.trim())
        ? (statuses[0] ?? "")
        : ""
  };
}

function isWithinPrescriptionValidity(startAt: string | null, endAt: string | null): boolean {
  if (!startAt || !endAt) {
    return false;
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  const now = Date.now();

  return now >= start && now <= end;
}

function areInpatientEntriesEquivalent(first: InpatientEntry, second: InpatientEntry): boolean {
  return (
    first.key === second.key &&
    first.patientId === second.patientId &&
    first.patientName === second.patientName &&
    first.chartNumber === second.chartNumber &&
    first.reportedAgeYears === second.reportedAgeYears &&
    first.admissionDate === second.admissionDate &&
    first.bed === second.bed &&
    first.teamName === second.teamName &&
    first.teamId === second.teamId &&
    first.source === second.source
  );
}

function upsertRecordById<T extends { id: number }>(records: T[], nextRecord: T): T[] {
  const existingIndex = records.findIndex((record) => record.id === nextRecord.id);
  if (existingIndex === -1) {
    return [nextRecord, ...records];
  }

  return records.map((record) => (record.id === nextRecord.id ? nextRecord : record));
}

function removeRecordById<T extends { id: number }>(records: T[], recordId: number): T[] {
  return records.filter((record) => record.id !== recordId);
}

function compareAdmissionRecency(first: AdmissionRecord | null, second: AdmissionRecord | null): number {
  if (!first && !second) {
    return 0;
  }
  if (!first) {
    return -1;
  }
  if (!second) {
    return 1;
  }

  const firstKey = `${first.admissionDate}|${first.createdAt}|${first.id}`;
  const secondKey = `${second.admissionDate}|${second.createdAt}|${second.id}`;
  return firstKey.localeCompare(secondKey);
}

function admissionToLatestMeasurement(admission: AdmissionRecord): LatestMeasurement | null {
  if (
    admission.weightKg === null ||
    admission.heightCm === null ||
    admission.bmi === null ||
    admission.bmiFormula === null ||
    admission.bodySurfaceArea === null ||
    admission.bsaFormula === null
  ) {
    return null;
  }

  return {
    weightKg: admission.weightKg,
    heightCm: admission.heightCm,
    bmi: admission.bmi,
    bmiFormula: admission.bmiFormula,
    bodySurfaceArea: admission.bodySurfaceArea,
    bsaFormula: admission.bsaFormula,
    recordedAt: admission.createdAt
  };
}

function mergePatientWithAdmission(patient: PatientRecord, admission: AdmissionRecord): PatientRecord {
  const shouldReplaceLatestAdmission = compareAdmissionRecency(admission, patient.latestAdmission) >= 0;
  const nextMeasurement = admissionToLatestMeasurement(admission);

  return {
    ...patient,
    latestAdmission: shouldReplaceLatestAdmission ? admission : patient.latestAdmission,
    latestMeasurement: nextMeasurement ?? patient.latestMeasurement
  };
}

function buildInpatientEntryFromAdmission(
  patient: PatientRecord,
  admission: AdmissionRecord,
  fallbackEntry?: InpatientEntry | null
): InpatientEntry {
  return {
    key: `patient-${patient.id}`,
    patientId: patient.id,
    patientName: patient.fullName,
    chartNumber: patient.chartNumber,
    reportedAgeYears: patient.ageYears,
    admissionDate: admission.admissionDate,
    bed: admission.bed,
    teamName: admission.teamName ?? fallbackEntry?.teamName ?? null,
    teamId: admission.teamId ?? fallbackEntry?.teamId ?? null,
    source: "active",
    createdAt: admission.createdAt
  };
}

export default function DashboardConsole({
  currentLogin,
  data,
  dbError
}: DashboardConsoleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDashboardTransitionPending, startDashboardTransition] = useTransition();
  const [dashboardTransitionLabel, setDashboardTransitionLabel] = useState("");
  const [patientDetailsCache, setPatientDetailsCache] = useState<Record<number, PatientDashboardDetails>>({});
  const [patientDetailsLoadingId, setPatientDetailsLoadingId] = useState<number | null>(null);
  const [patientDetailsError, setPatientDetailsError] = useState<string | null>(null);

  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>(() => data?.professionals ?? []);
  const [teams, setTeams] = useState<TeamRecord[]>(() => data?.teams ?? []);
  const [patients, setPatients] = useState<PatientRecord[]>(() => data?.patients ?? []);
  const [inpatientOverviewEntries, setInpatientOverviewEntries] = useState<InpatientEntry[]>(
    () => data?.inpatientOverviewEntries ?? []
  );
  const [recentAdmissions, setRecentAdmissions] = useState<AdmissionRecord[]>(() => data?.recentAdmissions ?? []);
  const [medications, setMedications] = useState(() => data?.medications ?? []);
  const [patientAllergies, setPatientAllergies] = useState<PatientAllergyRecord[]>(
    () => data?.patientAllergies ?? []
  );
  const [priorMedications, setPriorMedications] = useState<PriorMedicationRecord[]>(
    () => data?.priorMedications ?? []
  );
  const [examImports, setExamImports] = useState<PatientExamImportRecord[]>(() => data?.examImports ?? []);
  const [roundNotes, setRoundNotes] = useState<AdmissionRoundNoteRecord[]>(() => data?.roundNotes ?? []);
  const [prescriptions, setPrescriptions] = useState<MedicalPrescriptionRecord[]>(
    () => data?.prescriptions ?? []
  );
  const loadedPatientDetailsId = data?.loadedPatientDetailsId ?? null;
  const currentProfessional = data?.currentProfessional ?? null;
  const currentWorkflowEditorName = currentProfessional?.fullName ?? currentLogin;
  const currentWorkflowEditorLogin = currentProfessional?.login ?? currentLogin;
  const initialRouteSearch = searchParams.toString();
  const initialRouteSnapshot = useMemo(
    () => parseDashboardRouteSnapshot(searchParams),
    [initialRouteSearch, searchParams]
  );
  const [dashboardRouteSnapshot, setDashboardRouteSnapshot] = useState<DashboardRouteSnapshot>(
    () => initialRouteSnapshot
  );
  const searchPatientId = dashboardRouteSnapshot.patientId;
  const requestedPatientView = dashboardRouteSnapshot.patientView;
  const requestedSection = dashboardRouteSnapshot.section;
  const requestedInpatientMode = dashboardRouteSnapshot.inpatientMode;
  const patientPageMode = searchPatientId !== null;
  const persistedInpatientWorkflowPayload = useMemo(
    () => normalizeInpatientWorkflowStoragePayload(data?.inpatientWorkflowSnapshot),
    [data?.inpatientWorkflowSnapshot]
  );

  useEffect(() => {
    setProfessionals(data?.professionals ?? []);
  }, [data?.professionals]);

  useEffect(() => {
    setTeams(data?.teams ?? []);
  }, [data?.teams]);

  useEffect(() => {
    setPatients(data?.patients ?? []);
  }, [data?.patients]);

  useEffect(() => {
    setInpatientOverviewEntries(data?.inpatientOverviewEntries ?? []);
  }, [data?.inpatientOverviewEntries]);

  useEffect(() => {
    setRecentAdmissions(data?.recentAdmissions ?? []);
  }, [data?.recentAdmissions]);

  useEffect(() => {
    setMedications(data?.medications ?? []);
  }, [data?.medications]);

  useEffect(() => {
    setPatientAllergies(data?.patientAllergies ?? []);
  }, [data?.patientAllergies]);

  useEffect(() => {
    setPriorMedications(data?.priorMedications ?? []);
  }, [data?.priorMedications]);

  useEffect(() => {
    setExamImports(data?.examImports ?? []);
  }, [data?.examImports]);

  useEffect(() => {
    setRoundNotes(data?.roundNotes ?? []);
  }, [data?.roundNotes]);

  useEffect(() => {
    setPrescriptions(data?.prescriptions ?? []);
  }, [data?.prescriptions]);

  useEffect(() => {
    setDashboardRouteSnapshot((current) => {
      if (
        current.patientId === initialRouteSnapshot.patientId &&
        current.patientView === initialRouteSnapshot.patientView &&
        current.section === initialRouteSnapshot.section &&
        current.inpatientMode === initialRouteSnapshot.inpatientMode
      ) {
        return current;
      }

      return initialRouteSnapshot;
    });
  }, [initialRouteSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setDashboardRouteSnapshot(parseDashboardRouteSnapshot(new URLSearchParams(window.location.search)));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (
      (requestedSection !== "interventions" && requestedSection !== "validated-medications") ||
      data?.loadedPatientDetailsId !== null
    ) {
      return;
    }

    setInterventionReportPrescriptions(data?.prescriptions ?? []);
  }, [data?.loadedPatientDetailsId, data?.prescriptions, requestedSection]);

  const [activeSection, setActiveSection] = useState<DashboardSectionId | null>(
    patientPageMode ? "inpatients" : requestedSection
  );
  const [listVisibility, setListVisibility] = useState<Record<DashboardSectionId, boolean>>({
    professional: false,
    team: false,
    patient: false,
    interventions: false,
    "validated-medications": false,
    inpatients: true,
    medication: false
  });

  const [professionalForm, setProfessionalForm] = useState({
    fullName: "",
    profession: "Farmacêutico" as ProfessionOption,
    isTrainee: false,
    supervisingPharmacistId: "",
    councilType: "CRF" as CouncilOption,
    councilNumber: "",
    stateUf: "RS",
    login: "",
    password: "",
    institution: ""
  });
  const [editingProfessionalId, setEditingProfessionalId] = useState<number | null>(null);
  const [professionalFeedback, setProfessionalFeedback] = useState<FeedbackState>(null);
  const [professionalLoading, setProfessionalLoading] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamFeedback, setTeamFeedback] = useState<FeedbackState>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const [patientForm, setPatientForm] = useState({
    fullName: "",
    chartNumber: "",
    birthDate: "",
    sex: "" as PatientSex | "",
    allergies: [] as string[]
  });
  const [patientFeedback, setPatientFeedback] = useState<FeedbackState>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const [patientInitialAllergyForm, setPatientInitialAllergyForm] = useState({
    medicationId: medications[0] ? String(medications[0].id) : ""
  });

  const [admissionForm, setAdmissionForm] = useState(createEmptyAdmissionFormState);
  const [admissionFeedback, setAdmissionFeedback] = useState<FeedbackState>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);
  const [roundSummaryFeedback, setRoundSummaryFeedback] = useState<FeedbackState>(null);
  const [roundSummaryLoading, setRoundSummaryLoading] = useState(false);
  const [evolutionFeedback, setEvolutionFeedback] = useState<FeedbackState>(null);

  const [medicationForm, setMedicationForm] = useState({
    name: "",
    defaultUnit: "mg",
    activeIngredients: "",
    therapeuticClass: "",
    searchAliases: ""
  });
  const [medicationBulkInput, setMedicationBulkInput] = useState("");
  const [medicationBulkDefaultUnit, setMedicationBulkDefaultUnit] = useState("mg");
  const [medicationFeedback, setMedicationFeedback] = useState<FeedbackState>(null);
  const [medicationLoading, setMedicationLoading] = useState(false);
  const [medicationBulkLoading, setMedicationBulkLoading] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    searchPatientId ?? (patients[0] ? String(patients[0].id) : "")
  );
  const [inpatientSearch, setInpatientSearch] = useState("");
  const [inpatientOverviewMode, setInpatientOverviewMode] =
    useState<InpatientOverviewMode>(requestedInpatientMode);
  const [inpatientTeamFilter, setInpatientTeamFilter] = useState("all");
  const [mandatoryRawInput, setMandatoryRawInput] = useState("");
  const [mandatoryFeedback, setMandatoryFeedback] = useState<FeedbackState>(null);
  const [mandatoryLoading, setMandatoryLoading] = useState(false);
  const [mandatoryEvolutionPreviewLoadingKey, setMandatoryEvolutionPreviewLoadingKey] = useState<
    string | null
  >(null);
  const [mandatoryEvolutionPreview, setMandatoryEvolutionPreview] =
    useState<MandatoryEvolutionPreviewState | null>(null);
  const [workflowByInpatientKey, setWorkflowByInpatientKey] = useState<
    Record<string, InpatientWorkflowState>
  >(() => persistedInpatientWorkflowPayload.workflowByKey);
  const [trackedInpatientEntries, setTrackedInpatientEntries] = useState<InpatientEntry[]>(
    () => persistedInpatientWorkflowPayload.trackedEntries
  );
  const [priorityTeamIds, setPriorityTeamIds] = useState<number[]>(
    () => persistedInpatientWorkflowPayload.priorityTeamIds
  );
  const [patientPageOverride, setPatientPageOverride] = useState<boolean | null>(null);
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(patientPageMode);
  const [patientView, setPatientView] = useState<PatientViewId>(
    patientPageMode ? requestedPatientView : "allergies"
  );
  const effectivePatientPageMode = patientPageOverride ?? patientPageMode;
  const [interventionReportForm, setInterventionReportForm] = useState<InterventionReportFormState>({
    startDate: getCurrentMonthStartFormattedDateValue(),
    endDate: getCurrentFormattedDateValue()
  });
  const [appliedInterventionReportRange, setAppliedInterventionReportRange] =
    useState<InterventionReportFormState>({
      startDate: getCurrentMonthStartFormattedDateValue(),
      endDate: getCurrentFormattedDateValue()
    });
  const [interventionReportPrescriptions, setInterventionReportPrescriptions] = useState<
    MedicalPrescriptionRecord[]
  >(() =>
    data?.loadedPatientDetailsId === null &&
    (requestedSection === "interventions" || requestedSection === "validated-medications")
      ? data?.prescriptions ?? []
      : []
  );
  const [interventionReportFeedback, setInterventionReportFeedback] = useState<FeedbackState>(null);
  const [interventionReportLoading, setInterventionReportLoading] = useState(false);
  const [validatedMedicationReportForm, setValidatedMedicationReportForm] =
    useState<InterventionReportFormState>({
      startDate: getCurrentMonthStartFormattedDateValue(),
      endDate: getCurrentFormattedDateValue()
    });
  const [appliedValidatedMedicationReportRange, setAppliedValidatedMedicationReportRange] =
    useState<InterventionReportFormState>({
      startDate: getCurrentMonthStartFormattedDateValue(),
      endDate: getCurrentFormattedDateValue()
    });
  const [validatedMedicationReportFeedback, setValidatedMedicationReportFeedback] =
    useState<FeedbackState>(null);
  const [selectedPatientProfileForm, setSelectedPatientProfileForm] = useState({
    birthDate: "",
    sex: "" as PatientSex | ""
  });
  const [showAllergyComposer, setShowAllergyComposer] = useState(false);
  const [showAdmissionSummaryComposer, setShowAdmissionSummaryComposer] = useState(false);
  const [showAdmissionSummaryPreview, setShowAdmissionSummaryPreview] = useState(false);
  const [interviewEvolutionIncludeTitles, setInterviewEvolutionIncludeTitles] = useState(true);
  const [prescriptionMode, setPrescriptionMode] = useState<PrescriptionMode>("view");
  const [selectedPrescriptionGroupKey, setSelectedPrescriptionGroupKey] = useState("");
  const [selectedPrescriptionMedicationHistory, setSelectedPrescriptionMedicationHistory] = useState<{
    medicationId: number | null;
    medicationName: string;
    externalValidationCandidate: boolean;
  } | null>(null);

  const [allergyForm, setAllergyForm] = useState({
    query: "",
    selectedValue: "",
    reactionDescription: ""
  });
  const [allergyFeedback, setAllergyFeedback] = useState<FeedbackState>(null);
  const [allergyLoading, setAllergyLoading] = useState(false);
  const [allergyEditingId, setAllergyEditingId] = useState<number | null>(null);
  const [allergyEditReactionDescription, setAllergyEditReactionDescription] = useState("");
  const [allergyUpdatingId, setAllergyUpdatingId] = useState<number | null>(null);
  const [allergyRemovingId, setAllergyRemovingId] = useState<number | null>(null);

  const [priorMedicationForm, setPriorMedicationForm] = useState({
    medicationId: "",
    medicationName: "",
    dose: "",
    doseUnit: medications[0]?.defaultUnit ?? "mg",
    frequency: "",
    shifts: "",
    quantityTablets: "",
    lotNumber: "",
    expirationDate: "",
    manufacturer: ""
  });
  const [manualPriorMedicationOptions, setManualPriorMedicationOptions] = useState<string[]>([]);
  const [priorMedicationFeedback, setPriorMedicationFeedback] = useState<FeedbackState>(null);
  const [priorMedicationLoading, setPriorMedicationLoading] = useState(false);
  const [priorMedicationRemovingId, setPriorMedicationRemovingId] = useState<number | null>(null);
  const [priorMedicationUpdatingId, setPriorMedicationUpdatingId] = useState<number | null>(null);
  const [priorMedicationBatchSaving, setPriorMedicationBatchSaving] = useState(false);
  const [priorMedicationReconciliationForm, setPriorMedicationReconciliationForm] = useState<
    Record<number, PriorMedicationReconciliationFormState>
  >({});
  const [medicationValidationUpdatingId, setMedicationValidationUpdatingId] = useState<number | null>(null);
  const [medicationValidationBatchSaving, setMedicationValidationBatchSaving] = useState(false);
  const [medicationValidationForm, setMedicationValidationForm] = useState<
    Record<number, StockValidationFormState>
  >({});
  const [prescriptionInterventionOpenId, setPrescriptionInterventionOpenId] = useState<number | null>(
    null
  );
  const [prescriptionInterventionSavingId, setPrescriptionInterventionSavingId] = useState<number | null>(
    null
  );
  const [prescriptionFeedback, setPrescriptionFeedback] = useState<FeedbackState>(null);
  const [rawPrescriptionInput, setRawPrescriptionInput] = useState("");
  const [rawPrescriptionDrafts, setRawPrescriptionDrafts] = useState<RawPrescriptionDraft[]>([]);
  const [rawPrescriptionFeedback, setRawPrescriptionFeedback] = useState<FeedbackState>(null);
  const [rawPrescriptionLoading, setRawPrescriptionLoading] = useState(false);
  const admissionSummaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [admissionSummarySelection, setAdmissionSummarySelection] = useState("");
  const examPdfInputRef = useRef<HTMLInputElement | null>(null);
  const [examImportLoading, setExamImportLoading] = useState(false);
  const [examImportFeedback, setExamImportFeedback] = useState<FeedbackState>(null);
  const [examImportResult, setExamImportResult] = useState<ExtractedExamImportResult | null>(null);
  const [selectedExamImportId, setSelectedExamImportId] = useState("");
  const [selectedExamImportDetails, setSelectedExamImportDetails] =
    useState<PatientExamImportRecord | null>(null);
  const [selectedExamImportDetailsLoading, setSelectedExamImportDetailsLoading] = useState(false);
  const [examImportRemovingId, setExamImportRemovingId] = useState<number | null>(null);
  const [examRecordRemovingKey, setExamRecordRemovingKey] = useState<string | null>(null);
  const [inpatientWorkflowPersistenceReady, setInpatientWorkflowPersistenceReady] = useState(false);
  const lastPersistedInpatientWorkflowRef = useRef(
    JSON.stringify(persistedInpatientWorkflowPayload)
  );

  useEffect(() => {
    if (activeSection !== "patient") {
      return;
    }

    if (patients.length === 0) {
      setSelectedPatientId("");
      return;
    }

    const hasSelectedPatient = patients.some((patient) => String(patient.id) === selectedPatientId);
    if (!hasSelectedPatient) {
      setSelectedPatientId(String(patients[0].id));
    }
  }, [activeSection, patients, selectedPatientId]);

  useEffect(() => {
    if (patientPageMode && patientPageOverride !== false) {
      setActiveSection("inpatients");
      setInpatientOverviewMode(requestedInpatientMode);
      setPatientView(requestedPatientView);
      setPatientDetailsOpen(true);
      if (searchPatientId && searchPatientId !== selectedPatientId) {
        setSelectedPatientId(searchPatientId);
      }
      return;
    }

    setActiveSection(requestedSection);
    setInpatientOverviewMode(requestedInpatientMode);
    setPatientView(requestedPatientView);
  }, [
    patientPageMode,
    requestedInpatientMode,
    requestedPatientView,
    requestedSection,
    patientPageOverride,
    selectedPatientId,
    searchPatientId
  ]);

  useEffect(() => {
    if (patientPageOverride === null) {
      return;
    }

    if (patientPageOverride === patientPageMode) {
      setPatientPageOverride(null);
    }
  }, [patientPageMode, patientPageOverride]);

  useEffect(() => {
    if (medications.length === 0) {
      setPatientInitialAllergyForm({ medicationId: "" });
      return;
    }

    const hasMedication = medications.some(
      (medication) => String(medication.id) === patientInitialAllergyForm.medicationId
    );
    if (!hasMedication) {
      setPatientInitialAllergyForm({ medicationId: String(medications[0].id) });
    }
  }, [medications, patientInitialAllergyForm.medicationId]);

  const agePreview = useMemo(() => calculateAge(patientForm.birthDate), [patientForm.birthDate]);
  const pharmacistSupervisorOptions = useMemo(
    () =>
      professionals.filter(
        (professional) => professional.profession === "Farmacêutico" && !professional.isTrainee
      ),
    [professionals]
  );
  const currentProfessionalSignatureLines = useMemo(
    () => buildProfessionalSignatureLines(currentProfessional, currentLogin),
    [currentLogin, currentProfessional]
  );
  const responsibleProfessionalName = currentProfessional?.fullName ?? currentLogin;
  const inpatientWorkflowStorageKey = useMemo(
    () => buildInpatientWorkflowStorageKey(currentLogin),
    [currentLogin]
  );
  const admissionPreview = useMemo(() => {
    const weight = Number(admissionForm.weightKg);
    const height = Number(admissionForm.heightCm);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) {
      return null;
    }

    return calculateClinicalIndexes(weight, height, admissionForm.bmiFormula, admissionForm.bsaFormula);
  }, [
    admissionForm.weightKg,
    admissionForm.heightCm,
    admissionForm.bmiFormula,
    admissionForm.bsaFormula
  ]);

  const selectedBmiFormula = BMI_FORMULA_OPTIONS.find(
    (formula) => formula.id === admissionForm.bmiFormula
  );
  const selectedBsaFormula = BSA_FORMULA_OPTIONS.find(
    (formula) => formula.id === admissionForm.bsaFormula
  );

  const selectedPatientNumericId = Number(selectedPatientId);
  const selectedPatientCachedDetails =
    Number.isInteger(selectedPatientNumericId) && selectedPatientNumericId > 0
      ? patientDetailsCache[selectedPatientNumericId] ?? null
      : null;
  const selectedPatient =
    selectedPatientCachedDetails?.patient ??
    (Number.isInteger(selectedPatientNumericId) && selectedPatientNumericId > 0
      ? patients.find((patient) => patient.id === selectedPatientNumericId) ?? null
      : null);
  const hasSelectedPatientDetailsLoaded = selectedPatientCachedDetails !== null;
  const selectedPatientBirthDate = normalizeAdmissionDateValue(selectedPatientProfileForm.birthDate) ?? "";
  const selectedPatientAgePreview = useMemo(
    () => calculateAge(selectedPatientBirthDate),
    [selectedPatientBirthDate]
  );

  useEffect(() => {
    if (
      loadedPatientDetailsId === null ||
      !patients.some((patient) => patient.id === loadedPatientDetailsId)
    ) {
      return;
    }

    const loadedPatient = patients.find((patient) => patient.id === loadedPatientDetailsId);
    if (!loadedPatient) {
      return;
    }

    setPatientDetailsCache((current) => ({
      ...current,
      [loadedPatientDetailsId]: {
        patient: loadedPatient,
        admissions: recentAdmissions,
        allergies: patientAllergies,
        priorMedications,
        examImports,
        roundNotes,
        prescriptions
      }
    }));
  }, [
    examImports,
    loadedPatientDetailsId,
    patientAllergies,
    patients,
    prescriptions,
    priorMedications,
    roundNotes,
    recentAdmissions
  ]);

  useEffect(() => {
    setPatientDetailsError(null);
  }, [selectedPatientId]);

  useEffect(() => {
    if (activeSection !== "interventions" && activeSection !== "validated-medications") {
      return;
    }

    let isCancelled = false;
    setInterventionReportLoading(true);
    if (activeSection === "interventions") {
      setInterventionReportFeedback(null);
    } else {
      setValidatedMedicationReportFeedback(null);
    }

    void fetch("/api/interventions")
      .then(async (response) => {
        const result = (await response.json()) as {
          message?: string;
          prescriptions?: MedicalPrescriptionRecord[];
        };

        if (!response.ok || !Array.isArray(result.prescriptions)) {
          throw new Error(
            result.message ??
              (activeSection === "validated-medications"
                ? "Falha ao carregar os medicamentos validados."
                : "Falha ao carregar as intervenções.")
          );
        }

        if (isCancelled) {
          return;
        }

        setInterventionReportPrescriptions(result.prescriptions);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        const feedback: FeedbackState = {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : activeSection === "validated-medications"
                ? "Falha ao carregar os medicamentos validados."
                : "Falha ao carregar as intervenções."
        };

        if (activeSection === "validated-medications") {
          setValidatedMedicationReportFeedback(feedback);
        } else {
          setInterventionReportFeedback(feedback);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setInterventionReportLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeSection]);

  useEffect(() => {
    if (!patientDetailsOpen || !Number.isInteger(selectedPatientNumericId) || selectedPatientNumericId <= 0) {
      return;
    }

    if (patientDetailsCache[selectedPatientNumericId]) {
      return;
    }

    void loadPatientDetails(selectedPatientNumericId);
  }, [patientDetailsCache, patientDetailsOpen, selectedPatientNumericId]);

  const inpatients = useMemo<InpatientEntry[]>(() => {
    if (inpatientOverviewEntries.length > 0) {
      return inpatientOverviewEntries;
    }

    const uniquePatients = new Map<number, InpatientEntry>();

    for (const admission of recentAdmissions) {
      if (!uniquePatients.has(admission.patientId)) {
        uniquePatients.set(admission.patientId, {
          key: `patient-${admission.patientId}`,
          patientId: admission.patientId,
          patientName: admission.patientName,
          chartNumber: admission.chartNumber,
          reportedAgeYears: patients.find((patient) => patient.id === admission.patientId)?.ageYears ?? null,
          admissionDate: admission.admissionDate,
          bed: admission.bed,
          teamName: admission.teamName,
          teamId: admission.teamId,
          source: "active",
          createdAt: admission.createdAt
        });
      }
    }

    return Array.from(uniquePatients.values());
  }, [inpatientOverviewEntries, patients, recentAdmissions]);

  const filteredInpatients = useMemo(() => {
    const searchTerm = normalizeSearchValue(inpatientSearch);
    if (!searchTerm) {
      return inpatients;
    }

    return inpatients.filter((inpatient) =>
      normalizeSearchValue(
        `${inpatient.patientName} ${inpatient.chartNumber} ${inpatient.admissionDate} ${formatAdmissionDateValue(
          inpatient.admissionDate
        )} ${inpatient.bed} ${inpatient.teamName ?? ""}`
      ).includes(searchTerm)
    );
  }, [inpatients, inpatientSearch]);

  const activeInpatientByPatientId = useMemo(() => {
    const lookup = new Map<number, InpatientEntry>();

    for (const entry of inpatients) {
      if (entry.patientId !== null && !lookup.has(entry.patientId)) {
        lookup.set(entry.patientId, entry);
      }
    }

    return lookup;
  }, [inpatients]);

  useEffect(() => {
    const hasServerSnapshot =
      Object.keys(persistedInpatientWorkflowPayload.workflowByKey).length > 0 ||
      persistedInpatientWorkflowPayload.trackedEntries.length > 0 ||
      persistedInpatientWorkflowPayload.priorityTeamIds.length > 0;

    if (hasServerSnapshot) {
      lastPersistedInpatientWorkflowRef.current = JSON.stringify(persistedInpatientWorkflowPayload);
      setInpatientWorkflowPersistenceReady(true);
      return;
    }

    if (typeof window === "undefined") {
      setInpatientWorkflowPersistenceReady(true);
      return;
    }

    try {
      window.localStorage.removeItem(inpatientWorkflowStorageKey);
    } catch {
      // ignore local cleanup errors and keep the server snapshot/default state
    } finally {
      setInpatientWorkflowPersistenceReady(true);
    }
  }, [inpatientWorkflowStorageKey, persistedInpatientWorkflowPayload]);

  useEffect(() => {
    if (inpatients.length === 0) {
      return;
    }

    setTrackedInpatientEntries((current) => {
      const nextByKey = new Map(current.map((entry) => [entry.key, entry]));
      let hasChanges = false;

      for (const inpatient of inpatients) {
        const currentEntry = nextByKey.get(inpatient.key);
        if (currentEntry && !areInpatientEntriesEquivalent(currentEntry, inpatient)) {
          nextByKey.set(inpatient.key, inpatient);
          hasChanges = true;
        }
      }

      return hasChanges ? Array.from(nextByKey.values()) : current;
    });

    setWorkflowByInpatientKey((current) => {
      const next = { ...current };
      let hasChanges = false;

      for (const inpatient of inpatients) {
        const existingWorkflow = next[inpatient.key];
        if (!existingWorkflow) {
          continue;
        }

        if (existingWorkflow.assignedTeamId === null && inpatient.teamId !== null) {
          next[inpatient.key] = {
            ...existingWorkflow,
            assignedTeamId: inpatient.teamId,
            updatedAt: existingWorkflow.updatedAt || new Date().toISOString()
          };
          hasChanges = true;
        }
      }

      return hasChanges ? next : current;
    });
  }, [inpatients]);

  useEffect(() => {
    setPriorityTeamIds((current) => current.filter((teamId) => teams.some((team) => team.id === teamId)));
  }, [teams]);

  useEffect(() => {
    if (trackedInpatientEntries.length === 0 || patients.length === 0) {
      return;
    }

    setTrackedInpatientEntries((current) => {
      let hasChanges = false;

      const nextEntries = current.map((entry) => {
        const normalizedChart = normalizeSearchValue(entry.chartNumber);
        const normalizedName = normalizeSearchValue(entry.patientName);
        const matchedPatient = patients.find((patient) => {
          const patientChart = normalizeSearchValue(patient.chartNumber);
          const patientName = normalizeSearchValue(patient.fullName);

          return (
            (normalizedChart.length > 0 && patientChart === normalizedChart) ||
            (normalizedName.length > 0 && patientName === normalizedName)
          );
        });

        if (!matchedPatient) {
          return entry;
        }

        if (
          entry.patientId === matchedPatient.id &&
          entry.patientName === matchedPatient.fullName &&
          entry.chartNumber === matchedPatient.chartNumber &&
          entry.reportedAgeYears === matchedPatient.ageYears
        ) {
          return entry;
        }

        hasChanges = true;
        return {
          ...entry,
          patientId: matchedPatient.id,
          patientName: matchedPatient.fullName,
          chartNumber: matchedPatient.chartNumber,
          reportedAgeYears: matchedPatient.ageYears
        };
      });

      return hasChanges ? nextEntries : current;
    });
  }, [patients, trackedInpatientEntries.length]);

  useEffect(() => {
    if (!inpatientWorkflowPersistenceReady || typeof window === "undefined") {
      return;
    }

    const payload: InpatientWorkflowStoragePayload = {
      workflowByKey: workflowByInpatientKey,
      trackedEntries: trackedInpatientEntries,
      priorityTeamIds
    };
    window.localStorage.setItem(inpatientWorkflowStorageKey, JSON.stringify(payload));

    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === lastPersistedInpatientWorkflowRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/inpatients/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: serializedPayload
      }).then((response) => {
        if (response.ok) {
          lastPersistedInpatientWorkflowRef.current = serializedPayload;
        }
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    workflowByInpatientKey,
    trackedInpatientEntries,
    priorityTeamIds,
    inpatientWorkflowPersistenceReady,
    inpatientWorkflowStorageKey
  ]);

  useEffect(() => {
    const selectableInpatients = [...trackedInpatientEntries, ...inpatients].filter(
      (entry) => entry.patientId !== null
    );

    if (selectableInpatients.length === 0) {
      return;
    }

    const hasSelectedInpatient = selectableInpatients.some(
      (inpatient) => String(inpatient.patientId) === selectedPatientId
    );
    if (!hasSelectedInpatient) {
      setSelectedPatientId(String(selectableInpatients[0].patientId ?? ""));
      setPatientDetailsOpen(false);
    }
  }, [inpatients, selectedPatientId, trackedInpatientEntries]);

  const groupedTeamOptions = useMemo<TeamGroupOption[]>(() => {
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        records: TeamRecord[];
      }
    >();

    for (const team of teams) {
      const identity = resolveTeamGroupIdentity(team.name);
      if (!identity) {
        continue;
      }

      const currentGroup = groups.get(identity.key);
      if (currentGroup) {
        currentGroup.records.push(team);
      } else {
        groups.set(identity.key, {
          key: identity.key,
          label: identity.label,
          records: [team]
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => {
        const normalizedLabel = normalizeTeamAlias(group.label);
        const representativeRecord =
          group.records.find((record) => normalizeTeamAlias(record.name) === normalizedLabel) ??
          [...group.records].sort((first, second) => first.id - second.id)[0];

        return {
          key: group.key,
          label: group.label,
          representativeTeamId: representativeRecord.id,
          memberTeamIds: group.records.map((record) => record.id)
        };
      })
      .sort((first, second) => first.label.localeCompare(second.label, "pt-BR"));
  }, [teams]);

  const teamGroupById = useMemo(() => {
    const lookup = new Map<number, TeamGroupOption>();
    for (const group of groupedTeamOptions) {
      for (const teamId of group.memberTeamIds) {
        lookup.set(teamId, group);
      }
    }
    return lookup;
  }, [groupedTeamOptions]);

  const canonicalTeamIdById = useMemo(() => {
    const lookup = new Map<number, number>();
    for (const group of groupedTeamOptions) {
      for (const teamId of group.memberTeamIds) {
        lookup.set(teamId, group.representativeTeamId);
      }
    }
    return lookup;
  }, [groupedTeamOptions]);

  useEffect(() => {
    setWorkflowByInpatientKey((current) => {
      let hasChanges = false;
      const nextEntries = Object.fromEntries(
        Object.entries(current).map(([entryKey, workflow]) => {
          const nextWorkflow: InpatientWorkflowState =
            workflow.updatedByProfessionalName && workflow.updatedByProfessionalLogin
              ? workflow
              : {
                  ...workflow,
                  updatedByProfessionalName:
                    workflow.updatedByProfessionalName ?? currentWorkflowEditorName,
                  updatedByProfessionalLogin:
                    workflow.updatedByProfessionalLogin ?? currentWorkflowEditorLogin
                };

          if (nextWorkflow !== workflow) {
            hasChanges = true;
          }

          return [entryKey, nextWorkflow];
        })
      );

      return hasChanges ? nextEntries : current;
    });
  }, [currentWorkflowEditorLogin, currentWorkflowEditorName]);

  useEffect(() => {
    if (inpatientTeamFilter === "all" || inpatientTeamFilter === "without-team") {
      return;
    }

    const hasMatchingGroup = groupedTeamOptions.some((group) => group.key === inpatientTeamFilter);
    if (!hasMatchingGroup) {
      setInpatientTeamFilter("all");
    }
  }, [groupedTeamOptions, inpatientTeamFilter]);

  function resolveInpatientWorkflow(entry: InpatientEntry): InpatientWorkflowState {
    const workflow = workflowByInpatientKey[entry.key];
    if (workflow) {
      return {
        ...workflow,
        updatedByProfessionalName: workflow.updatedByProfessionalName ?? currentWorkflowEditorName,
        updatedByProfessionalLogin: workflow.updatedByProfessionalLogin ?? currentWorkflowEditorLogin
      };
    }

    return {
      status: "Pendente",
      assignedTeamId: entry.teamId ?? null,
      mandatory: true,
      firstVisitCompletedAt: null,
      evolutionGeneratedAt: null,
      updatedByProfessionalName: currentWorkflowEditorName,
      updatedByProfessionalLogin: currentWorkflowEditorLogin,
      updatedAt: entry.createdAt
    };
  }

  const inpatientEntries = useMemo(() => {
    const entriesByIdentity = new Map<string, InpatientEntry>();

    for (const entry of [...trackedInpatientEntries, ...inpatients]) {
      const identity = getInpatientEntryIdentity(entry);

      const currentEntry = entriesByIdentity.get(identity);
      if (!currentEntry) {
        entriesByIdentity.set(identity, entry);
        continue;
      }

      const shouldReplaceCurrent =
        (currentEntry.source !== "active" && entry.source === "active") ||
        (currentEntry.patientId === null && entry.patientId !== null);

      if (shouldReplaceCurrent) {
        entriesByIdentity.set(identity, {
          ...entry,
          reportedAgeYears: entry.reportedAgeYears ?? currentEntry.reportedAgeYears
        });
        continue;
      }

      if (currentEntry.reportedAgeYears === null && entry.reportedAgeYears !== null) {
        entriesByIdentity.set(identity, {
          ...currentEntry,
          reportedAgeYears: entry.reportedAgeYears
        });
      }
    }

    return Array.from(entriesByIdentity.values());
  }, [trackedInpatientEntries, inpatients]);

  const trackedInpatientEntryIdentities = useMemo(
    () => new Set(trackedInpatientEntries.map((entry) => getInpatientEntryIdentity(entry))),
    [trackedInpatientEntries]
  );

  const inpatientEntriesWithWorkflow = useMemo(
    () =>
      inpatientEntries.map((entry) => {
        const workflow = resolveInpatientWorkflow(entry);
        const assignedTeamGroup =
          workflow.assignedTeamId !== null ? teamGroupById.get(workflow.assignedTeamId) ?? null : null;
        const assignedTeamName =
          assignedTeamGroup?.label ??
          (entry.teamName && entry.teamName.trim().length > 0
            ? formatCanonicalTeamName(entry.teamName)
            : null);
        return {
          entry,
          workflow,
          assignedTeamName,
          assignedTeamGroupKey: assignedTeamGroup?.key ?? null
        };
      }),
    [inpatientEntries, teamGroupById, workflowByInpatientKey]
  );

  const selectedInpatientEntry = useMemo(
    () =>
      selectedPatient !== null
        ? inpatientEntries.find((entry) => entry.patientId === selectedPatient.id) ?? null
        : null,
    [inpatientEntries, selectedPatient]
  );

  const teamOverviewRows = useMemo(() => {
    const filtered = inpatientEntriesWithWorkflow
      .filter(({ workflow }) => workflow.status !== "Alta")
      .filter(({ workflow, assignedTeamGroupKey }) => {
        if (inpatientTeamFilter === "all") {
          return true;
        }
        if (inpatientTeamFilter === "without-team") {
          return workflow.assignedTeamId === null;
        }
        return assignedTeamGroupKey === inpatientTeamFilter;
      });

    return filtered.sort((first, second) => {
      const firstTeam = first.assignedTeamName ?? "Sem equipe";
      const secondTeam = second.assignedTeamName ?? "Sem equipe";
      const teamComparison = firstTeam.localeCompare(secondTeam, "pt-BR");
      if (teamComparison !== 0) {
        return teamComparison;
      }

      return first.entry.patientName.localeCompare(second.entry.patientName, "pt-BR");
    });
  }, [inpatientEntriesWithWorkflow, inpatientTeamFilter]);

  const mandatoryOverviewRows = useMemo(
    () => {
      return inpatientEntriesWithWorkflow
        .filter(
          ({ entry, workflow }) =>
            trackedInpatientEntryIdentities.has(getInpatientEntryIdentity(entry)) &&
            workflow.mandatory &&
            workflow.status !== "Alta"
        )
        .sort((first, second) => {
          const firstPriority = first.workflow.firstVisitCompletedAt ? 1 : 0;
          const secondPriority = second.workflow.firstVisitCompletedAt ? 1 : 0;
          if (firstPriority !== secondPriority) {
            return firstPriority - secondPriority;
          }

          return first.entry.patientName.localeCompare(second.entry.patientName, "pt-BR");
        });
    },
    [inpatientEntriesWithWorkflow, trackedInpatientEntryIdentities]
  );

  const dischargedOverviewRows = useMemo(
    () =>
      inpatientEntriesWithWorkflow
        .filter(({ workflow }) => workflow.status === "Alta")
        .sort((first, second) => {
          const firstUpdated = new Date(first.workflow.updatedAt).getTime();
          const secondUpdated = new Date(second.workflow.updatedAt).getTime();
          return secondUpdated - firstUpdated;
        }),
    [inpatientEntriesWithWorkflow]
  );

  const inpatientSidebarIndicators = useMemo(
    () => ({
      all: inpatients.length,
      team: teamOverviewRows.length,
      mandatory: mandatoryOverviewRows.length,
      discharged: dischargedOverviewRows.length
    }),
    [dischargedOverviewRows.length, inpatients.length, mandatoryOverviewRows.length, teamOverviewRows.length]
  );

  const interventionReportRows = useMemo(() => {
    const startDate = normalizeAdmissionDateValue(appliedInterventionReportRange.startDate);
    const endDate = normalizeAdmissionDateValue(appliedInterventionReportRange.endDate);
    if (!startDate || !endDate) {
      return [];
    }

    const rangeStart = new Date(`${startDate}T00:00:00`).getTime();
    const rangeEnd = new Date(`${endDate}T23:59:59`).getTime();

    return interventionReportPrescriptions
      .filter((prescription) => hasPrescriptionIntervention(prescription))
      .filter((prescription) => {
        const referenceTimestamp = new Date(
          prescription.interventionRecordedAt ?? prescription.createdAt
        ).getTime();
        return referenceTimestamp >= rangeStart && referenceTimestamp <= rangeEnd;
      })
      .sort((first, second) => {
        const firstTimestamp = new Date(
          first.interventionRecordedAt ?? first.createdAt
        ).getTime();
        const secondTimestamp = new Date(
          second.interventionRecordedAt ?? second.createdAt
        ).getTime();
        return secondTimestamp - firstTimestamp;
      });
  }, [
    appliedInterventionReportRange.endDate,
    appliedInterventionReportRange.startDate,
    interventionReportPrescriptions
  ]);

  const interventionSidebarIndicator = useMemo(
    () =>
      interventionReportPrescriptions.filter((prescription) => hasPrescriptionIntervention(prescription))
        .length,
    [interventionReportPrescriptions]
  );

  const validatedMedicationReportRows = useMemo(() => {
    const startDate = normalizeAdmissionDateValue(appliedValidatedMedicationReportRange.startDate);
    const endDate = normalizeAdmissionDateValue(appliedValidatedMedicationReportRange.endDate);
    if (!startDate || !endDate) {
      return [];
    }

    const rangeStart = new Date(`${startDate}T00:00:00`).getTime();
    const rangeEnd = new Date(`${endDate}T23:59:59`).getTime();

    return interventionReportPrescriptions
      .filter((prescription) => isPrescriptionMedicationValidationCandidate(prescription))
      .filter((prescription) => hasPrescriptionStockValidation(prescription))
      .map((prescription) => {
        const dailyTabletUse = calculateDailyTabletUse({
          dose: prescription.dose,
          doseUnit: prescription.doseUnit,
          frequency: prescription.frequency,
          shifts: prescription.shifts
        });
        const validationRecordedAt =
          prescription.stockValidationRecordedAt ??
          prescription.validationStartAt ??
          prescription.validationEndAt ??
          prescription.createdAt;

        return {
          prescription,
          displayMedicationName: getMedicationReferenceName(prescription.medicationName),
          posology: formatPrescriptionPosology(prescription),
          validationRecordedAt,
          revalidationDate: prescription.patientDidNotBring
            ? null
            : calculateMedicationRevalidationDate(
                validationRecordedAt,
                prescription.quantityTablets,
                dailyTabletUse
              )
        };
      })
      .filter((row) => {
        const referenceTimestamp = new Date(row.validationRecordedAt).getTime();
        return referenceTimestamp >= rangeStart && referenceTimestamp <= rangeEnd;
      })
      .sort((first, second) => {
        const firstTimestamp = new Date(first.validationRecordedAt).getTime();
        const secondTimestamp = new Date(second.validationRecordedAt).getTime();
        return secondTimestamp - firstTimestamp;
      });
  }, [
    appliedValidatedMedicationReportRange.endDate,
    appliedValidatedMedicationReportRange.startDate,
    interventionReportPrescriptions
  ]);

  const validatedMedicationSidebarIndicator = useMemo(
    () =>
      interventionReportPrescriptions.filter(
        (prescription) =>
          isPrescriptionMedicationValidationCandidate(prescription) &&
          hasPrescriptionStockValidation(prescription)
      ).length,
    [interventionReportPrescriptions]
  );

  const selectedPatientAdmissions = useMemo(
    () =>
      selectedPatientCachedDetails?.admissions ??
      recentAdmissions.filter(
        (admission) => selectedPatient !== null && admission.patientId === selectedPatient.id
      ),
    [recentAdmissions, selectedPatient, selectedPatientCachedDetails]
  );

  const selectedCurrentAdmission = useMemo(
    () => selectedPatientAdmissions[0] ?? selectedPatient?.latestAdmission ?? null,
    [selectedPatient, selectedPatientAdmissions]
  );

  const selectedPatientAllergies = useMemo(
    () =>
      selectedPatientCachedDetails?.allergies ??
      patientAllergies.filter(
        (allergy) => selectedPatient !== null && allergy.patientId === selectedPatient.id
      ),
    [patientAllergies, selectedPatient, selectedPatientCachedDetails]
  );

  useEffect(() => {
    setSelectedPatientProfileForm({
      birthDate: formatAdmissionDateValue(selectedPatient?.birthDate ?? ""),
      sex: selectedPatient?.sex ?? ""
    });
    setPrescriptionMode("view");
    setSelectedPrescriptionGroupKey("");
    setSelectedPrescriptionMedicationHistory(null);
    setPrescriptionInterventionOpenId(null);
    setPrescriptionInterventionSavingId(null);
    setPrescriptionFeedback(null);
    setRawPrescriptionInput("");
    setRawPrescriptionDrafts([]);
    setRawPrescriptionFeedback(null);
    setRawPrescriptionLoading(false);
    setShowAllergyComposer(false);
    setShowAdmissionSummaryComposer(false);
    setShowAdmissionSummaryPreview(false);
    setAdmissionSummarySelection("");
    setAllergyForm({ query: "", selectedValue: "", reactionDescription: "" });
    setAllergyEditingId(null);
    setAllergyEditReactionDescription("");
    setAllergyUpdatingId(null);
    setAllergyFeedback(null);
    setEvolutionFeedback(null);
    setRoundSummaryLoading(false);
    setRoundSummaryFeedback(null);
    setExamImportFeedback(null);
    setExamImportResult(null);
    setExamRecordRemovingKey(null);
    if (examPdfInputRef.current) {
      examPdfInputRef.current.value = "";
    }
  }, [selectedPatient?.birthDate, selectedPatient?.id, selectedPatient?.sex]);

  useEffect(() => {
    if (!selectedPatient) {
      return;
    }

    const latestAdmission = selectedPatientAdmissions[0] ?? selectedPatient.latestAdmission;
    const latestMeasurement = selectedPatient.latestMeasurement;

    setAdmissionForm({
      ...createEmptyAdmissionFormState(),
      admissionId: latestAdmission ? String(latestAdmission.id) : "",
      admissionDate: formatAdmissionDateValue(
        latestAdmission?.admissionDate ?? selectedInpatientEntry?.admissionDate ?? ""
      ),
      bed: latestAdmission?.bed ?? selectedInpatientEntry?.bed ?? "",
      admissionReason:
        latestAdmission?.admissionReason && latestAdmission.admissionReason !== "Pendente de preenchimento"
          ? latestAdmission.admissionReason
          : "",
      deniesContinuousMedicationUse: latestAdmission?.deniesContinuousMedicationUse ?? false,
      admissionSummary: latestAdmission?.admissionSummary ?? "",
      roundSummary: "",
      roundSummaryDate: getCurrentFormattedDateValue(),
      admissionImportExcerpt: latestAdmission?.admissionImportExcerpt ?? "",
      interviewInformationQuality: latestAdmission?.interviewInformationQuality ?? "",
      interviewInformationSourceType: latestAdmission?.interviewInformationSourceType ?? "",
      interviewInformationSourceName: latestAdmission?.interviewInformationSourceName ?? "",
      interviewInformationSourceRelationship:
        latestAdmission?.interviewInformationSourceRelationship ?? "",
      interviewInterventionMotive: latestAdmission?.interviewInterventionMotive ?? "",
      interviewSubjective: latestAdmission?.interviewSubjective ?? "",
      interviewRelevantSymptoms: latestAdmission?.interviewRelevantSymptoms ?? "",
      interviewPendingIssues: latestAdmission?.interviewPendingIssues ?? "",
      interviewPlan: latestAdmission?.interviewPlan ?? "",
      teamId:
        latestAdmission?.teamId !== null && latestAdmission?.teamId !== undefined
          ? String(canonicalTeamIdById.get(latestAdmission.teamId) ?? latestAdmission.teamId)
          : selectedInpatientEntry?.teamId !== null && selectedInpatientEntry?.teamId !== undefined
            ? String(
                canonicalTeamIdById.get(selectedInpatientEntry.teamId) ?? selectedInpatientEntry.teamId
              )
            : "",
      weightKg:
        latestMeasurement?.weightKg !== null && latestMeasurement?.weightKg !== undefined
          ? String(latestMeasurement.weightKg)
          : "",
      heightCm:
        latestMeasurement?.heightCm !== null && latestMeasurement?.heightCm !== undefined
          ? String(latestMeasurement.heightCm)
          : "",
      bmiFormula: latestMeasurement?.bmiFormula ?? "quetelet",
      bsaFormula: latestMeasurement?.bsaFormula ?? "mosteller"
    });
    setShowAdmissionSummaryComposer(false);
    setShowAdmissionSummaryPreview(Boolean(latestAdmission?.admissionSummary?.trim()));
    setAdmissionSummarySelection("");
  }, [canonicalTeamIdById, selectedInpatientEntry, selectedPatient, selectedPatientAdmissions]);

  const medicationDescriptors = useMemo(
    () =>
      medications.map((medication) => {
        const activeIngredientTerms = splitCatalogTerms(medication.activeIngredients ?? "");
        const aliasTerms = splitCatalogTerms(medication.searchAliases ?? "");
        const normalizedClass = normalizeMedicationName(medication.therapeuticClass ?? "");
        const safetyFlags = resolveCatalogMedicationSafetyFlags(medication);

        return {
          medication,
          normalizedName: normalizeMedicationName(medication.name),
          normalizedClass,
          classCodes: extractTherapeuticClassCodes(medication.therapeuticClass ?? ""),
          activeIngredientTerms,
          classTerms: splitCatalogTerms((medication.therapeuticClass ?? "").replace(/-/g, ";")),
          aliasTerms,
          safetyFlags
        };
      }),
    [medications]
  );

  const allergySuggestionItems = useMemo(() => {
    const suggestionMap = new Map<string, AllergySuggestionItem>();

    for (const descriptor of medicationDescriptors) {
      const medicationValue =
        extractMedicationIdentityLabel(descriptor.medication.name) || descriptor.medication.name.trim();
      const medicationKey = `medication:${normalizeMedicationName(medicationValue)}`;
      if (medicationValue && !suggestionMap.has(medicationKey)) {
        suggestionMap.set(medicationKey, {
          key: medicationKey,
          label: `${medicationValue} (medicamento)`,
          value: medicationValue,
          source: "medication",
          normalizedValue: normalizeMedicationName(medicationValue),
          normalizedSearch: normalizeMedicationName(
            `${medicationValue} ${descriptor.medication.activeIngredients ?? ""} ${
              descriptor.medication.therapeuticClass ?? ""
            } ${descriptor.medication.searchAliases ?? ""}`
          )
        });
      }

      for (const ingredientTerm of descriptor.activeIngredientTerms) {
        const ingredientValue = extractMedicationIdentityLabel(ingredientTerm.raw) || ingredientTerm.raw.trim();
        const ingredientKey = `ingredient:${normalizeMedicationName(ingredientValue)}`;
        if (ingredientValue && !suggestionMap.has(ingredientKey)) {
          suggestionMap.set(ingredientKey, {
            key: ingredientKey,
            label: `${ingredientValue} (princípio ativo)`,
            value: ingredientValue,
            source: "active-ingredient",
            normalizedValue: normalizeMedicationName(ingredientValue),
            normalizedSearch: normalizeMedicationName(
              `${ingredientValue} ${descriptor.medication.name} ${descriptor.medication.searchAliases ?? ""}`
            )
          });
        }
      }

      const classValue = (descriptor.medication.therapeuticClass ?? "").trim();
      const classKey = `class:${normalizeMedicationName(classValue)}`;
      if (classValue && !suggestionMap.has(classKey)) {
        suggestionMap.set(classKey, {
          key: classKey,
          label: `${classValue} (classe terapêutica)`,
          value: classValue,
          source: "therapeutic-class",
          normalizedValue: normalizeMedicationName(classValue),
          normalizedSearch: normalizeMedicationName(classValue)
        });
      }
    }

    return Array.from(suggestionMap.values()).sort((first, second) =>
      first.value.localeCompare(second.value, "pt-BR")
    );
  }, [medicationDescriptors]);

  const filteredAllergySuggestions = useMemo(() => {
    const normalizedQuery = normalizeMedicationName(allergyForm.query);
    if (!normalizedQuery) {
      return [];
    }

    const getAllergySuggestionScore = (item: AllergySuggestionItem): number => {
      const hasDirectValueMatch =
        item.normalizedValue === normalizedQuery ||
        item.normalizedValue.startsWith(normalizedQuery) ||
        hasTokenBoundaryMatch(item.normalizedValue, normalizedQuery) ||
        hasConceptTermMatch(item.normalizedValue, normalizedQuery);
      const isShortAliasOnlyCandidate =
        item.normalizedValue.length <= 4 &&
        normalizedQuery.length >= 5 &&
        !hasDirectValueMatch;

      if (isShortAliasOnlyCandidate) {
        return 0;
      }

      let score = 0;

      if (item.normalizedValue === normalizedQuery) {
        score += 1000;
      } else if (item.normalizedValue.startsWith(normalizedQuery)) {
        score += 850;
      } else if (hasTokenBoundaryMatch(item.normalizedValue, normalizedQuery)) {
        score += 760;
      } else if (item.normalizedSearch.includes(normalizedQuery)) {
        score += 620;
      } else if (hasConceptTermMatch(item.normalizedSearch, normalizedQuery)) {
        score += 420;
      }

      if (!hasDirectValueMatch && item.normalizedValue.length <= normalizedQuery.length / 2) {
        score -= 280;
      }

      if (item.source === "medication") {
        score += 40;
      } else if (item.source === "active-ingredient") {
        score += 25;
      } else {
        score += 10;
      }

      score -= Math.max(0, item.normalizedValue.length - normalizedQuery.length);
      return score;
    };

    return allergySuggestionItems
      .map((item) => ({
        item,
        score: getAllergySuggestionScore(item)
      }))
      .filter(({ score }) => score > 0)
      .sort((first, second) => {
        if (first.score !== second.score) {
          return second.score - first.score;
        }

        return first.item.value.localeCompare(second.item.value, "pt-BR");
      })
      .map(({ item }) => item)
      .slice(0, 30);
  }, [allergySuggestionItems, allergyForm.query]);

  function findMedicationDescriptorsByText(searchText: string) {
    const normalizedSearchText = normalizeMedicationName(searchText);
    if (!normalizedSearchText) {
      return [];
    }

    return medicationDescriptors.filter((descriptor) => {
      if (isMedicationNameCompatible(descriptor.medication.name, searchText)) {
        return true;
      }

      if (descriptor.normalizedName === normalizedSearchText) {
        return true;
      }

      return descriptor.aliasTerms.some((aliasTerm) =>
        hasConceptTermMatch(aliasTerm.normalized, normalizedSearchText)
      );
    });
  }

  function findMedicationDescriptorsForSafety(searchText: string) {
    const normalizedSearchText = normalizeMedicationName(searchText);
    if (!normalizedSearchText) {
      return [];
    }

    return medicationDescriptors.filter((descriptor) => {
      if (isStrictMedicationReferenceMatch(descriptor.medication.name, searchText)) {
        return true;
      }

      if (descriptor.normalizedName === normalizedSearchText) {
        return true;
      }

      if (
        descriptor.aliasTerms.some(
          (aliasTerm) =>
            aliasTerm.normalized === normalizedSearchText ||
            isStrictMedicationReferenceMatch(aliasTerm.raw, searchText) ||
            hasTokenBoundaryMatch(aliasTerm.normalized, normalizedSearchText) ||
            hasTokenBoundaryMatch(normalizedSearchText, aliasTerm.normalized)
        )
      ) {
        return true;
      }

      return descriptor.activeIngredientTerms.some(
        (ingredientTerm) =>
          ingredientTerm.normalized === normalizedSearchText ||
          isStrictMedicationReferenceMatch(ingredientTerm.raw, searchText)
      );
    });
  }

  function isMedicationReconciled(prescriptionName: string, referenceMedicationName: string): boolean {
    if (isMedicationNameCompatible(prescriptionName, referenceMedicationName)) {
      return true;
    }

    const prescribedDescriptors = findMedicationDescriptorsByText(prescriptionName);
    const referenceDescriptors = findMedicationDescriptorsByText(referenceMedicationName);

    if (prescribedDescriptors.length === 0 || referenceDescriptors.length === 0) {
      return false;
    }

    return prescribedDescriptors.some((prescribedDescriptor) =>
      referenceDescriptors.some((referenceDescriptor) => {
        if (prescribedDescriptor.medication.id === referenceDescriptor.medication.id) {
          return true;
        }

        if (
          hasEquivalentMedicationIdentity(
            prescribedDescriptor.medication.name,
            referenceDescriptor.medication.name
          )
        ) {
          return true;
        }

        return prescribedDescriptor.activeIngredientTerms.some((prescribedIngredient) =>
          referenceDescriptor.activeIngredientTerms.some(
            (referenceIngredient) =>
              hasConceptTermMatch(
                prescribedIngredient.normalized,
                referenceIngredient.normalized
              ) ||
              hasEquivalentMedicationIdentity(prescribedIngredient.raw, referenceIngredient.raw)
          )
        );
      })
    );
  }

function resolveAllergyConflict(medicationName: string): AllergyConflictResult | null {
    const normalizedMedication = normalizeMedicationName(medicationName);
    if (!normalizedMedication) {
      return null;
    }

    const prescribedDescriptors = findMedicationDescriptorsByText(medicationName);

    for (const allergy of selectedPatientAllergies) {
      const normalizedAllergy = normalizeMedicationName(allergy.allergyName);
      if (!normalizedAllergy) {
        continue;
      }

      const normalizedAllergyIdentity = normalizeMedicationName(extractMedicationIdentityLabel(allergy.allergyName));
      if (!normalizedAllergyIdentity && MEDICATION_VARIANT_STOPWORDS.has(normalizedAllergy)) {
        continue;
      }

      if (isStrictMedicationAllergyMatch(medicationName, allergy.allergyName)) {
        return {
          allergyName: allergy.allergyName,
          kind: "direct",
          detail: allergy.allergyName
        };
      }

      for (const prescribedDescriptor of prescribedDescriptors) {
        const ingredientMatch = prescribedDescriptor.activeIngredientTerms.find((ingredientTerm) =>
          isStrictMedicationAllergyMatch(ingredientTerm.raw, allergy.allergyName)
        );
        if (ingredientMatch) {
          return {
            allergyName: allergy.allergyName,
            kind: "active-ingredient",
            detail: ingredientMatch.raw
          };
        }

        if (isStrictMedicationAllergyMatch(prescribedDescriptor.medication.name, allergy.allergyName)) {
          return {
            allergyName: allergy.allergyName,
            kind: "direct",
            detail: prescribedDescriptor.medication.name
          };
        }

        const aliasMatch = splitCatalogTerms(
          prescribedDescriptor.medication.searchAliases ?? ""
        ).find((aliasTerm) => isStrictMedicationAllergyMatch(aliasTerm.raw, allergy.allergyName));
        if (aliasMatch) {
          return {
            allergyName: allergy.allergyName,
            kind: "direct",
            detail: aliasMatch.raw
          };
        }

        const exactTokenMatch = extractMedicationIdentityTokens(prescribedDescriptor.medication.name).find(
          (token) => token === normalizedAllergyIdentity
        );
        if (exactTokenMatch) {
          return {
            allergyName: allergy.allergyName,
            kind: "direct",
            detail: prescribedDescriptor.medication.name
          };
        }
      }
    }

    return null;
  }

  function resolveMedicationSafetyFlags(medicationName: string): MedicationSafetyFlags {
    const normalizedMedication = normalizeMedicationName(medicationName);
    if (!normalizedMedication) {
      return {
        renalAdjustment: false,
        hepatotoxic: false
      };
    }

    const matchedDescriptors = findMedicationDescriptorsForSafety(medicationName);

    return {
      renalAdjustment:
        matchedDescriptors.some((descriptor) => descriptor.safetyFlags.renalAdjustment) ||
        matchesMedicationReferenceList(medicationName, RENAL_ADJUSTMENT_MEDICATIONS),
      hepatotoxic:
        matchedDescriptors.some((descriptor) => descriptor.safetyFlags.hepatotoxic) ||
        matchesMedicationReferenceList(medicationName, HEPATOTOXIC_MEDICATIONS)
    };
  }

  const selectedInitialAllergyMedication = useMemo(
    () =>
      medications.find(
        (medication) => String(medication.id) === patientInitialAllergyForm.medicationId
      ) ?? null,
    [medications, patientInitialAllergyForm.medicationId]
  );

  function findCatalogMedicationMatchByName(medicationName: string) {
    const searchTerms = collectMedicationMatchTerms(medicationName);
    if (searchTerms.length === 0) {
      return null;
    }

    const scoredMatches = medicationDescriptors
      .map((descriptor) => {
        let score = 0;

        const matchTerms = (candidate: string, candidateScore: number) => {
          const candidateTerms = collectMedicationMatchTerms(candidate);
          if (candidateTerms.some((candidateTerm) => searchTerms.includes(candidateTerm))) {
            score = Math.max(score, candidateScore);
          }
        };

        matchTerms(descriptor.medication.name, 120);
        descriptor.aliasTerms.forEach((aliasTerm) => {
          matchTerms(aliasTerm.raw, 110);
        });
        descriptor.activeIngredientTerms.forEach((ingredientTerm) => {
          matchTerms(ingredientTerm.raw, 100);
        });

        return score > 0 ? { descriptor, score } : null;
      })
      .filter((item): item is { descriptor: (typeof medicationDescriptors)[number]; score: number } => item !== null)
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return first.descriptor.medication.name.length - second.descriptor.medication.name.length;
      });

    const bestMatch = scoredMatches[0] ?? null;
    if (!bestMatch) {
      return null;
    }

    const competingBestMatches = scoredMatches.filter((item) => item.score === bestMatch.score);
    if (competingBestMatches.length === 1 || bestMatch.score >= 120) {
      return bestMatch.descriptor.medication;
    }

    return null;
  }

  function findCatalogMedicationsMentionedInText(searchText: string) {
    const normalizedSearchText = normalizeMedicationName(searchText);
    if (!normalizedSearchText) {
      return [];
    }

    const matches = medicationDescriptors.filter((descriptor) => {
      if (hasConceptTermMatch(normalizedSearchText, descriptor.normalizedName)) {
        return true;
      }

      if (
        descriptor.aliasTerms.some((aliasTerm) =>
          hasConceptTermMatch(normalizedSearchText, aliasTerm.normalized)
        )
      ) {
        return true;
      }

      return descriptor.activeIngredientTerms.some(
        (ingredientTerm) =>
          ingredientTerm.normalized.length >= 4 &&
          hasConceptTermMatch(normalizedSearchText, ingredientTerm.normalized)
      );
    });

    return Array.from(
      new Map(matches.map((descriptor) => [descriptor.medication.id, descriptor.medication])).values()
    );
  }

function extractMedicationLabelFromSummaryChunk(chunk: string): string {
  const withoutPrefix = chunk.replace(/^(?:muc|prescrevo muc)\s*:\s*/i, "").trim();
  const withoutMarker = withoutPrefix
    .replace(/^(?:[#*•-]+|\d+[\).\]-])\s*/g, "")
    .replace(/^medica[cç][oõ]es?\s+de\s+uso\s+pr[eé]vio\s*:?\s*/i, "")
    .trim();
  const leadingLabel = withoutMarker.split(/\s+[–-]\s+/)[0]?.trim() ?? withoutMarker;
  const withoutDose = leadingLabel.replace(
    /\b\d+(?:[.,]\d+)?\s*(mg|mcg|g|kg|mL|ml|UI|ui|U|cp|cps|cmp|comprimidos?|caps?|cápsulas?|gotas?)\b/gi,
    " "
  );
  const withoutUsageHints = withoutDose
    .replace(/\b\d+\s*x\s*\/?\s*d(?:ia)?\b/gi, " ")
    .replace(/\b(?:de\s+)?\d+\s*\/\s*\d+\s*(?:h|horas?)\b/gi, " ")
    .replace(/\b\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?){2,5}\b/gi, " ")
    .replace(/\b(?:s\/?\s*n|sn|sos|se\s+necess[aá]rio)\b/gi, " ")
    .replace(/\b(?:manh[aã]|tarde|noite|alm[oó]co|jantar)\b/gi, " ")
    .replace(/[,:]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return withoutUsageHints || withoutDose.replace(/\s+/g, " ").trim() || leadingLabel;
}

function isLikelySummaryMedicationLabel(input: string): boolean {
  const normalized = normalizeMedicationName(input);
  if (!normalized || normalized.length < 2) {
    return false;
  }

  const blockedLabels = new Set([
    "muc",
    "medicacoes de uso previo",
    "medicacao de uso previo",
    "uso previo",
    "conduta",
    "hipotese diagnostica",
    "demais cpm",
    "prescrevo sintomaticos",
    "prescrevo medicacoes continuas"
  ]);

  return !blockedLabels.has(normalized);
}

  function findBestCatalogMedicationFromSummaryChunk(chunk: string) {
    const searchCandidates = [extractMedicationLabelFromSummaryChunk(chunk), chunk]
      .map((value) => value.trim())
      .filter((value, index, current) => value.length > 0 && current.indexOf(value) === index);

    for (const candidate of searchCandidates) {
      const directMatch = findCatalogMedicationMatchByName(candidate);
      if (directMatch) {
        return directMatch;
      }
    }

    return null;
  }

function extractSummaryMedicationCandidates(summaryText: string): SummaryMedicationCandidate[] {
  const candidates = new Map<string, SummaryMedicationCandidate>();
  const baseChunks = summaryText
    .split("\n")
    .flatMap((line) =>
      line
        .split(/[;•]/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0)
    );
  const chunks = baseChunks.flatMap((chunk) => {
    const protectedChunk = chunk.replace(/(\d),(\d)/g, "$1__DECIMAL__$2");

    return protectedChunk
      .split(/,(?=\s*[A-Za-zÀ-ÿ])/)
      .map((item) => item.replace(/__DECIMAL__/g, ",").trim())
      .filter((item) => item.length > 0);
  });

  for (const chunk of chunks) {
    const medication = findBestCatalogMedicationFromSummaryChunk(chunk);
    const extractedLabel = extractMedicationLabelFromSummaryChunk(chunk);
    const medicationName = medication?.name ?? extractedLabel;
    const normalizedMedicationName = normalizeMedicationName(medicationName);

    if (!isLikelySummaryMedicationLabel(medicationName) || !normalizedMedicationName) {
      continue;
    }

    if (candidates.has(normalizedMedicationName)) {
      continue;
    }

    const parsedDose = extractDoseFromText(chunk);
    candidates.set(normalizedMedicationName, {
      medicationId: medication?.id ?? null,
      medicationName,
      dose: parsedDose.dose,
      doseUnit: parsedDose.doseUnit,
      frequency: extractFrequencyFromText(chunk),
      shifts: extractShiftsFromText(chunk)
    });
  }

  return Array.from(candidates.values());
}

  async function autoPopulateFromAdmissionSummary(
    patientId: number,
    importExcerpt: string
  ): Promise<{ addedPriorMedications: number }> {
    const trimmedImportExcerpt = importExcerpt.trim();
    if (!trimmedImportExcerpt) {
      return { addedPriorMedications: 0 };
    }

    const existingPriorMedicationNames = new Set(
      selectedPatientPriorMedications.map((item) => normalizeMedicationName(item.medicationName))
    );

    const priorMedicationCandidates = extractSummaryMedicationCandidates(trimmedImportExcerpt).filter(
      (candidate) => !existingPriorMedicationNames.has(normalizeMedicationName(candidate.medicationName))
    );

    const priorMedicationResults = await Promise.all(
      priorMedicationCandidates.map(async (candidate) => {
        const response = await fetch(`/api/patients/${patientId}/prior-medications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(candidate)
        });

        const result = (await response.json()) as {
          priorMedication?: PriorMedicationRecord;
        };
        if (!response.ok || !result.priorMedication) {
          return null;
        }

        appendPriorMedicationLocally(result.priorMedication);
        return candidate.medicationName;
      })
    );

    return {
      addedPriorMedications: priorMedicationResults.filter((item) => item !== null).length
    };
  }

  function applySelectedAdmissionSummaryText(): void {
    const selectedText = admissionSummarySelection.trim();
    if (!selectedText) {
      setAdmissionFeedback({
        type: "error",
        message: "Selecione um trecho do resumo antes de salvar a importação."
      });
      return;
    }

    setAdmissionForm((current) => ({
      ...current,
      admissionImportExcerpt: selectedText
    }));
    setAdmissionFeedback({
      type: "success",
      message: "Trecho selecionado salvo para importar MUC. Agora clique em Atualizar internação."
    });
  }

  function syncAdmissionSummarySelection(): void {
    const textarea = admissionSummaryTextareaRef.current;
    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? 0;
    const selectedText = admissionForm.admissionSummary.slice(selectionStart, selectionEnd).trim();
    setAdmissionSummarySelection(selectedText);
  }

  async function handleExamPdfImport(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setExamImportFeedback(null);

    if (!selectedPatient) {
      setExamImportFeedback({
        type: "error",
        message: "Selecione um paciente antes de importar os exames."
      });
      return;
    }

    const file = examPdfInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setExamImportFeedback({
        type: "error",
        message: "Selecione um PDF de exames para extrair os dados."
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setExamImportFeedback({
        type: "error",
        message: "Selecione um arquivo PDF válido."
      });
      return;
    }

    setExamImportLoading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/patients/${selectedPatient.id}/exams`, {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as {
        message?: string;
        examImport?: PatientExamImportRecord;
      };

      if (!response.ok || !result.examImport) {
        setExamImportResult(null);
        setExamImportFeedback({
          type: "error",
          message: result.message ?? "Não foi possível extrair os dados do PDF informado."
        });
        return;
      }

      setExamImportResult({
        fileName: result.examImport.fileName,
        pageCount: result.examImport.pageCount,
        importedAt: result.examImport.createdAt,
        records: result.examImport.records,
        rawText: result.examImport.rawText
      });
      setExamImportFeedback({
        type: "success",
        message:
          result.examImport.records.length > 0
            ? `${result.examImport.records.length} resultado(s) extraído(s) e salvo(s) no paciente.`
            : "Texto extraído e salvo no paciente, sem resultados estruturados identificados."
      });
      appendExamImportLocally(result.examImport);
      setSelectedExamImportId(String(result.examImport.id));
      setSelectedExamImportDetails(result.examImport);
    } catch {
      setExamImportResult(null);
      setExamImportFeedback({
        type: "error",
        message: "Não foi possível enviar o PDF para extração."
      });
    } finally {
      setExamImportLoading(false);
      if (examPdfInputRef.current) {
        examPdfInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveExamImport(examImport: PatientExamImportRecord): Promise<void> {
    if (!selectedPatient) {
      setExamImportFeedback({
        type: "error",
        message: "Selecione um paciente antes de remover os exames."
      });
      return;
    }

    const confirmed = window.confirm(
      `Remover a importação "${examImport.fileName}" de ${formatTimestamp(examImport.createdAt)}?`
    );
    if (!confirmed) {
      return;
    }

    setExamImportFeedback(null);
    setExamImportRemovingId(examImport.id);

    try {
      const response = await fetch(
        `/api/patients/${selectedPatient.id}/exams?examImportId=${examImport.id}`,
        {
          method: "DELETE"
        }
      );

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setExamImportFeedback({
          type: "error",
          message: result.message ?? "Não foi possível remover a importação de exames."
        });
        return;
      }

      if (selectedExamImportId === String(examImport.id)) {
        setSelectedExamImportId("");
        setSelectedExamImportDetails(null);
      }

      if (
        examImportResult &&
        examImport.fileName === examImportResult.fileName &&
        examImport.createdAt === examImportResult.importedAt
      ) {
        setExamImportResult(null);
      }

      setExamImportFeedback({
        type: "success",
        message: "Importação de exames removida com sucesso."
      });
      removeExamImportLocally(selectedPatient.id, examImport.id);
    } catch {
      setExamImportFeedback({
        type: "error",
        message: "Erro de conexão ao remover a importação de exames."
      });
    } finally {
      setExamImportRemovingId(null);
    }
  }

  async function handleRemoveExamRecord(
    examImport: PatientExamImportRecord,
    record: PatientExamResultRecord
  ): Promise<void> {
    if (!selectedPatient) {
      setExamImportFeedback({
        type: "error",
        message: "Selecione um paciente antes de remover o exame."
      });
      return;
    }

    const confirmed = window.confirm(
      `Remover o exame "${record.examName}" (${record.result}) desta importação?`
    );
    if (!confirmed) {
      return;
    }

    setExamImportFeedback(null);
    setExamRecordRemovingKey(record.key);

    try {
      const response = await fetch(
        `/api/patients/${selectedPatient.id}/exams?examImportId=${examImport.id}&recordKey=${encodeURIComponent(
          record.key
        )}`,
        {
          method: "DELETE"
        }
      );

      const result = (await response.json()) as {
        message?: string;
        examImport?: PatientExamImportRecord;
      };

      if (!response.ok || !result.examImport) {
        setExamImportFeedback({
          type: "error",
          message: result.message ?? "Não foi possível remover o exame selecionado."
        });
        return;
      }

      updateExamImportLocally(result.examImport);

      if (selectedExamImportId === String(result.examImport.id)) {
        setSelectedExamImportDetails(result.examImport);
      }

      if (
        examImportResult &&
        examImport.fileName === examImportResult.fileName &&
        examImport.createdAt === examImportResult.importedAt
      ) {
        setExamImportResult({
          ...examImportResult,
          records: result.examImport.records,
          rawText: result.examImport.rawText
        });
      }

      setExamImportFeedback({
        type: "success",
        message: "Exame removido da importação com sucesso."
      });
    } catch {
      setExamImportFeedback({
        type: "error",
        message: "Erro de conexão ao remover o exame selecionado."
      });
    } finally {
      setExamRecordRemovingKey(null);
    }
  }

  const selectedPatientPriorMedications = useMemo(
    () =>
      selectedPatientCachedDetails?.priorMedications ??
      priorMedications.filter(
        (medication) => selectedPatient !== null && medication.patientId === selectedPatient.id
      ),
    [priorMedications, selectedPatient, selectedPatientCachedDetails]
  );

  const selectedPatientExamImports = useMemo(
    () =>
      selectedPatientCachedDetails?.examImports ??
      examImports.filter(
        (examImport) => selectedPatient !== null && examImport.patientId === selectedPatient.id
      ),
    [examImports, selectedPatient, selectedPatientCachedDetails]
  );

  const selectedPatientRoundNotes = useMemo(
    () =>
      selectedPatientCachedDetails?.roundNotes ??
      roundNotes.filter(
        (roundNote) => selectedPatient !== null && roundNote.patientId === selectedPatient.id
      ),
    [roundNotes, selectedPatient, selectedPatientCachedDetails]
  );

  const selectedCurrentAdmissionRoundNotes = useMemo(() => {
    if (!selectedCurrentAdmission) {
      return [];
    }

    const admissionNotes = selectedPatientRoundNotes.filter(
      (roundNote) => roundNote.admissionId === selectedCurrentAdmission.id
    );
    const legacyNote =
      selectedCurrentAdmission.roundSummary?.trim()
        ? {
            id: -selectedCurrentAdmission.id,
            patientId: selectedCurrentAdmission.patientId,
            patientName: selectedCurrentAdmission.patientName,
            admissionId: selectedCurrentAdmission.id,
            roundDate:
              selectedCurrentAdmission.roundSummaryDate ?? selectedCurrentAdmission.admissionDate,
            note: selectedCurrentAdmission.roundSummary.trim(),
            responsibleProfessionalId: selectedCurrentAdmission.responsibleProfessionalId,
            responsibleProfessionalName: selectedCurrentAdmission.responsibleProfessionalName,
            createdAt: selectedCurrentAdmission.createdAt
          }
        : null;
    const hasEquivalentLegacyNote =
      legacyNote !== null &&
      admissionNotes.some(
        (roundNote) =>
          roundNote.roundDate === legacyNote.roundDate && roundNote.note.trim() === legacyNote.note
      );
    const nextNotes =
      legacyNote && !hasEquivalentLegacyNote ? [legacyNote, ...admissionNotes] : admissionNotes;

    return [...nextNotes].sort((first, second) => {
      const firstKey = `${first.roundDate}|${first.createdAt}`;
      const secondKey = `${second.roundDate}|${second.createdAt}`;
      const dateCompare = secondKey.localeCompare(firstKey);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return second.id - first.id;
    });
  }, [selectedCurrentAdmission, selectedPatientRoundNotes]);

  useEffect(() => {
    if (selectedPatientExamImports.length === 0) {
      setSelectedExamImportId("");
      setSelectedExamImportDetails(null);
      return;
    }

    const hasSelectedImport = selectedPatientExamImports.some(
      (examImport) => String(examImport.id) === selectedExamImportId
    );

    if (!hasSelectedImport) {
      setSelectedExamImportId(String(selectedPatientExamImports[0].id));
    }
  }, [selectedExamImportId, selectedPatientExamImports]);

  const selectedSavedExamImport = useMemo(
    () =>
      selectedPatientExamImports.find((examImport) => String(examImport.id) === selectedExamImportId) ??
      selectedPatientExamImports[0] ??
      null,
    [selectedExamImportId, selectedPatientExamImports]
  );

  const selectedSavedExamImportDetails = useMemo(() => {
    if (
      selectedSavedExamImport &&
      selectedExamImportDetails &&
      selectedExamImportDetails.id === selectedSavedExamImport.id
    ) {
      return selectedExamImportDetails;
    }

    return selectedSavedExamImport;
  }, [selectedExamImportDetails, selectedSavedExamImport]);

  const shouldShowLatestExamImportPreview =
    examImportResult !== null &&
    (!selectedSavedExamImportDetails ||
      selectedSavedExamImportDetails.fileName !== examImportResult.fileName ||
      selectedSavedExamImportDetails.createdAt !== examImportResult.importedAt);

  useEffect(() => {
    if (!selectedPatient || !selectedSavedExamImport) {
      setSelectedExamImportDetails(null);
      setSelectedExamImportDetailsLoading(false);
      return;
    }

    if (selectedSavedExamImport.rawText.trim()) {
      setSelectedExamImportDetails(selectedSavedExamImport);
      setSelectedExamImportDetailsLoading(false);
      return;
    }

    let isCancelled = false;
    setSelectedExamImportDetailsLoading(true);

    void (async () => {
      try {
        const response = await fetch(
          `/api/patients/${selectedPatient.id}/exams?examImportId=${selectedSavedExamImport.id}`
        );
        const result = (await response.json()) as {
          message?: string;
          examImport?: PatientExamImportRecord;
        };

        if (!response.ok || !result.examImport) {
          if (!isCancelled) {
            setSelectedExamImportDetails(null);
          }
          return;
        }

        if (!isCancelled) {
          setSelectedExamImportDetails(result.examImport);
        }
      } catch {
        if (!isCancelled) {
          setSelectedExamImportDetails(null);
        }
      } finally {
        if (!isCancelled) {
          setSelectedExamImportDetailsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedPatient, selectedSavedExamImport]);

  useEffect(() => {
    setPriorMedicationReconciliationForm(
      Object.fromEntries(
        selectedPatientPriorMedications.map((priorMedication) => [
          priorMedication.id,
          createPriorMedicationReconciliationFormState(priorMedication)
        ])
      )
    );
  }, [selectedPatientPriorMedications]);

  const priorMedicationCatalogMatch = useMemo(
    () => findCatalogMedicationMatchByName(priorMedicationForm.medicationName),
    [priorMedicationForm.medicationName, medications]
  );

  const priorMedicationQuickOptions = useMemo(() => {
    const uniqueNames = new Map<string, string>();

    for (const medication of medications) {
      const normalizedName = normalizeMedicationName(medication.name);
      if (normalizedName) {
        uniqueNames.set(normalizedName, medication.name);
      }
    }

    for (const medication of selectedPatientPriorMedications) {
      const normalizedName = normalizeMedicationName(medication.medicationName);
      if (normalizedName && !uniqueNames.has(normalizedName)) {
        uniqueNames.set(normalizedName, medication.medicationName);
      }
    }

    for (const medicationName of manualPriorMedicationOptions) {
      const normalizedName = normalizeMedicationName(medicationName);
      if (normalizedName && !uniqueNames.has(normalizedName)) {
        uniqueNames.set(normalizedName, medicationName);
      }
    }

    return Array.from(uniqueNames.values()).sort((first, second) =>
      first.localeCompare(second, "pt-BR")
    );
  }, [medications, selectedPatientPriorMedications, manualPriorMedicationOptions]);

  const selectedPatientPrescriptions = useMemo(
    () =>
      selectedPatientCachedDetails?.prescriptions ??
      prescriptions.filter(
        (prescription) => selectedPatient !== null && prescription.patientId === selectedPatient.id
      ),
    [prescriptions, selectedPatient, selectedPatientCachedDetails]
  );

  const selectedPatientMedicationValidationRows = useMemo(
    () =>
      selectedPatientPrescriptions
        .filter((prescription) => isPrescriptionMedicationValidationCandidate(prescription))
        .map((prescription) => {
          const dailyTabletUse = calculateDailyTabletUse({
            dose: prescription.dose,
            doseUnit: prescription.doseUnit,
            frequency: prescription.frequency,
            shifts: prescription.shifts
          });

          return {
            prescription,
            displayMedicationName: getMedicationReferenceName(prescription.medicationName),
            dailyTabletUse,
            durationDays: calculateDurationDays(prescription.quantityTablets, dailyTabletUse)
          };
        }),
    [selectedPatientPrescriptions]
  );

  const selectedPrescriptionMedicationReferenceName = useMemo(
    () =>
      selectedPrescriptionMedicationHistory
        ? getMedicationReferenceName(selectedPrescriptionMedicationHistory.medicationName)
        : "",
    [selectedPrescriptionMedicationHistory]
  );

  useEffect(() => {
    setMedicationValidationForm(
      Object.fromEntries(
        selectedPatientMedicationValidationRows.map((row) => [
          row.prescription.id,
          {
            quantityTablets:
              row.prescription.quantityTablets === null ? "" : String(row.prescription.quantityTablets),
            lotNumber: row.prescription.lotNumber ?? "",
            expirationDate: row.prescription.expirationDate ?? "",
            manufacturer: row.prescription.manufacturer ?? "",
            patientDidNotBring: row.prescription.patientDidNotBring,
            stockValidationNote: row.prescription.stockValidationNote ?? ""
          } satisfies StockValidationFormState
        ])
      )
    );
  }, [selectedPatientMedicationValidationRows]);

  useEffect(() => {
    setPrescriptionInterventionOpenId(null);
  }, [selectedPatientPrescriptions]);

  const selectedPatientPrescriptionGroups = useMemo(
    () => groupPrescriptionRecordsBySet(selectedPatientPrescriptions),
    [selectedPatientPrescriptions]
  );

  const recentPrescriptionGroups = useMemo(
    () => selectedPatientPrescriptionGroups.slice(0, 3),
    [selectedPatientPrescriptionGroups]
  );

  const visiblePrescriptionGroups = useMemo(() => {
    if (recentPrescriptionGroups.length === 0) {
      return [];
    }

    const selectedGroup =
      recentPrescriptionGroups.find((group) => group.key === selectedPrescriptionGroupKey) ??
      recentPrescriptionGroups[0];

    return [selectedGroup];
  }, [recentPrescriptionGroups, selectedPrescriptionGroupKey]);

  const priorMedicationFormReconciliation = useMemo(() => {
    const medicationName = (
      priorMedicationCatalogMatch?.name ?? priorMedicationForm.medicationName
    ).trim();
    if (!medicationName) {
      return null;
    }

    const history = selectedPatientPrescriptionGroups.map((group) => {
      const prescriptionDate =
        group.validationStartAt ?? group.validationEndAt ?? group.prescriptions[0]?.createdAt ?? null;
      const reconciled = group.prescriptions.some((prescription) =>
        isMedicationReconciled(prescription.medicationName, medicationName)
      );
      return {
        key: group.key,
        prescriptionDate,
        reconciled
      };
    });

    const latest = history[0] ?? null;
    return {
      latestPrescriptionDate: latest?.prescriptionDate ?? null,
      latestReconciled: latest?.reconciled ?? null,
      reconciledInAllPrescriptions: history.length > 0 ? history.every((item) => item.reconciled) : null
    };
  }, [priorMedicationCatalogMatch, priorMedicationForm.medicationName, selectedPatientPrescriptionGroups]);

  const priorMedicationPrescriptionLinkOptions = useMemo(
    () =>
      selectedPatientPrescriptions
        .map((prescription) => {
          const referenceDate =
            prescription.validationStartAt ?? prescription.validationEndAt ?? prescription.createdAt;

          return {
            id: prescription.id,
            label: `${getPrescriptionMedicationDisplayName(
              prescription.medicationName,
              prescription.externalValidationCandidate
            )} | ${
              referenceDate ? formatTimestamp(referenceDate) : "Sem data"
            }`
          };
        })
        .sort((first, second) => second.id - first.id),
    [selectedPatientPrescriptions]
  );

  const priorMedicationRows = useMemo(
    () =>
      selectedPatientPriorMedications.map((priorMedication) => {
        const history = selectedPatientPrescriptionGroups.map((group, groupIndex) => {
          const prescriptionDate =
            group.validationStartAt ?? group.validationEndAt ?? group.prescriptions[0]?.createdAt ?? null;
          const reconciliation = resolvePriorMedicationReconciliationForGroup(
            priorMedication,
            group,
            groupIndex
          );
          return {
            key: group.key,
            prescriptionDate,
            reconciled: reconciliation.reconciled,
            source: reconciliation.source
          };
        });

        const latest = history[0] ?? null;
        return {
          priorMedication,
          latestPrescriptionDate: latest?.prescriptionDate ?? null,
          latestReconciled: latest?.reconciled ?? null,
          reconciledInAllPrescriptions: history.length > 0 ? history.every((item) => item.reconciled) : null,
          history
        };
      }),
    [selectedPatientPriorMedications, selectedPatientPrescriptionGroups]
  );

  const priorMedicationEditableRows = useMemo(
    () =>
      priorMedicationRows.map((row) => {
        const formState =
          priorMedicationReconciliationForm[row.priorMedication.id] ??
          createPriorMedicationReconciliationFormState(row.priorMedication);
        const draftPriorMedication = {
          ...row.priorMedication,
          reconciliationManualStatus:
            formState.reconciliationManualStatus === "sim"
              ? true
              : formState.reconciliationManualStatus === "nao"
                ? false
                : null,
          reconciliationPrescriptionId: formState.reconciliationPrescriptionId
            ? Number(formState.reconciliationPrescriptionId)
            : null
        };
        const history = selectedPatientPrescriptionGroups.map((group, groupIndex) => {
          const prescriptionDate =
            group.validationStartAt ?? group.validationEndAt ?? group.prescriptions[0]?.createdAt ?? null;
          const reconciliation = resolvePriorMedicationReconciliationForGroup(
            draftPriorMedication,
            group,
            groupIndex
          );

          return {
            key: group.key,
            prescriptionDate,
            reconciled: reconciliation.reconciled,
            source: reconciliation.source
          };
        });
        const latest = history[0] ?? null;

        return {
          ...row,
          formState,
          latestReconciled: latest?.reconciled ?? null,
          reconciledInAllPrescriptions: history.length > 0 ? history.every((item) => item.reconciled) : null,
          history,
          isDirty: !arePriorMedicationReconciliationFormsEqual(formState, row.priorMedication)
        };
      }),
    [priorMedicationRows, priorMedicationReconciliationForm, selectedPatientPrescriptionGroups]
  );

  const hasPriorMedicationNegationChange =
    admissionForm.deniesContinuousMedicationUse !==
    (selectedCurrentAdmission?.deniesContinuousMedicationUse ?? false);

  const medicationValidationEditableRows = useMemo(
    () =>
      selectedPatientMedicationValidationRows.map((row) => {
        const formState =
          medicationValidationForm[row.prescription.id] ?? createEmptyStockValidationFormState();
        const currentQuantityTablets = parseStockValidationQuantity(formState.quantityTablets);

        return {
          ...row,
          formState,
          currentQuantityTablets,
          currentDurationDays: formState.patientDidNotBring
            ? null
            : calculateDurationDays(currentQuantityTablets, row.dailyTabletUse),
          isDirty: !areStockValidationFormsEqual(formState, row.prescription)
        };
      }),
    [selectedPatientMedicationValidationRows, medicationValidationForm]
  );

  const interviewEvolutionText = useMemo(() => {
    if (!selectedPatient) {
      return "";
    }

    const patientAge = selectedPatientAgePreview ?? selectedPatient.ageYears;
    const interviewInformationQuality = INTERVIEW_INFORMATION_QUALITY_OPTIONS.includes(
      admissionForm.interviewInformationQuality as InterviewInformationQuality
    )
      ? (admissionForm.interviewInformationQuality as InterviewInformationQuality)
      : null;
    const interviewInformationSourceType = INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS.includes(
      admissionForm.interviewInformationSourceType as InterviewInformationSourceType
    )
      ? (admissionForm.interviewInformationSourceType as InterviewInformationSourceType)
      : null;

    const sections: string[] = [
      `${selectedPatient.fullName.toUpperCase()} - ${selectedPatient.chartNumber}${
        patientAge !== null ? ` - Idade: ${patientAge} anos` : ""
      }`
    ];

    const pushSection = (title: string, lines: string[]) => {
      const sanitizedLines = lines.map((line) => line.trim()).filter((line) => line.length > 0);
      if (sanitizedLines.length === 0) {
        return;
      }

      sections.push("", title, ...sanitizedLines.map((line) => `- ${line}`));
    };

    const patientDataLines: string[] = [];
    patientDataLines.push(
      selectedPatientAllergies.length === 0
        ? "ALERGIAS - Paciente NÃO possui ou DESCONHECE alergias/reações adversas"
        : `ALERGIAS - ${selectedPatientAllergies.map((allergy) => formatAllergyDisplay(allergy)).join("; ")}`
    );

    const weightKg = Number(admissionForm.weightKg);
    const heightCm = Number(admissionForm.heightCm);
    const bmiValue =
      admissionPreview?.bmi ?? (selectedCurrentAdmission?.bmi !== null ? selectedCurrentAdmission?.bmi : null);
    const bodySurfaceAreaValue =
      admissionPreview?.bodySurfaceArea ??
      (selectedCurrentAdmission?.bodySurfaceArea !== null
        ? selectedCurrentAdmission?.bodySurfaceArea
        : null);
    const anthropometricParts = [
      Number.isFinite(weightKg) && weightKg > 0 ? `PESO ${formatNumber(weightKg)} kg` : "",
      Number.isFinite(heightCm) && heightCm > 0 ? `ALTURA ${formatNumber(heightCm)} cm` : "",
      bmiValue !== null && bmiValue !== undefined ? `IMC ${formatNumber(bmiValue)}` : "",
      bodySurfaceAreaValue !== null && bodySurfaceAreaValue !== undefined
        ? `ÁREA DE SUPERFÍCIE ${formatNumber(bodySurfaceAreaValue)}`
        : ""
    ].filter((item) => item.length > 0);
    if (anthropometricParts.length > 0) {
      patientDataLines.push(anthropometricParts.join(" | "));
    }
    pushSection("#DADOS DO PACIENTE", patientDataLines);

    const examSummaryLines = selectedSavedExamImportDetails
      ? groupExamRecordsByDate(
          resolveExamRecordsWithDates(
            selectedSavedExamImportDetails.records,
            selectedSavedExamImportDetails.rawText
          )
        ).map((group) =>
          `${group.label}: ${group.records
            .map((record) =>
              [
                record.examName,
                record.result,
                record.unit || ""
              ]
                .filter((part) => part.length > 0)
                .join(" ")
            )
            .join("; ")}`
        )
      : [];
    pushSection("#EXAMES", examSummaryLines);

    const qualityLabel = formatInterviewInformationQualityLabel(interviewInformationQuality);
    const hasInformantDetails =
      admissionForm.interviewInformationSourceName.trim().length > 0 ||
      admissionForm.interviewInformationSourceRelationship.trim().length > 0;
    const informationSourceSummary =
      interviewInformationSourceType === "patient"
        ? `Próprio paciente fornece as informações${
            qualityLabel ? ` com ${qualityLabel.toUpperCase()} CONFIABILIDADE` : ""
          }`
        : interviewInformationSourceType === "informant" || hasInformantDetails
          ? [
              [
                admissionForm.interviewInformationSourceName.trim(),
                admissionForm.interviewInformationSourceRelationship.trim()
                  ? `(${admissionForm.interviewInformationSourceRelationship.trim()})`
                  : ""
              ]
                .filter((part) => part.length > 0)
                .join(" ")
                .trim() || "Informante",
              "fornece as informações",
              qualityLabel ? `com ${qualityLabel.toUpperCase()} CONFIABILIDADE` : ""
            ]
              .filter((part) => part.length > 0)
              .join(" ")
          : qualityLabel
            ? `Informações com ${qualityLabel.toUpperCase()} CONFIABILIDADE`
            : "";
    pushSection("#FONTE INFORMAÇÃO", informationSourceSummary ? [informationSourceSummary] : []);

    const priorMedicationLines =
      priorMedicationEditableRows.length > 0
        ? priorMedicationEditableRows.map((row) => {
            const scheduleParts = [
              row.formState.dose.trim(),
              row.formState.frequency.trim(),
              row.formState.shifts.trim()
            ].filter((part) => part.length > 0);
            const scheduleText = scheduleParts.length > 0 ? ` (${scheduleParts.join(" | ")})` : "";
            const reconciledText =
              row.latestReconciled === null ? "Não avaliado" : row.latestReconciled ? "Sim" : "Não";
            return `${row.priorMedication.medicationName}${scheduleText} | Reconciliado: ${reconciledText}`;
          })
        : admissionForm.deniesContinuousMedicationUse
          ? ["Paciente nega uso de medicamentos de uso contínuo (MUC)."]
          : [];
    pushSection("#MEDICAMENTO DE USO CONTÍNUO E RECONCILIAÇÃO", priorMedicationLines);

    pushSection(
      "#VALIDAÇÃO DE MEDICAMENTOS",
      medicationValidationEditableRows.map((row) => {
        return buildMedicationValidationSummary({
          displayMedicationName: row.displayMedicationName,
          quantityTablets: row.currentQuantityTablets,
          lotNumber: row.formState.lotNumber,
          expirationDate: row.formState.expirationDate,
          manufacturer: row.formState.manufacturer,
          durationDays: row.currentDurationDays,
          patientDidNotBring: row.formState.patientDidNotBring,
          stockValidationNote: row.formState.stockValidationNote
        });
      })
    );

    const subjectiveLines = [
      ...splitTextIntoBulletLines(admissionForm.interviewSubjective),
      ...splitTextIntoBulletLines(admissionForm.interviewRelevantSymptoms).map(
        (line) => `Sintomas relevantes: ${line}`
      )
    ];
    pushSection("#SUBJETIVO", subjectiveLines);

    pushSection(
      "#INTERVENÇÕES",
      selectedPatientPrescriptions
        .filter((prescription) => hasPrescriptionIntervention(prescription))
        .map(
          (prescription) =>
            `${getPrescriptionMedicationDisplayName(
              prescription.medicationName,
              prescription.externalValidationCandidate
            )} | ${formatPrescriptionInterventionSummary(prescription)}`
        )
    );

    pushSection(
      "#PLANO E CONDUTA FARMACÊUTICA",
      splitTextIntoBulletLines(admissionForm.interviewPlan)
    );

    pushSection("#PENDÊNCIAS", splitTextIntoBulletLines(admissionForm.interviewPendingIssues));

    sections.push("", ...currentProfessionalSignatureLines);
    return sections.join("\n").trim();
  }, [
    admissionForm.heightCm,
    admissionForm.deniesContinuousMedicationUse,
    admissionForm.interviewInformationQuality,
    admissionForm.interviewInformationSourceName,
    admissionForm.interviewInformationSourceRelationship,
    admissionForm.interviewInformationSourceType,
    admissionForm.interviewPendingIssues,
    admissionForm.interviewPlan,
    admissionForm.interviewRelevantSymptoms,
    admissionForm.interviewSubjective,
    admissionForm.weightKg,
    admissionPreview,
    currentLogin,
    currentProfessional,
    currentProfessionalSignatureLines,
    medicationValidationEditableRows,
    priorMedicationEditableRows,
    selectedCurrentAdmission,
    selectedPatient,
    selectedPatientAgePreview,
    selectedPatientAllergies,
    selectedPatientPrescriptions,
    selectedSavedExamImportDetails
  ]);

  const visibleInterviewEvolutionText = useMemo(
    () =>
      interviewEvolutionIncludeTitles
        ? interviewEvolutionText
        : stripEvolutionTitles(interviewEvolutionText),
    [interviewEvolutionIncludeTitles, interviewEvolutionText]
  );

  const visibleMandatoryEvolutionPreviewText = useMemo(() => {
    if (!mandatoryEvolutionPreview) {
      return "";
    }

    return mandatoryEvolutionPreview.includeTitles
      ? mandatoryEvolutionPreview.baseText
      : stripEvolutionTitles(mandatoryEvolutionPreview.baseText);
  }, [mandatoryEvolutionPreview]);

  const selectedPrescriptionMedicationHistoryRows = useMemo(() => {
    if (!selectedPrescriptionMedicationHistory) {
      return [];
    }

    return selectedPatientPrescriptions
      .filter((prescription) => {
        if (
          selectedPrescriptionMedicationHistory.medicationId !== null &&
          prescription.medicationId !== null &&
          prescription.medicationId === selectedPrescriptionMedicationHistory.medicationId
        ) {
          return true;
        }

        return (
          isMedicationReconciled(
            prescription.medicationName,
            selectedPrescriptionMedicationReferenceName
          ) ||
          isMedicationReconciled(
            selectedPrescriptionMedicationReferenceName,
            prescription.medicationName
          )
        );
      })
      .sort((first, second) => {
        const firstTime = new Date(
          first.validationStartAt ?? first.validationEndAt ?? first.createdAt
        ).getTime();
        const secondTime = new Date(
          second.validationStartAt ?? second.validationEndAt ?? second.createdAt
        ).getTime();
        return secondTime - firstTime;
      });
  }, [selectedPatientPrescriptions, selectedPrescriptionMedicationHistory, selectedPrescriptionMedicationReferenceName]);

  const selectedPrescriptionMedicationCatalogMatch = useMemo(() => {
    if (!selectedPrescriptionMedicationHistory) {
      return null;
    }

    return findCatalogMedicationMatchByName(selectedPrescriptionMedicationReferenceName);
  }, [selectedPrescriptionMedicationReferenceName, medications]);

  const selectedPrescriptionMedicationSafetyFlags = useMemo(
    () =>
      selectedPrescriptionMedicationHistory
        ? resolveMedicationSafetyFlags(selectedPrescriptionMedicationReferenceName)
        : { renalAdjustment: false, hepatotoxic: false },
    [selectedPrescriptionMedicationHistory, selectedPrescriptionMedicationReferenceName, medicationDescriptors]
  );

  useEffect(() => {
    if (prescriptionMode !== "view") {
      return;
    }

    setSelectedPrescriptionGroupKey(recentPrescriptionGroups[0]?.key ?? "");
  }, [prescriptionMode, recentPrescriptionGroups[0]?.key, selectedPatient?.id]);

  useEffect(() => {
    if (!selectedPrescriptionMedicationHistory) {
      return;
    }

    const hasMatchingPrescription = selectedPatientPrescriptions.some((prescription) => {
      if (
        selectedPrescriptionMedicationHistory.medicationId !== null &&
        prescription.medicationId !== null &&
        prescription.medicationId === selectedPrescriptionMedicationHistory.medicationId
      ) {
        return true;
      }

      return (
        isMedicationReconciled(
          prescription.medicationName,
          selectedPrescriptionMedicationReferenceName
        ) ||
        isMedicationReconciled(
          selectedPrescriptionMedicationReferenceName,
          prescription.medicationName
        )
      );
    });

    if (!hasMatchingPrescription) {
      setSelectedPrescriptionMedicationHistory(null);
    }
  }, [selectedPatientPrescriptions, selectedPrescriptionMedicationHistory, selectedPrescriptionMedicationReferenceName]);

  const isDashboardLoading = isDashboardTransitionPending;

  useEffect(() => {
    if (!isDashboardLoading && dashboardTransitionLabel) {
      setDashboardTransitionLabel("");
    }
  }, [dashboardTransitionLabel, isDashboardLoading]);

  function mutateCachedPatientDetails(
    patientId: number,
    updater: (details: PatientDashboardDetails) => PatientDashboardDetails
  ): void {
    setPatientDetailsCache((current) => {
      const details = current[patientId];
      if (!details) {
        return current;
      }

      return {
        ...current,
        [patientId]: updater(details)
      };
    });
  }

  function upsertPatientRecordLocally(nextPatient: PatientRecord): void {
    setPatients((current) => upsertRecordById(current, nextPatient));
    mutateCachedPatientDetails(nextPatient.id, (details) => ({
      ...details,
      patient: nextPatient
    }));
  }

  function upsertAdmissionRecordLocally(
    nextAdmission: AdmissionRecord,
    relatedPatientOverride?: PatientRecord | null
  ): void {
    setRecentAdmissions((current) => upsertRecordById(current, nextAdmission));
    setPatients((current) =>
      current.map((patient) =>
        patient.id === nextAdmission.patientId ? mergePatientWithAdmission(patient, nextAdmission) : patient
      )
    );
    setInpatientOverviewEntries((current) => {
      const relatedPatient =
        relatedPatientOverride ??
        patients.find((patient) => patient.id === nextAdmission.patientId) ??
        patientDetailsCache[nextAdmission.patientId]?.patient ??
        null;
      if (!relatedPatient) {
        return current;
      }

      const previousEntry =
        current.find((entry) => entry.patientId === nextAdmission.patientId) ??
        null;
      return [
        buildInpatientEntryFromAdmission(mergePatientWithAdmission(relatedPatient, nextAdmission), nextAdmission, previousEntry),
        ...current.filter((entry) => entry.patientId !== nextAdmission.patientId)
      ];
    });
    mutateCachedPatientDetails(nextAdmission.patientId, (details) => ({
      ...details,
      patient: mergePatientWithAdmission(details.patient, nextAdmission),
      admissions: upsertRecordById(details.admissions, nextAdmission)
    }));
  }

  function appendPatientAllergyLocally(nextAllergy: PatientAllergyRecord): void {
    setPatientAllergies((current) => upsertRecordById(current, nextAllergy));
    mutateCachedPatientDetails(nextAllergy.patientId, (details) => ({
      ...details,
      allergies: upsertRecordById(details.allergies, nextAllergy)
    }));
  }

  function updatePatientAllergyLocally(nextAllergy: PatientAllergyRecord): void {
    setPatientAllergies((current) => upsertRecordById(current, nextAllergy));
    mutateCachedPatientDetails(nextAllergy.patientId, (details) => ({
      ...details,
      allergies: upsertRecordById(details.allergies, nextAllergy)
    }));
  }

  function removePatientAllergyLocally(patientId: number, allergyId: number): void {
    setPatientAllergies((current) => removeRecordById(current, allergyId));
    mutateCachedPatientDetails(patientId, (details) => ({
      ...details,
      allergies: removeRecordById(details.allergies, allergyId)
    }));
  }

  function appendPriorMedicationLocally(nextMedication: PriorMedicationRecord): void {
    setPriorMedications((current) => upsertRecordById(current, nextMedication));
    mutateCachedPatientDetails(nextMedication.patientId, (details) => ({
      ...details,
      priorMedications: upsertRecordById(details.priorMedications, nextMedication)
    }));
  }

  function updatePriorMedicationLocally(nextMedication: PriorMedicationRecord): void {
    setPriorMedications((current) => upsertRecordById(current, nextMedication));
    mutateCachedPatientDetails(nextMedication.patientId, (details) => ({
      ...details,
      priorMedications: upsertRecordById(details.priorMedications, nextMedication)
    }));
  }

  function removePriorMedicationLocally(patientId: number, priorMedicationId: number): void {
    setPriorMedications((current) => removeRecordById(current, priorMedicationId));
    mutateCachedPatientDetails(patientId, (details) => ({
      ...details,
      priorMedications: removeRecordById(details.priorMedications, priorMedicationId)
    }));
  }

  function appendPrescriptionLocally(nextPrescription: MedicalPrescriptionRecord): void {
    setPrescriptions((current) => upsertRecordById(current, nextPrescription));
    mutateCachedPatientDetails(nextPrescription.patientId, (details) => ({
      ...details,
      prescriptions: upsertRecordById(details.prescriptions, nextPrescription)
    }));
  }

  function updatePrescriptionLocally(nextPrescription: MedicalPrescriptionRecord): void {
    setPrescriptions((current) => upsertRecordById(current, nextPrescription));
    mutateCachedPatientDetails(nextPrescription.patientId, (details) => ({
      ...details,
      prescriptions: upsertRecordById(details.prescriptions, nextPrescription)
    }));
  }

  function appendExamImportLocally(nextExamImport: PatientExamImportRecord): void {
    setExamImports((current) => upsertRecordById(current, nextExamImport));
    mutateCachedPatientDetails(nextExamImport.patientId, (details) => ({
      ...details,
      examImports: upsertRecordById(details.examImports, nextExamImport)
    }));
  }

  function updateExamImportLocally(nextExamImport: PatientExamImportRecord): void {
    setExamImports((current) => upsertRecordById(current, nextExamImport));
    mutateCachedPatientDetails(nextExamImport.patientId, (details) => ({
      ...details,
      examImports: upsertRecordById(details.examImports, nextExamImport)
    }));
  }

  function appendAdmissionRoundNoteLocally(nextRoundNote: AdmissionRoundNoteRecord): void {
    setRoundNotes((current) => upsertRecordById(current, nextRoundNote));
    mutateCachedPatientDetails(nextRoundNote.patientId, (details) => ({
      ...details,
      roundNotes: upsertRecordById(details.roundNotes, nextRoundNote)
    }));
  }

  function removeExamImportLocally(patientId: number, examImportId: number): void {
    setExamImports((current) => removeRecordById(current, examImportId));
    mutateCachedPatientDetails(patientId, (details) => ({
      ...details,
      examImports: removeRecordById(details.examImports, examImportId)
    }));
  }

  async function loadPatientDetails(patientId: number, options?: { force?: boolean }): Promise<void> {
    if (!options?.force && patientDetailsCache[patientId]) {
      return;
    }

    setPatientDetailsLoadingId(patientId);
    setPatientDetailsError(null);

    try {
      const response = await fetch(`/api/patients/${patientId}/dashboard`);
      const result = (await response.json()) as {
        message?: string;
        patientDetails?: PatientDashboardDetails;
      };

      if (!response.ok || !result.patientDetails) {
        throw new Error(result.message || "Não foi possível carregar os dados do paciente.");
      }

      setPatientDetailsCache((current) => ({
        ...current,
        [patientId]: result.patientDetails!
      }));
    } catch (error) {
      setPatientDetailsError(
        error instanceof Error ? error.message : "Não foi possível carregar os dados do paciente."
      );
    } finally {
      setPatientDetailsLoadingId((current) => (current === patientId ? null : current));
    }
  }

  function pushDashboardUrl(url: string): void {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(url, window.location.origin);
    window.history.pushState(window.history.state, "", nextUrl);
    setDashboardRouteSnapshot(parseDashboardRouteSnapshot(nextUrl.searchParams));
  }

  function refreshDashboard(label = "Atualizando painel..."): void {
    setDashboardTransitionLabel(label);
    setPatientDetailsCache({});
    startDashboardTransition(() => {
      router.refresh();
    });
  }

  function buildDashboardUrl(options?: {
    section?: DashboardSectionId;
    inpatientMode?: InpatientOverviewMode;
    patientId?: number;
    patientView?: PatientViewId;
  }): string {
    const params = new URLSearchParams();

    if (options?.section) {
      params.set("section", options.section);
    }

    if (options?.inpatientMode) {
      params.set("inpatientMode", options.inpatientMode);
    }

    if (typeof options?.patientId === "number" && options.patientId > 0) {
      params.set("patientId", String(options.patientId));
    }

    if (options?.patientView) {
      params.set("patientView", options.patientView);
    }

    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  }

  function replaceDashboardUrl(url: string): void {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(url, window.location.origin);
    window.history.replaceState(window.history.state, "", nextUrl);
    setDashboardRouteSnapshot(parseDashboardRouteSnapshot(nextUrl.searchParams));
  }

  function toggleList(sectionId: DashboardSectionId): void {
    setListVisibility((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  function updatePriorMedicationReconciliationField(
    priorMedicationId: number,
    field: keyof PriorMedicationReconciliationFormState,
    value: string
  ): void {
    setPriorMedicationReconciliationForm((current) => ({
      ...current,
      [priorMedicationId]: {
        ...(current[priorMedicationId] ?? createPriorMedicationReconciliationFormState()),
        [field]: value
      }
    }));
  }

  function updateMedicationValidationField(
    prescriptionId: number,
    field: keyof StockValidationFormState,
    value: StockValidationFormState[keyof StockValidationFormState]
  ): void {
    setMedicationValidationForm((current) => ({
      ...current,
      [prescriptionId]: {
        ...(current[prescriptionId] ?? createEmptyStockValidationFormState()),
        [field]: value
      }
    }));
  }

  function toggleMedicationDidNotBring(prescriptionId: number, checked: boolean): void {
    setMedicationValidationForm((current) => {
      const nextState = {
        ...(current[prescriptionId] ?? createEmptyStockValidationFormState()),
        patientDidNotBring: checked
      };

      if (checked) {
        nextState.quantityTablets = "";
        nextState.lotNumber = "";
        nextState.expirationDate = "";
        nextState.manufacturer = "";
      }

      return {
        ...current,
        [prescriptionId]: nextState
      };
    });
  }

  function openDashboardSection(sectionId: DashboardSectionId): void {
    setPatientPageOverride(false);
    setActiveSection(sectionId);
    setPatientDetailsOpen(false);
    setSelectedPrescriptionMedicationHistory(null);
    pushDashboardUrl(buildDashboardUrl({ section: sectionId }));
  }

  function openInpatientOverview(mode: InpatientOverviewMode): void {
    setPatientPageOverride(false);
    setActiveSection("inpatients");
    setInpatientOverviewMode(mode);
    setPatientDetailsOpen(false);
    setSelectedPrescriptionMedicationHistory(null);
    pushDashboardUrl(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: mode
      })
    );
  }

  function openPatientView(view: PatientViewId): void {
    setPatientView(view);

    if (!effectivePatientPageMode || !selectedPatientId) {
      return;
    }

    replaceDashboardUrl(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: inpatientOverviewMode,
        patientId: Number(selectedPatientId),
        patientView: view
      })
    );
  }

  function openPatientDetails(patientId: number, targetView: PatientViewId = "admission-info"): void {
    const nextInpatientMode =
      activeSection === "inpatients" ? inpatientOverviewMode : requestedInpatientMode;

    setPatientPageOverride(true);
    setActiveSection("inpatients");
    setListVisibility((current) => ({ ...current, inpatients: true }));
    setSelectedPatientId(String(patientId));
    setPatientView(targetView);
    setPatientDetailsOpen(true);
    setSelectedPrescriptionMedicationHistory(null);
    pushDashboardUrl(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: nextInpatientMode,
        patientId,
        patientView: targetView
      })
    );
    void loadPatientDetails(patientId);
  }

  function closePatientDetailsPage(): void {
    setPatientPageOverride(false);
    setActiveSection("inpatients");
    setInpatientOverviewMode(requestedInpatientMode);
    setPatientDetailsOpen(false);
    setSelectedPrescriptionMedicationHistory(null);
    pushDashboardUrl(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: inpatientOverviewMode
      })
    );
  }

  function renderMedicationFlags(
    allergyConflict: AllergyConflictResult | null,
    safetyFlags: MedicationSafetyFlags
  ) {
    if (!allergyConflict && !hasMedicationSafetyFlag(safetyFlags)) {
      return "-";
    }

    return (
      <div className="dashboard-flag-list">
        {allergyConflict ? (
          <span
            className="dashboard-status-pill is-allergy"
            title={buildAllergyConflictBadge(allergyConflict)}
            aria-label={buildAllergyConflictBadge(allergyConflict)}
          >
            (A)
          </span>
        ) : null}
        {safetyFlags.renalAdjustment ? (
          <span
            className="dashboard-status-pill is-renal"
            title="Ajuste para função renal"
            aria-label="Ajuste para função renal"
          >
            (FR)
          </span>
        ) : null}
        {safetyFlags.hepatotoxic ? (
          <span
            className="dashboard-status-pill is-hepatic"
            title="Medicamento hepatotóxico"
            aria-label="Medicamento hepatotóxico"
          >
            (HT)
          </span>
        ) : null}
      </div>
    );
  }

  function buildRawPrescriptionDrafts(
    rawInput: string,
    sharedSet: { startAt: string; endAt: string; status: string }
  ): {
    drafts: RawPrescriptionDraft[];
    detectedSet: { startAt: string; endAt: string; status: string };
  } {
    const blocks = parseRawPrescriptionBlocks(rawInput);
    const detectedSet = inferRawPrescriptionSharedSet(blocks);

    const drafts = blocks.map((block) => {
      const validationStartRaw = block.validationStartRaw || sharedSet.startAt;
      const validationEndRaw = block.validationEndRaw || sharedSet.endAt;
      const validationStatus = (block.validationStatus || sharedSet.status).trim() || "Validado";
      const validationStartAt = normalizeHospitalDateTime(validationStartRaw);
      const validationEndAt = normalizeHospitalDateTime(validationEndRaw);

      let medicationName = "";
      let parsedDose = { dose: null as number | null, doseUnit: "" };
      let administrationRoute = "";
      let frequency = "";
      let shifts = "";
      let notes = "";

      const hospitalPattern = block.prescriptionContent.match(/^(.*?)\s+-\s+Administrar\s+(.+)$/i);
      if (hospitalPattern) {
        medicationName = hospitalPattern[1].replace(/^\([^)]*\)\s*/, "").trim();
        const administrationParts = hospitalPattern[2]
          .split(";")
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

        parsedDose = parseDosePart(administrationParts[0] ?? "");
        administrationRoute = administrationParts[1] ?? "";
        frequency = administrationParts[2] ?? "";
        shifts = administrationParts[3] ?? "";
        notes = administrationParts.slice(4).join("; ");
      } else {
        const splitParts = block.prescriptionContent.includes(";")
          ? block.prescriptionContent.split(";")
          : block.prescriptionContent.includes("|")
            ? block.prescriptionContent.split("|")
            : block.prescriptionContent.split(/\s+-\s+/);
        const parts = splitParts.map((part) => part.trim()).filter((part) => part.length > 0);
        medicationName = (parts[0] ?? "").replace(/^\([^)]*\)\s*/, "").trim();
        parsedDose = parseDosePart(parts[1] ?? "");
        administrationRoute = parts[2] ?? "";
        frequency = parts[3] ?? "";
        shifts = parts[4] ?? "";
        notes = parts[5] ?? "";
      }

      const sanitizedMedication = sanitizeMedicationName(medicationName);
      const referenceMedicationName = sanitizedMedication.medicationName;
      const storedMedicationName = getPrescriptionMedicationDisplayName(
        medicationName,
        sanitizedMedication.isNonCatalog
      );

      const matchedMedication = findCatalogMedicationMatchByName(referenceMedicationName);
      const allergyConflict = resolveAllergyConflict(referenceMedicationName);
      const safetyFlags = resolveMedicationSafetyFlags(referenceMedicationName);

      const fallbackUnit = matchedMedication?.defaultUnit ?? "";
      const doseUnit = parsedDose.doseUnit || fallbackUnit;

      let validationMessage = "";
      if (!referenceMedicationName) {
        validationMessage = "Nome do medicamento ausente.";
      } else if (!parsedDose.dose || parsedDose.dose <= 0) {
        validationMessage = "Dose inválida.";
      } else if (!doseUnit) {
        validationMessage = "Unidade da dose ausente.";
      } else if (!administrationRoute) {
        validationMessage = "Via de administração ausente.";
      } else if (!frequency) {
        validationMessage = "Frequência ausente.";
      } else if ((validationStartRaw && !validationStartAt) || (validationEndRaw && !validationEndAt)) {
        validationMessage = "Formato de data inválido. Use dd/mm/aaaa hh:mm.";
      }

      return {
        lineNumber: block.lineNumber,
        rawLine: block.rawLine,
        medicationId: matchedMedication?.id ?? null,
        medicationName: storedMedicationName,
        dose: parsedDose.dose,
        doseUnit,
        administrationRoute,
        frequency,
        shifts: shifts || "-",
        notes,
        validationStartAt,
        validationEndAt,
        validationStatus,
        allergyConflict,
        safetyFlags,
        isValid: validationMessage.length === 0,
        validationMessage: validationMessage || "Linha pronta para importação.",
        shouldAddToPriorMedicationValidation: sanitizedMedication.isNonCatalog
      };
    });

    return { drafts, detectedSet };
  }

  function handleProcessRawPrescription(): void {
    setRawPrescriptionFeedback(null);
    const { drafts } = buildRawPrescriptionDrafts(rawPrescriptionInput, {
      startAt: "",
      endAt: "",
      status: "Validado"
    });

    if (drafts.length === 0) {
      setRawPrescriptionFeedback({
        type: "error",
        message: "Cole ao menos uma linha de prescrição bruta para tratar."
      });
      setRawPrescriptionDrafts([]);
      return;
    }

    const validCount = drafts.filter((draft) => draft.isValid).length;
    setRawPrescriptionDrafts(drafts);
    setRawPrescriptionFeedback({
      type: validCount > 0 ? "success" : "error",
      message:
        validCount > 0
          ? `${validCount} linha(s) tratada(s) e pronta(s) para importação.`
          : "Nenhuma linha válida encontrada. Ajuste o formato e tente novamente."
    });
  }

  function handleAddInitialPatientAllergy(): void {
    const nextAllergy = selectedInitialAllergyMedication?.name ?? "";
    if (!nextAllergy) {
      return;
    }

    setPatientForm((current) => {
      const hasAllergy = current.allergies.some(
        (allergy) => allergy.toLocaleLowerCase() === nextAllergy.toLocaleLowerCase()
      );
      if (hasAllergy) {
        return current;
      }
      return {
        ...current,
        allergies: [...current.allergies, nextAllergy]
      };
    });

    setPatientInitialAllergyForm({
      medicationId: medications[0] ? String(medications[0].id) : ""
    });
  }

  function handleRemoveInitialPatientAllergy(allergyToRemove: string): void {
    setPatientForm((current) => ({
      ...current,
      allergies: current.allergies.filter(
        (allergy) => allergy.toLocaleLowerCase() !== allergyToRemove.toLocaleLowerCase()
      )
    }));
  }

  function resetProfessionalForm(): void {
    setEditingProfessionalId(null);
    setProfessionalForm({
      fullName: "",
      profession: "Farmacêutico",
      isTrainee: false,
      supervisingPharmacistId: "",
      councilType: "CRF",
      councilNumber: "",
      stateUf: "RS",
      login: "",
      password: "",
      institution: ""
    });
  }

  function startProfessionalEdit(professional: ProfessionalRecord): void {
    setEditingProfessionalId(professional.id);
    setProfessionalFeedback(null);
    setProfessionalForm({
      fullName: professional.fullName,
      profession: professional.profession,
      isTrainee: professional.isTrainee,
      supervisingPharmacistId: professional.supervisingPharmacistId
        ? String(professional.supervisingPharmacistId)
        : "",
      councilType: professional.councilType ?? "CRF",
      councilNumber: professional.councilNumber ?? "",
      stateUf: professional.stateUf ?? "RS",
      login: professional.login,
      password: "",
      institution: professional.institution
    });
  }

  async function handleProfessionalSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setProfessionalFeedback(null);
    setProfessionalLoading(true);

    try {
      const response = await fetch("/api/professionals", {
        method: editingProfessionalId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...professionalForm,
          professionalId: editingProfessionalId ?? undefined
        })
      });

      const result = (await response.json()) as {
        message?: string;
        professional?: ProfessionalRecord;
      };
      if (!response.ok || !result.professional) {
        setProfessionalFeedback({
          type: "error",
          message: result.message ?? "Não foi possível cadastrar o profissional."
        });
        return;
      }

      setProfessionalFeedback({
        type: "success",
        message:
          editingProfessionalId === null
            ? "Profissional cadastrado com sucesso."
            : "Profissional atualizado com sucesso."
      });
      resetProfessionalForm();
      setProfessionals((current) => upsertRecordById(current, result.professional!));
    } catch {
      setProfessionalFeedback({
        type: "error",
        message:
          editingProfessionalId === null
            ? "Erro de conexão ao cadastrar profissional."
            : "Erro de conexão ao atualizar profissional."
      });
    } finally {
      setProfessionalLoading(false);
    }
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setTeamFeedback(null);
    setTeamLoading(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName })
      });

      const result = (await response.json()) as {
        message?: string;
        team?: TeamRecord;
      };
      if (!response.ok || !result.team) {
        setTeamFeedback({ type: "error", message: result.message ?? "Falha ao cadastrar equipe." });
        return;
      }

      setTeamFeedback({ type: "success", message: "Equipe cadastrada com sucesso." });
      setTeamName("");
      setTeams((current) => upsertRecordById(current, result.team!));
    } catch {
      setTeamFeedback({ type: "error", message: "Erro de conexão ao cadastrar equipe." });
    } finally {
      setTeamLoading(false);
    }
  }

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPatientFeedback(null);

    const normalizedBirthDate = patientForm.birthDate.trim()
      ? normalizeAdmissionDateValue(patientForm.birthDate)
      : null;
    if (patientForm.birthDate.trim() && !normalizedBirthDate) {
      setPatientFeedback({
        type: "error",
        message: "Informe a data de nascimento no formato DD/MM/AAAA."
      });
      return;
    }

    setPatientLoading(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...patientForm,
          birthDate: normalizedBirthDate ?? ""
        })
      });

      const result = (await response.json()) as {
        message?: string;
        patient?: PatientRecord;
      };
      if (!response.ok || !result.patient) {
        setPatientFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar paciente."
        });
        return;
      }

      setPatientFeedback({ type: "success", message: "Paciente cadastrado com sucesso." });
      setPatientForm({
        fullName: "",
        chartNumber: "",
        birthDate: "",
        sex: "",
        allergies: []
      });
      setPatientInitialAllergyForm({
        medicationId: medications[0] ? String(medications[0].id) : ""
      });
      upsertPatientRecordLocally(result.patient!);
    } catch {
      setPatientFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar paciente."
      });
    } finally {
      setPatientLoading(false);
    }
  }

  async function persistAdmissionForm(options?: {
    analyzeSummary?: boolean;
    requireExistingAdmission?: boolean;
    missingAdmissionMessage?: string;
    successMessage?: string;
    connectionErrorMessage?: string;
  }): Promise<boolean> {
    setAdmissionFeedback(null);
    setEvolutionFeedback(null);

    if (!selectedPatient) {
      setAdmissionFeedback({
        type: "error",
        message: "Selecione um paciente internado para cadastrar a internação."
      });
      return false;
    }

    if (options?.requireExistingAdmission && !admissionForm.admissionId.trim()) {
      setAdmissionFeedback({
        type: "error",
        message:
          options.missingAdmissionMessage ??
          "Salve primeiro as informações da internação para registrar a entrevista."
      });
      return false;
    }

    const normalizedAdmissionDate = normalizeAdmissionDateValue(admissionForm.admissionDate);
    if (!normalizedAdmissionDate) {
      setAdmissionFeedback({
        type: "error",
        message: "Informe a admissão no formato DD/MM/AAAA."
      });
      return false;
    }

    const normalizedBirthDate = selectedPatientProfileForm.birthDate.trim()
      ? normalizeAdmissionDateValue(selectedPatientProfileForm.birthDate)
      : null;
    const normalizedPatientSex = PATIENT_SEX_OPTIONS.includes(selectedPatientProfileForm.sex as PatientSex)
      ? (selectedPatientProfileForm.sex as PatientSex)
      : null;
    if (selectedPatientProfileForm.birthDate.trim() && !normalizedBirthDate) {
      setAdmissionFeedback({
        type: "error",
        message: "Informe a data de nascimento no formato DD/MM/AAAA."
      });
      return false;
    }

    setAdmissionLoading(true);

    try {
      const shouldUpdatePatientProfile =
        (normalizedBirthDate !== null && normalizedBirthDate !== selectedPatient.birthDate) ||
        normalizedPatientSex !== selectedPatient.sex;

      if (shouldUpdatePatientProfile) {
        const patientResponse = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: selectedPatient.fullName,
            chartNumber: selectedPatient.chartNumber,
            birthDate: normalizedBirthDate,
            sex: normalizedPatientSex,
            allergies: []
          })
        });

        const patientResult = (await patientResponse.json()) as {
          message?: string;
          patient?: PatientRecord;
        };
        if (!patientResponse.ok || !patientResult.patient) {
          setAdmissionFeedback({
            type: "error",
            message: patientResult.message ?? "Falha ao atualizar os dados do paciente."
          });
          return false;
        }

        upsertPatientRecordLocally(patientResult.patient);
      }

      const shouldUpdateAdmission = admissionForm.admissionId.trim().length > 0;
      const response = await fetch("/api/admissions", {
        method: shouldUpdateAdmission ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...admissionForm,
          admissionDate: normalizedAdmissionDate,
          roundSummary: undefined,
          roundSummaryDate: undefined,
          admissionId: shouldUpdateAdmission ? Number(admissionForm.admissionId) : undefined,
          patientId: selectedPatient.id,
          teamId: admissionForm.teamId ? Number(admissionForm.teamId) : undefined,
          weightKg: admissionForm.weightKg ? Number(admissionForm.weightKg) : undefined,
          heightCm: admissionForm.heightCm ? Number(admissionForm.heightCm) : undefined,
          deniesContinuousMedicationUse: admissionForm.deniesContinuousMedicationUse
        })
      });

      const result = (await response.json()) as {
        message?: string;
        admission?: AdmissionRecord;
      };
      if (!response.ok || !result.admission) {
        setAdmissionFeedback({
          type: "error",
          message: result.message ?? "Falha ao salvar internação."
        });
        return false;
      }

      let autofillDetails = "";
      if (options?.analyzeSummary !== false) {
        const summaryAutofill = await autoPopulateFromAdmissionSummary(
          selectedPatient.id,
          admissionForm.admissionImportExcerpt
        );
        autofillDetails =
          summaryAutofill.addedPriorMedications > 0
            ? `${summaryAutofill.addedPriorMedications} medicamento(s) prévio(s) identificado(s)`
            : "";
      }

      setAdmissionFeedback({
        type: "success",
        message: `${
          options?.successMessage ??
          (shouldUpdateAdmission ? "Internação atualizada com sucesso." : "Internação cadastrada com sucesso.")
        }${autofillDetails ? ` Trecho de MUC analisado: ${autofillDetails}.` : ""}`
      });
      const savedAdmission = result.admission;
      const trackedInpatientEntry = buildInpatientEntryFromAdmission(
        mergePatientWithAdmission(selectedPatient, savedAdmission),
        savedAdmission,
        selectedInpatientEntry
      );
      setTrackedInpatientEntries((current) => {
        const existingEntry = current.find((entry) => entry.key === trackedInpatientEntry.key) ?? null;
        if (!existingEntry) {
          return [trackedInpatientEntry, ...current];
        }

        if (areInpatientEntriesEquivalent(existingEntry, trackedInpatientEntry)) {
          return current;
        }

        return current.map((entry) =>
          entry.key === trackedInpatientEntry.key ? trackedInpatientEntry : entry
        );
      });
      setWorkflowByInpatientKey((current) => {
        const now = new Date().toISOString();
        const currentWorkflow = current[trackedInpatientEntry.key] ?? null;
        const assignedTeamId = savedAdmission.teamId ?? trackedInpatientEntry.teamId ?? null;

        if (!currentWorkflow || !shouldUpdateAdmission) {
          return {
            ...current,
            [trackedInpatientEntry.key]: {
              status: "Pendente",
              assignedTeamId,
              mandatory: true,
              firstVisitCompletedAt: null,
              evolutionGeneratedAt: null,
              updatedByProfessionalName: currentWorkflowEditorName,
              updatedByProfessionalLogin: currentWorkflowEditorLogin,
              updatedAt: now
            }
          };
        }

        if (currentWorkflow.assignedTeamId === assignedTeamId) {
          return current;
        }

        return {
          ...current,
          [trackedInpatientEntry.key]: {
            ...currentWorkflow,
            assignedTeamId,
            updatedByProfessionalName: currentWorkflowEditorName,
            updatedByProfessionalLogin: currentWorkflowEditorLogin,
            updatedAt: now
          }
        };
      });
      upsertAdmissionRecordLocally(savedAdmission, selectedPatient);
      setAdmissionForm(createEmptyAdmissionFormState());
      return true;
    } catch {
      setAdmissionFeedback({
        type: "error",
        message: options?.connectionErrorMessage ?? "Erro de conexão ao salvar internação."
      });
      return false;
    } finally {
      setAdmissionLoading(false);
    }
  }

  async function handleAdmissionSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await persistAdmissionForm({ analyzeSummary: true });
  }

  async function handleInterviewSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await persistAdmissionForm({
      analyzeSummary: false,
      requireExistingAdmission: true,
      successMessage: "Entrevista salva com sucesso.",
      connectionErrorMessage: "Erro de conexão ao salvar entrevista."
    });
  }

  async function handleRoundSummarySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRoundSummaryFeedback(null);

    if (!selectedPatient) {
      setRoundSummaryFeedback({
        type: "error",
        message: "Selecione um paciente internado para registrar o resumo do round."
      });
      return;
    }

    const admissionId = Number(admissionForm.admissionId);
    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      setRoundSummaryFeedback({
        type: "error",
        message: "Salve primeiro as informações da internação para registrar o resumo do round."
      });
      return;
    }

    const note = admissionForm.roundSummary.trim();
    if (!note) {
      setRoundSummaryFeedback({
        type: "error",
        message: "Escreva o comentário do round antes de salvar."
      });
      return;
    }

    const normalizedRoundSummaryDate = admissionForm.roundSummaryDate.trim()
      ? normalizeAdmissionDateValue(admissionForm.roundSummaryDate)
      : normalizeAdmissionDateValue(getCurrentFormattedDateValue());
    if (!normalizedRoundSummaryDate) {
      setRoundSummaryFeedback({
        type: "error",
        message: "Informe a data do round no formato DD/MM/AAAA."
      });
      return;
    }

    setRoundSummaryLoading(true);

    try {
      const response = await fetch(`/api/admissions/${admissionId}/round-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note,
          roundDate: normalizedRoundSummaryDate
        })
      });
      const result = (await response.json()) as {
        message?: string;
        roundNote?: AdmissionRoundNoteRecord;
      };

      if (!response.ok || !result.roundNote) {
        setRoundSummaryFeedback({
          type: "error",
          message: result.message ?? "Falha ao salvar o resumo do round."
        });
        return;
      }

      appendAdmissionRoundNoteLocally(result.roundNote);
      setAdmissionForm((current) => ({
        ...current,
        roundSummary: "",
        roundSummaryDate: getCurrentFormattedDateValue()
      }));
      setRoundSummaryFeedback({
        type: "success",
        message: "Resumo do round salvo com sucesso."
      });
    } catch {
      setRoundSummaryFeedback({
        type: "error",
        message: "Erro de conexão ao salvar resumo do round."
      });
    } finally {
      setRoundSummaryLoading(false);
    }
  }

  async function handleCopyEvolution(): Promise<void> {
    setEvolutionFeedback(null);

    if (!visibleInterviewEvolutionText.trim()) {
      setEvolutionFeedback({
        type: "error",
        message: "Preencha algum dado da entrevista para gerar a evolução."
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(visibleInterviewEvolutionText);
      setEvolutionFeedback({
        type: "success",
        message: "Padrão de evolução copiado."
      });
    } catch {
      setEvolutionFeedback({
        type: "error",
        message: "Não foi possível copiar a evolução."
      });
    }
  }

  async function handleMedicationSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMedicationFeedback(null);

    const medicationNameInput = medicationForm.name.trim();
    const hasDuplicateMedication = medications.some((medication) =>
      isMedicationNameCompatible(medication.name, medicationNameInput)
    );

    if (hasDuplicateMedication) {
      setMedicationFeedback({
        type: "error",
        message: "Medicamento já cadastrado. Evite duplicidade no nome."
      });
      return;
    }

    setMedicationLoading(true);

    try {
      const response = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicationForm)
      });

      const result = (await response.json()) as {
        message?: string;
        medication?: (typeof medications)[number];
      };
      if (!response.ok || !result.medication) {
        setMedicationFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar medicamento."
        });
        return;
      }

      setMedicationFeedback({ type: "success", message: "Medicamento cadastrado com sucesso." });
      setMedicationForm({
        name: "",
        defaultUnit: medicationForm.defaultUnit || "mg",
        activeIngredients: "",
        therapeuticClass: "",
        searchAliases: ""
      });
      setMedications((current) => upsertRecordById(current, result.medication!));
    } catch {
      setMedicationFeedback({ type: "error", message: "Erro de conexão ao cadastrar medicamento." });
    } finally {
      setMedicationLoading(false);
    }
  }

  async function handleMedicationBulkImport(): Promise<void> {
    setMedicationFeedback(null);

    const lines = medicationBulkInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setMedicationFeedback({
        type: "error",
        message: "Cole ao menos uma linha para importar medicamentos."
      });
      return;
    }

    const parsedItems: Array<{
      name: string;
      activeIngredients: string;
      therapeuticClass: string;
      searchAliases: string;
      defaultUnit: string;
    }> = [];

    for (const [index, line] of lines.entries()) {
      const columns = line
        .split(/\t|;|\|/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      const firstColumn = columns[0] ?? "";
      const isHeader =
        index === 0 &&
        normalizeSearchValue(firstColumn).includes("medicamento") &&
        normalizeSearchValue(columns[1] ?? "").includes("princip");
      if (isHeader) {
        continue;
      }

      const medicationName = firstColumn;
      if (!medicationName) {
        continue;
      }

      const activeIngredients = columns[1] ?? "";
      const therapeuticClass = columns[2] ?? "";
      const aliases = columns[3] ?? "";

      parsedItems.push({
        name: medicationName,
        activeIngredients,
        therapeuticClass,
        searchAliases: aliases,
        defaultUnit: medicationBulkDefaultUnit.trim() || "mg"
      });
    }

    if (parsedItems.length === 0) {
      setMedicationFeedback({
        type: "error",
        message: "Nenhuma linha válida encontrada. Use colunas: Nome, Princípio ativo e Classe."
      });
      return;
    }

    setMedicationBulkLoading(true);
    try {
      const response = await fetch("/api/medications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems })
      });

      const result = (await response.json()) as {
        message?: string;
        inserted?: number;
        updated?: number;
        skipped?: number;
      };
      if (!response.ok) {
        setMedicationFeedback({
          type: "error",
          message: result.message ?? "Falha ao importar medicamentos em lote."
        });
        return;
      }

      setMedicationFeedback({
        type: "success",
        message: `Importação concluída: ${result.inserted ?? 0} inserido(s), ${result.updated ?? 0} atualizado(s), ${result.skipped ?? 0} ignorado(s).`
      });
      setMedicationBulkInput("");
      refreshDashboard();
    } catch {
      setMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao importar medicamentos em lote."
      });
    } finally {
      setMedicationBulkLoading(false);
    }
  }

  async function handleAllergySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAllergyFeedback(null);

    if (!selectedPatient) {
      setAllergyFeedback({ type: "error", message: "Selecione um paciente para cadastrar alergia." });
      return;
    }

    const rawAllergyName = (allergyForm.selectedValue || allergyForm.query).trim();
    const reactionDescription = allergyForm.reactionDescription.trim();
    const allergyIdentityLabel = extractMedicationIdentityLabel(rawAllergyName);
    const allergyName = allergyIdentityLabel || rawAllergyName;

    if (!allergyName) {
      setAllergyFeedback({
        type: "error",
        message: "Informe uma alergia para registrar (medicamento, princípio ativo ou classe)."
      });
      return;
    }

    if (!allergyIdentityLabel && MEDICATION_VARIANT_STOPWORDS.has(normalizeMedicationName(rawAllergyName))) {
      setAllergyFeedback({
        type: "error",
        message: "Informe o nome do medicamento ou princípio ativo sem o sal (ex.: levotiroxina)."
      });
      return;
    }

    setAllergyLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/allergies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergyName, reactionDescription })
      });

      const result = (await response.json()) as {
        message?: string;
        allergy?: PatientAllergyRecord;
      };
      if (!response.ok || !result.allergy) {
        setAllergyFeedback({ type: "error", message: result.message ?? "Falha ao cadastrar alergia." });
        return;
      }

      setAllergyFeedback({ type: "success", message: "Alergia cadastrada com sucesso." });
      setShowAllergyComposer(false);
      setAllergyForm({ query: "", selectedValue: "", reactionDescription: "" });
      appendPatientAllergyLocally(result.allergy);
    } catch {
      setAllergyFeedback({ type: "error", message: "Erro de conexão ao cadastrar alergia." });
    } finally {
      setAllergyLoading(false);
    }
  }

  async function handleRemoveAllergy(allergyId: number, allergyName: string): Promise<void> {
    if (!selectedPatient) {
      setAllergyFeedback({ type: "error", message: "Selecione um paciente para remover a alergia." });
      return;
    }

    const confirmed = window.confirm(`Remover a alergia "${allergyName}" deste paciente?`);
    if (!confirmed) {
      return;
    }

    setAllergyFeedback(null);
    setAllergyRemovingId(allergyId);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/allergies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergyId })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAllergyFeedback({ type: "error", message: result.message ?? "Falha ao remover alergia." });
        return;
      }

      setAllergyFeedback({ type: "success", message: "Alergia removida com sucesso." });
      removePatientAllergyLocally(selectedPatient.id, allergyId);
    } catch {
      setAllergyFeedback({ type: "error", message: "Erro de conexão ao remover alergia." });
    } finally {
      setAllergyRemovingId(null);
    }
  }

  function startAllergyEdit(allergy: PatientAllergyRecord): void {
    setAllergyFeedback(null);
    setAllergyEditingId(allergy.id);
    setAllergyEditReactionDescription(allergy.reactionDescription ?? "");
  }

  function cancelAllergyEdit(): void {
    setAllergyEditingId(null);
    setAllergyEditReactionDescription("");
    setAllergyUpdatingId(null);
  }

  async function handleUpdateAllergy(allergy: PatientAllergyRecord): Promise<void> {
    if (!selectedPatient) {
      setAllergyFeedback({ type: "error", message: "Selecione um paciente para editar a alergia." });
      return;
    }

    setAllergyFeedback(null);
    setAllergyUpdatingId(allergy.id);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/allergies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergyId: allergy.id,
          reactionDescription: allergyEditReactionDescription
        })
      });

      const result = (await response.json()) as {
        message?: string;
        allergy?: PatientAllergyRecord;
      };
      if (!response.ok || !result.allergy) {
        setAllergyFeedback({ type: "error", message: result.message ?? "Falha ao atualizar alergia." });
        return;
      }

      setAllergyFeedback({ type: "success", message: "Reação da alergia atualizada com sucesso." });
      updatePatientAllergyLocally(result.allergy);
      cancelAllergyEdit();
    } catch {
      setAllergyFeedback({ type: "error", message: "Erro de conexão ao atualizar alergia." });
      setAllergyUpdatingId(null);
    }
  }

  async function handlePriorMedicationSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPriorMedicationFeedback(null);

    if (!selectedPatient) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Selecione um paciente para cadastrar medicamento prévio."
      });
      return;
    }

    const typedMedicationName = priorMedicationForm.medicationName.trim();
    if (!typedMedicationName) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Informe o medicamento para registrar o uso prévio."
      });
      return;
    }

    const matchedCatalogMedication = findCatalogMedicationMatchByName(typedMedicationName);
    const medicationIdToSave = matchedCatalogMedication ? String(matchedCatalogMedication.id) : "";
    const medicationNameToSave = matchedCatalogMedication
      ? matchedCatalogMedication.name
      : typedMedicationName;
    const doseToSave = parseOptionalDecimalInput(priorMedicationForm.dose);

    if (priorMedicationForm.dose.trim() && doseToSave === undefined) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Dose inválida. Use números com vírgula ou ponto."
      });
      return;
    }

    setPriorMedicationLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prior-medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: medicationIdToSave,
          medicationName: medicationNameToSave,
          dose: doseToSave,
          doseUnit: priorMedicationForm.doseUnit,
          frequency: priorMedicationForm.frequency,
          shifts: priorMedicationForm.shifts,
          quantityTablets: priorMedicationForm.quantityTablets
            ? Number(priorMedicationForm.quantityTablets)
            : undefined,
          lotNumber: priorMedicationForm.lotNumber,
          expirationDate: priorMedicationForm.expirationDate,
          manufacturer: priorMedicationForm.manufacturer
        })
      });

      const result = (await response.json()) as {
        message?: string;
        priorMedication?: PriorMedicationRecord;
      };
      if (!response.ok || !result.priorMedication) {
        setPriorMedicationFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar medicamento de uso prévio."
        });
        return;
      }

      setPriorMedicationFeedback({
        type: "success",
        message: "Medicamento de uso prévio cadastrado com sucesso."
      });

      if (!matchedCatalogMedication) {
        setManualPriorMedicationOptions((current) => {
          const hasMedication = current.some(
            (medicationName) =>
              normalizeMedicationName(medicationName) === normalizeMedicationName(medicationNameToSave)
          );
          if (hasMedication) {
            return current;
          }
          return [...current, medicationNameToSave];
        });
      }

      setPriorMedicationForm((current) => ({
        ...current,
        medicationId: "",
        medicationName: "",
        dose: "",
        frequency: "",
        shifts: "",
        quantityTablets: "",
        lotNumber: "",
        expirationDate: "",
        manufacturer: ""
      }));
      setAdmissionForm((current) => ({
        ...current,
        deniesContinuousMedicationUse: false
      }));
      appendPriorMedicationLocally(result.priorMedication);
    } catch {
      setPriorMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar medicamento de uso prévio."
      });
    } finally {
      setPriorMedicationLoading(false);
    }
  }

  async function submitPriorMedicationReconciliationUpdate(
    patientId: number,
    priorMedicationId: number,
    formState: PriorMedicationReconciliationFormState,
    referenceMedication: PriorMedicationRecord
  ): Promise<
    | { ok: true; priorMedication: PriorMedicationRecord; learnedMedication: MedicationRecord | null }
    | { ok: false; message: string }
  > {
    const trimmedDose = formState.dose.trim();
    const parsedDose = parseDosePart(trimmedDose);

    if (trimmedDose && parsedDose.dose === null) {
      return {
        ok: false,
        message: "Dose inválida. Use o padrão 100 mg ou deixe em branco."
      };
    }

    try {
      const response = await fetch(`/api/patients/${patientId}/prior-medications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priorMedicationId,
          dose: parsedDose.dose,
          doseUnit:
            parsedDose.dose !== null
              ? parsedDose.doseUnit || referenceMedication.doseUnit
              : "",
          frequency: formState.frequency,
          shifts: formState.shifts,
          reconciliationManualStatus:
            formState.reconciliationManualStatus === ""
              ? null
              : formState.reconciliationManualStatus === "sim",
          reconciliationPrescriptionId: formState.reconciliationPrescriptionId
            ? Number(formState.reconciliationPrescriptionId)
            : null
        })
      });

      const result = (await response.json()) as {
        message?: string;
        priorMedication?: PriorMedicationRecord;
        learnedMedication?: MedicationRecord | null;
      };
      if (!response.ok || !result.priorMedication) {
        return {
          ok: false,
          message: result.message ?? "Falha ao atualizar reconciliação do medicamento prévio."
        };
      }

      return {
        ok: true,
        priorMedication: result.priorMedication,
        learnedMedication: result.learnedMedication ?? null
      };
    } catch {
      return {
        ok: false,
        message: "Erro de conexão ao atualizar reconciliação do medicamento prévio."
      };
    }
  }

  async function handleUpdatePriorMedicationReconciliation(priorMedicationId: number): Promise<void> {
    if (!selectedPatient) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Selecione um paciente para atualizar o medicamento prévio."
      });
      return;
    }

    const row = priorMedicationEditableRows.find((currentRow) => currentRow.priorMedication.id === priorMedicationId);
    if (!row) {
      return;
    }

    setPriorMedicationFeedback(null);
    setPriorMedicationUpdatingId(priorMedicationId);

    try {
      const result = await submitPriorMedicationReconciliationUpdate(
        selectedPatient.id,
        priorMedicationId,
        row.formState,
        row.priorMedication
      );
      if (!result.ok) {
        setPriorMedicationFeedback({
          type: "error",
          message: result.message
        });
        return;
      }

      setPriorMedicationFeedback({
        type: "success",
        message: "Reconciliação do medicamento prévio atualizada."
      });
      updatePriorMedicationLocally(result.priorMedication);
      const learnedMedication = result.learnedMedication;
      if (learnedMedication) {
        setMedications((current) => upsertRecordById(current, learnedMedication));
      }
    } finally {
      setPriorMedicationUpdatingId(null);
    }
  }

  async function handleSaveAllPriorMedicationReconciliation(): Promise<void> {
    if (!selectedPatient) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Selecione um paciente para atualizar os medicamentos prévios."
      });
      return;
    }

    const changedRows = priorMedicationEditableRows.filter((row) => row.isDirty);
    const shouldPersistMucNegation = hasPriorMedicationNegationChange;
    if (changedRows.length === 0 && !shouldPersistMucNegation) {
      setPriorMedicationFeedback({
        type: "success",
        message: "Nenhuma alteração pendente nos medicamentos prévios."
      });
      return;
    }

    setPriorMedicationFeedback(null);
    setPriorMedicationBatchSaving(true);

    try {
      if (shouldPersistMucNegation) {
        if (!admissionForm.admissionId.trim()) {
          setPriorMedicationFeedback({
            type: "error",
            message: "Salve primeiro a internação para marcar nega uso de MUC."
          });
          return;
        }

        const savedAdmission = await persistAdmissionForm({
          analyzeSummary: false,
          requireExistingAdmission: true,
          missingAdmissionMessage: "Salve primeiro a internação para marcar nega uso de MUC.",
          successMessage: "Marcador de MUC atualizado.",
          connectionErrorMessage: "Erro de conexão ao salvar o marcador de MUC."
        });
        if (!savedAdmission) {
          return;
        }
      }

      if (changedRows.length === 0) {
        setPriorMedicationFeedback({
          type: "success",
          message: "Marcador de nega uso de MUC atualizado."
        });
        return;
      }

      const learnedMedications: MedicationRecord[] = [];
      const results = await Promise.allSettled(
        changedRows.map((row) =>
          submitPriorMedicationReconciliationUpdate(
            selectedPatient.id,
            row.priorMedication.id,
            row.formState,
            row.priorMedication
          )
        )
      );

      const successfulUpdates: PriorMedicationRecord[] = [];
      const failedMessages = results.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value.ok) {
            successfulUpdates.push(result.value.priorMedication);
            if (result.value.learnedMedication) {
              learnedMedications.push(result.value.learnedMedication);
            }
            return [];
          }

          return [`${changedRows[index].priorMedication.medicationName}: ${result.value.message}`];
        }

        return [`${changedRows[index].priorMedication.medicationName}: erro inesperado ao salvar.`];
      });

      if (failedMessages.length > 0) {
        setPriorMedicationFeedback({
          type: "error",
          message: failedMessages[0] ?? "Falha ao salvar os medicamentos prévios."
        });
        return;
      }

      setPriorMedicationFeedback({
        type: "success",
        message: `${
          changedRows.length
        } medicamento(s) prévio(s) atualizado(s).${
          shouldPersistMucNegation ? " Marcador de MUC também salvo." : ""
        }`
      });
      successfulUpdates.forEach((priorMedication) => {
        updatePriorMedicationLocally(priorMedication);
      });
      learnedMedications.forEach((medication) => {
        setMedications((current) => upsertRecordById(current, medication));
      });
    } finally {
      setPriorMedicationBatchSaving(false);
    }
  }

  async function submitMedicationValidationUpdate(
    patientId: number,
    prescriptionId: number,
    formState: StockValidationFormState
  ): Promise<{ ok: true; prescription: MedicalPrescriptionRecord } | { ok: false; message: string }> {
    try {
      const response = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          quantityTablets: formState.quantityTablets,
          lotNumber: formState.lotNumber,
          expirationDate: formState.expirationDate,
          manufacturer: formState.manufacturer,
          patientDidNotBring: formState.patientDidNotBring,
          stockValidationNote: formState.stockValidationNote
        })
      });

      const result = (await response.json()) as {
        message?: string;
        prescription?: MedicalPrescriptionRecord;
      };
      if (!response.ok || !result.prescription) {
        return {
          ok: false,
          message: result.message ?? "Falha ao atualizar validação do medicamento."
        };
      }

      return { ok: true, prescription: result.prescription };
    } catch {
      return {
        ok: false,
        message: "Erro de conexão ao atualizar validação do medicamento."
      };
    }
  }

  async function submitPrescriptionInterventionUpdate(
    patientId: number,
    prescriptionId: number,
    formState: PrescriptionInterventionFormState
  ): Promise<{ ok: true; prescription: MedicalPrescriptionRecord } | { ok: false; message: string }> {
    try {
      const response = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          interventionNotes: formState.interventionNotes,
          interventionErrorType: formState.interventionErrorType || null,
          interventionContactStatus: formState.interventionContactStatus || null,
          interventionRequestedToPrescriber:
            formState.interventionRequestedToPrescriber === ""
              ? null
              : formState.interventionRequestedToPrescriber === "sim",
          interventionResponse: formState.interventionResponse || null
        })
      });

      const result = (await response.json()) as {
        message?: string;
        prescription?: MedicalPrescriptionRecord;
      };
      if (!response.ok || !result.prescription) {
        return {
          ok: false,
          message: result.message ?? "Falha ao salvar a intervenção."
        };
      }

      return { ok: true, prescription: result.prescription };
    } catch {
      return {
        ok: false,
        message: "Erro de conexão ao salvar a intervenção."
      };
    }
  }

  function handleApplyInterventionReportRange(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalizedStart = normalizeAdmissionDateValue(interventionReportForm.startDate);
    const normalizedEnd = normalizeAdmissionDateValue(interventionReportForm.endDate);

    if (!normalizedStart || !normalizedEnd) {
      setInterventionReportFeedback({
        type: "error",
        message: "Informe o período no formato DD/MM/AAAA."
      });
      return;
    }

    if (normalizedStart > normalizedEnd) {
      setInterventionReportFeedback({
        type: "error",
        message: "A data inicial não pode ser maior que a data final."
      });
      return;
    }

    setAppliedInterventionReportRange({
      startDate: formatAdmissionDateValue(normalizedStart),
      endDate: formatAdmissionDateValue(normalizedEnd)
    });
    setInterventionReportFeedback({
      type: "success",
      message: "Período das intervenções atualizado."
    });
  }

  function handleExportInterventionReport(): void {
    if (interventionReportRows.length === 0) {
      setInterventionReportFeedback({
        type: "error",
        message: "Não há intervenções no período selecionado para exportar."
      });
      return;
    }

    const headers = [
      "Data",
      "N° Prontuário",
      "Leito",
      "Unidade",
      "Medicamento",
      "Tipo de Erro",
      "Contato",
      "Intervenção",
      "Realizada por"
    ];
    const lines = interventionReportRows.map((prescription) => {
      const contactValue =
        prescription.interventionContactStatus ??
        (prescription.interventionRequestedToPrescriber === true
          ? "Realizado"
          : prescription.interventionRequestedToPrescriber === false
            ? "Não realizado"
            : "");

      return [
        formatAdmissionDateValue(prescription.interventionRecordedAt ?? prescription.createdAt),
        prescription.chartNumber,
        prescription.bed ?? "",
        formatInterventionUnitLabel(prescription.teamName),
        getPrescriptionMedicationDisplayName(
          prescription.medicationName,
          prescription.externalValidationCandidate
        ),
        prescription.interventionErrorType ?? "",
        contactValue,
        prescription.interventionResponse ?? "",
        prescription.interventionProfessionalName ?? ""
      ];
    });

    const csvContent = [headers, ...lines]
      .map((columns) => columns.map((value) => escapeCsvCell(value)).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const startLabel =
      formatAdmissionDateValue(normalizeAdmissionDateValue(appliedInterventionReportRange.startDate)) ||
      "inicio";
    const endLabel =
      formatAdmissionDateValue(normalizeAdmissionDateValue(appliedInterventionReportRange.endDate)) ||
      "fim";

    anchor.href = downloadUrl;
    anchor.download = `intervencoes-${startLabel.replaceAll("/", "-")}-${endLabel.replaceAll("/", "-")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);

    setInterventionReportFeedback({
      type: "success",
      message: "Planilha exportada com sucesso."
    });
  }

  function handleApplyValidatedMedicationReportRange(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalizedStart = normalizeAdmissionDateValue(validatedMedicationReportForm.startDate);
    const normalizedEnd = normalizeAdmissionDateValue(validatedMedicationReportForm.endDate);

    if (!normalizedStart || !normalizedEnd) {
      setValidatedMedicationReportFeedback({
        type: "error",
        message: "Informe o período no formato DD/MM/AAAA."
      });
      return;
    }

    if (normalizedStart > normalizedEnd) {
      setValidatedMedicationReportFeedback({
        type: "error",
        message: "A data inicial não pode ser maior que a data final."
      });
      return;
    }

    setAppliedValidatedMedicationReportRange({
      startDate: formatAdmissionDateValue(normalizedStart),
      endDate: formatAdmissionDateValue(normalizedEnd)
    });
    setValidatedMedicationReportFeedback({
      type: "success",
      message: "Período dos medicamentos validados atualizado."
    });
  }

  function handleExportValidatedMedicationReport(): void {
    if (validatedMedicationReportRows.length === 0) {
      setValidatedMedicationReportFeedback({
        type: "error",
        message: "Não há medicamentos validados no período selecionado para exportar."
      });
      return;
    }

    const headers = [
      "LEITO",
      "PRONTUÁRIO",
      "PACIENTE",
      "MEDICAMENTO",
      "POSOLOGIA",
      "QTD",
      "LAB",
      "LOTE",
      "VAL",
      "VALIDADO POR",
      "DATA VALIDAÇÃO",
      "REVALIDAR"
    ];
    const lines = validatedMedicationReportRows.map((row) => [
      row.prescription.bed ?? "",
      row.prescription.chartNumber,
      row.prescription.patientName,
      row.displayMedicationName,
      row.posology,
      row.prescription.quantityTablets === null ? "" : String(row.prescription.quantityTablets),
      row.prescription.manufacturer ?? "",
      row.prescription.lotNumber ?? "",
      row.prescription.expirationDate
        ? formatMedicationValidationExpiry(row.prescription.expirationDate)
        : "",
      row.prescription.stockValidationProfessionalName ?? "",
      formatAdmissionDateValue(row.validationRecordedAt),
      row.revalidationDate ? formatAdmissionDateValue(row.revalidationDate) : ""
    ]);

    const csvContent = [headers, ...lines]
      .map((columns) => columns.map((value) => escapeCsvCell(value)).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const startLabel =
      formatAdmissionDateValue(normalizeAdmissionDateValue(appliedValidatedMedicationReportRange.startDate)) ||
      "inicio";
    const endLabel =
      formatAdmissionDateValue(normalizeAdmissionDateValue(appliedValidatedMedicationReportRange.endDate)) ||
      "fim";

    anchor.href = downloadUrl;
    anchor.download = `medicamentos-validados-${startLabel.replaceAll("/", "-")}-${endLabel.replaceAll("/", "-")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);

    setValidatedMedicationReportFeedback({
      type: "success",
      message: "Planilha exportada com sucesso."
    });
  }

  async function handleSavePrescriptionIntervention(
    prescriptionId: number,
    formState: PrescriptionInterventionFormState
  ): Promise<void> {
    if (!selectedPatient) {
      setPrescriptionFeedback({
        type: "error",
        message: "Selecione um paciente para registrar a intervenção."
      });
      return;
    }

    setPrescriptionFeedback(null);
    setPrescriptionInterventionSavingId(prescriptionId);

    try {
      const result = await submitPrescriptionInterventionUpdate(
        selectedPatient.id,
        prescriptionId,
        formState
      );

      if (!result.ok) {
        setPrescriptionFeedback({
          type: "error",
          message: result.message
        });
        return;
      }

      setPrescriptionFeedback({
        type: "success",
        message: "Intervenção registrada na prescrição."
      });
      updatePrescriptionLocally(result.prescription);
    } finally {
      setPrescriptionInterventionSavingId(null);
    }
  }

  async function handleUpdateMedicationValidation(prescriptionId: number): Promise<void> {
    if (!selectedPatient) {
      setPrescriptionFeedback({
        type: "error",
        message: "Selecione um paciente para atualizar a validação do medicamento."
      });
      return;
    }

    const formState = medicationValidationForm[prescriptionId];
    if (!formState) {
      return;
    }

    setPrescriptionFeedback(null);
    setMedicationValidationUpdatingId(prescriptionId);

    try {
      const result = await submitMedicationValidationUpdate(
        selectedPatient.id,
        prescriptionId,
        formState
      );
      if (!result.ok) {
        setPrescriptionFeedback({
          type: "error",
          message: result.message
        });
        return;
      }

      setPrescriptionFeedback({
        type: "success",
        message: "Validação do medicamento atualizada."
      });
      updatePrescriptionLocally(result.prescription);
    } finally {
      setMedicationValidationUpdatingId(null);
    }
  }

  async function handleSaveAllMedicationValidation(): Promise<void> {
    if (!selectedPatient) {
      setPrescriptionFeedback({
        type: "error",
        message: "Selecione um paciente para atualizar a validação dos medicamentos."
      });
      return;
    }

    const changedRows = medicationValidationEditableRows.filter((row) => row.isDirty);
    if (changedRows.length === 0) {
      setPrescriptionFeedback({
        type: "success",
        message: "Nenhuma alteração pendente na validação de medicamentos."
      });
      return;
    }

    setPrescriptionFeedback(null);
    setMedicationValidationBatchSaving(true);

    try {
      const results = await Promise.allSettled(
        changedRows.map((row) =>
          submitMedicationValidationUpdate(selectedPatient.id, row.prescription.id, row.formState)
        )
      );

      const successfulUpdates: MedicalPrescriptionRecord[] = [];
      const failedMessages = results.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value.ok) {
            successfulUpdates.push(result.value.prescription);
            return [];
          }

          return [`${changedRows[index].displayMedicationName}: ${result.value.message}`];
        }

        return [`${changedRows[index].displayMedicationName}: erro inesperado ao salvar.`];
      });

      if (failedMessages.length > 0) {
        setPrescriptionFeedback({
          type: "error",
          message: failedMessages[0] ?? "Falha ao salvar a validação dos medicamentos."
        });
        return;
      }

      setPrescriptionFeedback({
        type: "success",
        message: `${changedRows.length} medicamento(s) validado(s) atualizado(s).`
      });
      successfulUpdates.forEach((prescription) => {
        updatePrescriptionLocally(prescription);
      });
    } finally {
      setMedicationValidationBatchSaving(false);
    }
  }

  async function handleRemovePriorMedication(
    priorMedicationId: number,
    medicationName: string
  ): Promise<void> {
    if (!selectedPatient) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Selecione um paciente para remover o medicamento prévio."
      });
      return;
    }

    const confirmed = window.confirm(
      `Remover o medicamento prévio "${medicationName}" deste paciente?`
    );
    if (!confirmed) {
      return;
    }

    setPriorMedicationFeedback(null);
    setPriorMedicationRemovingId(priorMedicationId);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prior-medications`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorMedicationId })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPriorMedicationFeedback({
          type: "error",
          message: result.message ?? "Falha ao remover medicamento prévio."
        });
        return;
      }

      setPriorMedicationFeedback({
        type: "success",
        message: "Medicamento prévio removido com sucesso."
      });
      removePriorMedicationLocally(selectedPatient.id, priorMedicationId);
    } catch {
      setPriorMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao remover medicamento prévio."
      });
    } finally {
      setPriorMedicationRemovingId(null);
    }
  }

  async function handleImportRawPrescriptions(): Promise<void> {
    setRawPrescriptionFeedback(null);

    if (!selectedPatient) {
      setRawPrescriptionFeedback({
        type: "error",
        message: "Selecione um paciente para importar prescrições."
      });
      return;
    }

    const validDrafts = rawPrescriptionDrafts.filter((draft) => draft.isValid);
    if (validDrafts.length === 0) {
      setRawPrescriptionFeedback({
        type: "error",
        message: "Não há linhas válidas para importar."
      });
      return;
    }

    setRawPrescriptionLoading(true);
    try {
      const failedLines: string[] = [];
      const importedPrescriptions: MedicalPrescriptionRecord[] = [];
      for (const draft of validDrafts) {
        const response = await fetch(`/api/patients/${selectedPatient.id}/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicationId: draft.medicationId ?? undefined,
            medicationName: draft.medicationName,
            dose: draft.dose,
            doseUnit: draft.doseUnit,
            administrationRoute: draft.administrationRoute,
            frequency: draft.frequency,
            shifts: draft.shifts,
            notes: draft.notes,
            validationStartAt: draft.validationStartAt ?? undefined,
            validationEndAt: draft.validationEndAt ?? undefined,
            validationStatus: draft.validationStatus || "Validado",
            externalValidationCandidate: draft.shouldAddToPriorMedicationValidation
          })
        });

        const result = (await response.json()) as {
          prescription?: MedicalPrescriptionRecord;
          message?: string;
        };

        if (!response.ok || !result.prescription) {
          failedLines.push(
            result.message?.trim()
              ? `${draft.lineNumber} (${result.message.trim()})`
              : String(draft.lineNumber)
          );
          continue;
        }

        importedPrescriptions.push(result.prescription);
      }

      if (importedPrescriptions.length > 0) {
        importedPrescriptions.forEach((prescription) => {
          appendPrescriptionLocally(prescription);
        });
      }

      if (failedLines.length > 0) {
        setRawPrescriptionFeedback({
          type: "error",
          message: `Algumas linhas falharam na importação: ${failedLines.join(", ")}.`
        });
      } else {
        setRawPrescriptionFeedback({
          type: "success",
          message: `${validDrafts.length} linha(s) importada(s) com sucesso.`
        });
        setRawPrescriptionInput("");
        setRawPrescriptionDrafts([]);
        setPrescriptionMode("view");
      }
    } catch {
      setRawPrescriptionFeedback({
        type: "error",
        message: "Erro de conexão ao importar prescrições."
      });
    } finally {
      setRawPrescriptionLoading(false);
    }
  }

  function handlePriorMedicationNameChange(nextMedicationName: string): void {
    const selectedCatalogMedication = findCatalogMedicationMatchByName(nextMedicationName);

    setPriorMedicationForm((current) => ({
      ...current,
      medicationId: selectedCatalogMedication ? String(selectedCatalogMedication.id) : "",
      medicationName: nextMedicationName,
      doseUnit: selectedCatalogMedication ? selectedCatalogMedication.defaultUnit : current.doseUnit
    }));
  }

  function handleInpatientStatusChange(
    inpatientKey: string,
    nextStatus: InpatientWorkflowStatus
  ): void {
    setWorkflowByInpatientKey((current) => {
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: null,
        mandatory: true,
        firstVisitCompletedAt: null,
        evolutionGeneratedAt: null,
        updatedByProfessionalName: null,
        updatedByProfessionalLogin: null,
        updatedAt: now
      };
      const currentWorkflow = current[inpatientKey] ?? fallbackWorkflow;
      const nextFirstVisitCompletedAt =
        nextStatus === "Pendente" || nextStatus === "Ausente"
          ? null
          : nextStatus === "Visitado" || nextStatus === "Concluído"
            ? currentWorkflow.firstVisitCompletedAt ?? now
            : currentWorkflow.firstVisitCompletedAt;
      const nextEvolutionGeneratedAt =
        nextStatus === "Pendente" ? null : currentWorkflow.evolutionGeneratedAt;
      const nextWorkflow: InpatientWorkflowState = {
        ...currentWorkflow,
        status: nextStatus,
        mandatory: shouldRemainMandatory(nextStatus, nextEvolutionGeneratedAt),
        firstVisitCompletedAt: nextFirstVisitCompletedAt,
        evolutionGeneratedAt: nextEvolutionGeneratedAt,
        updatedByProfessionalName: currentWorkflowEditorName,
        updatedByProfessionalLogin: currentWorkflowEditorLogin,
        updatedAt: now
      };

      if (
        currentWorkflow.status === nextWorkflow.status &&
        currentWorkflow.mandatory === nextWorkflow.mandatory &&
        currentWorkflow.assignedTeamId === nextWorkflow.assignedTeamId &&
        currentWorkflow.firstVisitCompletedAt === nextWorkflow.firstVisitCompletedAt &&
        currentWorkflow.evolutionGeneratedAt === nextWorkflow.evolutionGeneratedAt
      ) {
        return current;
      }

      return {
        ...current,
        [inpatientKey]: nextWorkflow
      };
    });
  }

  async function handleGenerateMandatoryEvolution(entry: InpatientEntry): Promise<void> {
    const currentWorkflow = resolveInpatientWorkflow(entry);
    if (!currentWorkflow.firstVisitCompletedAt && currentWorkflow.status !== "Concluído") {
      setMandatoryFeedback({
        type: "error",
        message: "Conclua a 1ª visita antes de gerar a evolução."
      });
      return;
    }

    if (!entry.patientId) {
      setMandatoryFeedback({
        type: "error",
        message: "Este paciente precisa estar vinculado ao cadastro para gerar a prévia da evolução."
      });
      return;
    }

    setMandatoryFeedback(null);
    setMandatoryEvolutionPreviewLoadingKey(entry.key);

    try {
      const response = await fetch(`/api/patients/${entry.patientId}/evolution-preview`);
      const result = (await response.json()) as {
        message?: string;
        preview?: MandatoryEvolutionPreviewPayload;
      };

      if (!response.ok || !result.preview) {
        setMandatoryFeedback({
          type: "error",
          message: result.message ?? "Não foi possível carregar a prévia da evolução."
        });
        return;
      }

      setMandatoryEvolutionPreview({
        entry,
        baseText: buildMandatoryEvolutionPreviewText(result.preview),
        includeTitles: true,
        feedback: null
      });
    } catch {
      setMandatoryFeedback({
        type: "error",
        message: "Erro de conexão ao carregar a prévia da evolução."
      });
    } finally {
      setMandatoryEvolutionPreviewLoadingKey(null);
    }
  }

  function confirmMandatoryEvolutionGeneration(entry: InpatientEntry): void {
    setWorkflowByInpatientKey((current) => {
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Concluído",
        assignedTeamId: entry.teamId ?? null,
        mandatory: true,
        firstVisitCompletedAt: now,
        evolutionGeneratedAt: null,
        updatedByProfessionalName: null,
        updatedByProfessionalLogin: null,
        updatedAt: now
      };
      const baseWorkflow = current[entry.key] ?? fallbackWorkflow;

      return {
        ...current,
        [entry.key]: {
          ...baseWorkflow,
          status: "Concluído",
          mandatory: false,
          firstVisitCompletedAt: baseWorkflow.firstVisitCompletedAt ?? now,
          evolutionGeneratedAt: now,
          updatedByProfessionalName: currentWorkflowEditorName,
          updatedByProfessionalLogin: currentWorkflowEditorLogin,
          updatedAt: now
        }
      };
    });

    setMandatoryEvolutionPreview(null);
    setMandatoryFeedback({
      type: "success",
      message: `Evolução registrada para ${entry.patientName} na sua lista diária.`
    });
  }

  async function handleCopyMandatoryEvolutionPreview(): Promise<void> {
    if (!mandatoryEvolutionPreview || !visibleMandatoryEvolutionPreviewText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(visibleMandatoryEvolutionPreviewText);
      setMandatoryEvolutionPreview((current) =>
        current
          ? {
              ...current,
              feedback: {
                type: "success",
                message: "Prévia da evolução copiada."
              }
            }
          : current
      );
    } catch {
      setMandatoryEvolutionPreview((current) =>
        current
          ? {
              ...current,
              feedback: {
                type: "error",
                message: "Não foi possível copiar a prévia da evolução."
              }
            }
          : current
      );
    }
  }

  function handleInpatientTeamChange(inpatientKey: string, nextTeamValue: string): void {
    const parsedTeamId = Number(nextTeamValue);
    const nextTeamId = Number.isInteger(parsedTeamId) && parsedTeamId > 0 ? parsedTeamId : null;

    setWorkflowByInpatientKey((current) => {
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: null,
        mandatory: true,
        firstVisitCompletedAt: null,
        evolutionGeneratedAt: null,
        updatedByProfessionalName: null,
        updatedByProfessionalLogin: null,
        updatedAt: now
      };
      const currentWorkflow = current[inpatientKey] ?? fallbackWorkflow;
      if (currentWorkflow.assignedTeamId === nextTeamId) {
        return current;
      }

      return {
        ...current,
        [inpatientKey]: {
          ...currentWorkflow,
          assignedTeamId: nextTeamId,
          updatedByProfessionalName: currentWorkflowEditorName,
          updatedByProfessionalLogin: currentWorkflowEditorLogin,
          updatedAt: now
        }
      };
    });
  }

  async function handleMandatoryRawImport(): Promise<void> {
    setMandatoryFeedback(null);

    const rawLines = mandatoryRawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) {
      setMandatoryFeedback({
        type: "error",
        message: "Cole ao menos uma linha para montar a lista diária."
      });
      return;
    }

    setMandatoryLoading(true);

    try {
      const patientsByChart = new Map<string, PatientRecord>();
      const patientsByName = new Map<string, PatientRecord>();
      for (const patient of patients) {
        const normalizedChart = normalizeSearchValue(patient.chartNumber);
        const normalizedName = normalizeSearchValue(patient.fullName);
        if (normalizedChart && !patientsByChart.has(normalizedChart)) {
          patientsByChart.set(normalizedChart, patient);
        }
        if (normalizedName && !patientsByName.has(normalizedName)) {
          patientsByName.set(normalizedName, patient);
        }
      }

      const knownAdmissionKeys = new Set(
        inpatients.flatMap((entry) =>
          entry.patientId !== null
            ? [`${entry.patientId}:${entry.admissionDate}:${normalizeSearchValue(entry.bed)}`]
            : []
        )
      );
      const trackedEntriesByKey = new Map(
        trackedInpatientEntries.map((entry) => [entry.key, entry] as const)
      );

      const nextManualEntriesByKey = new Map<string, InpatientEntry>();
      const entriesToPending = new Map<string, number | null>();
      const createdPatients: PatientRecord[] = [];
      const createdAdmissions: AdmissionRecord[] = [];
      let createdPatientsCount = 0;
      let createdAdmissionsCount = 0;
      let linkedCount = 0;
      let skippedCount = 0;
      let lastErrorMessage = "";

      for (const rawLine of rawLines) {
        const parts = rawLine
          .split(/\t|;|\|/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

        const isBedFirstLayout = /^L:/i.test(parts[0] ?? "");
        const hasDateAtFourthColumn = /^\d{2}\/\d{2}\/\d{2,4}/.test(parts[3] ?? "");
        const patientName = isBedFirstLayout ? parts[1] ?? "" : parts[0] ?? "";
        const bed = isBedFirstLayout ? normalizeMandatoryBedLabel(parts[0] ?? "") : parts[2] ?? "";
        const chartNumber = isBedFirstLayout
          ? hasDateAtFourthColumn
            ? parts[2] ?? ""
            : parts[3] ?? ""
          : parts[1] ?? "";
        const admissionDate = isBedFirstLayout
          ? parseMandatoryAdmissionDate(hasDateAtFourthColumn ? parts[3] ?? "" : parts[4] ?? "")
          : new Date().toISOString().slice(0, 10);

        if (!patientName || !chartNumber || !bed) {
          skippedCount += 1;
          continue;
        }

        const normalizedChart = normalizeSearchValue(chartNumber);
        const normalizedName = normalizeSearchValue(patientName);
        let patientRecord =
          (normalizedChart ? patientsByChart.get(normalizedChart) : null) ??
          (normalizedName ? patientsByName.get(normalizedName) : null) ??
          null;

        if (!patientRecord) {
          const patientResponse = await fetch("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: patientName,
              chartNumber,
              birthDate: "",
              allergies: []
            })
          });

          const patientResult = (await patientResponse.json()) as {
            message?: string;
            patient?: PatientRecord;
          };

          if (!patientResponse.ok || !patientResult.patient) {
            skippedCount += 1;
            lastErrorMessage = patientResult.message ?? "Falha ao cadastrar paciente da lista diária.";
            continue;
          }

          patientRecord = patientResult.patient;
          createdPatients.push(patientRecord);
          createdPatientsCount += 1;

          const createdChart = normalizeSearchValue(patientRecord.chartNumber);
          const createdName = normalizeSearchValue(patientRecord.fullName);
          if (createdChart) {
            patientsByChart.set(createdChart, patientRecord);
          }
          if (createdName) {
            patientsByName.set(createdName, patientRecord);
          }
        }

        const entryKey = `patient-${patientRecord.id}`;
        const admissionKey = `${patientRecord.id}:${admissionDate}:${normalizeSearchValue(bed)}`;
        const existingTrackedEntry =
          nextManualEntriesByKey.get(entryKey) ?? trackedEntriesByKey.get(entryKey) ?? null;
        if (existingTrackedEntry) {
          nextManualEntriesByKey.set(entryKey, existingTrackedEntry);
          linkedCount += 1;
          continue;
        }

        const matchedActiveInpatient = activeInpatientByPatientId.get(patientRecord.id) ?? null;
        const matchedTeamId = matchedActiveInpatient?.teamId ?? null;
        const matchedTeamName = matchedActiveInpatient?.teamName ?? null;

        if (!knownAdmissionKeys.has(admissionKey)) {
          const admissionResponse = await fetch("/api/admissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: patientRecord.id,
              admissionDate,
              bed,
              admissionReason: "",
              teamId: undefined
            })
          });

          const admissionResult = (await admissionResponse.json()) as {
            message?: string;
            admission?: AdmissionRecord;
          };

          if (!admissionResponse.ok || !admissionResult.admission) {
            skippedCount += 1;
            lastErrorMessage =
              admissionResult.message ?? "Falha ao cadastrar internação da lista diária.";
            continue;
          }

          createdAdmissions.push(admissionResult.admission);
          knownAdmissionKeys.add(admissionKey);
          createdAdmissionsCount += 1;
        } else {
          linkedCount += 1;
        }

        nextManualEntriesByKey.set(entryKey, {
          key: entryKey,
          patientId: patientRecord.id,
          patientName: patientRecord.fullName,
          chartNumber: patientRecord.chartNumber,
          reportedAgeYears: patientRecord.ageYears,
          admissionDate,
          bed,
          teamName: matchedTeamName,
          teamId: matchedTeamId,
          source: "active",
          createdAt: new Date().toISOString()
        });
        entriesToPending.set(entryKey, matchedTeamId);
      }

      if (
        createdPatientsCount === 0 &&
        createdAdmissionsCount === 0 &&
        linkedCount === 0 &&
        entriesToPending.size === 0
      ) {
        setMandatoryFeedback({
          type: "error",
          message:
            lastErrorMessage ||
            "Nenhuma linha válida encontrada. Use: Leito;Nome;Idade;Prontuário;Admissão."
        });
        return;
      }

      if (nextManualEntriesByKey.size > 0) {
        const manualEntries = Array.from(nextManualEntriesByKey.values());
        const mergedPayload = mergeMandatoryEntriesIntoPayload(
          {
            workflowByKey: workflowByInpatientKey,
            trackedEntries: trackedInpatientEntries,
            priorityTeamIds
          },
          manualEntries,
          entriesToPending,
          currentWorkflowEditorName,
          currentWorkflowEditorLogin
        );

        setTrackedInpatientEntries(mergedPayload.trackedEntries);
        setWorkflowByInpatientKey(mergedPayload.workflowByKey);
        setPriorityTeamIds(mergedPayload.priorityTeamIds);
      }

      createdPatients.forEach((patient) => {
        upsertPatientRecordLocally(patient);
      });

      if (createdAdmissions.length > 0) {
        const patientLookup = new Map<number, PatientRecord>();
        for (const patient of patients) {
          patientLookup.set(patient.id, patient);
        }
        for (const patient of createdPatients) {
          patientLookup.set(patient.id, patient);
        }

        createdAdmissions.forEach((admission) => {
          upsertAdmissionRecordLocally(admission, patientLookup.get(admission.patientId) ?? null);
        });
      }

      setMandatoryRawInput("");
      setMandatoryFeedback({
        type: "success",
        message:
          `${createdPatientsCount} paciente(s) cadastrado(s), ${createdAdmissionsCount} internação(ões) criada(s) e ${linkedCount} registro(s) já existente(s) adicionados à sua lista diária.` +
          (skippedCount > 0 ? ` ${skippedCount} linha(s) ignorada(s).` : "") +
          (lastErrorMessage ? ` Último erro: ${lastErrorMessage}` : "")
      });
    } catch {
      setMandatoryFeedback({
        type: "error",
        message: "Erro de conexão ao importar a lista diária."
      });
    } finally {
      setMandatoryLoading(false);
    }
  }

  return (
    <section className="dashboard-panel" aria-busy={isDashboardLoading}>
      {isDashboardLoading ? (
        <div className="dashboard-loading-overlay" role="status" aria-live="polite">
          <div className="dashboard-loading-card">
            <span className="dashboard-loading-spinner" aria-hidden="true" />
            <p>{dashboardTransitionLabel || "Carregando painel..."}</p>
          </div>
        </div>
      ) : null}

      {mandatoryEvolutionPreview ? (
        <div className="dashboard-modal-overlay" role="dialog" aria-modal="true">
          <div className="dashboard-modal-card">
            <div className="dashboard-inline-actions">
              <h3>Prévia da evolução</h3>
              <button
                type="button"
                className="dashboard-mini-button"
                onClick={() => setMandatoryEvolutionPreview(null)}
              >
                Fechar
              </button>
            </div>
            <p className="dashboard-muted">
              Revise o texto antes de concluir a evolução de {mandatoryEvolutionPreview.entry.patientName}.
            </p>
            <label className="dashboard-inline-toggle">
              <input
                type="checkbox"
                checked={mandatoryEvolutionPreview.includeTitles}
                onChange={(event) =>
                  setMandatoryEvolutionPreview((current) =>
                    current
                      ? {
                          ...current,
                          includeTitles: event.target.checked
                        }
                      : current
                  )
                }
              />
              Mostrar títulos automáticos
            </label>
            <textarea
              className="dashboard-evolution-preview"
              value={visibleMandatoryEvolutionPreviewText}
              readOnly
              rows={22}
            />
            {mandatoryEvolutionPreview.feedback ? (
              <p
                className={`dashboard-feedback dashboard-feedback-${mandatoryEvolutionPreview.feedback.type}`}
              >
                {mandatoryEvolutionPreview.feedback.message}
              </p>
            ) : null}
            <div className="dashboard-inline-actions">
              <button
                type="button"
                className="dashboard-mini-button"
                onClick={() => void handleCopyMandatoryEvolutionPreview()}
              >
                Copiar prévia
              </button>
              <button
                type="button"
                onClick={() => confirmMandatoryEvolutionGeneration(mandatoryEvolutionPreview.entry)}
              >
                Concluir geração
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="dashboard-header">
        <div>
          <p className="dashboard-tag">Área segura</p>
          <h1>Painel Assistencial CoreClin</h1>
          <p className="dashboard-subtitle">
            Login ativo: <strong>{currentLogin}</strong>
          </p>
        </div>
        <LogoutButton />
      </header>

      {dbError ? (
        <section className="dashboard-card dashboard-error">
          <h2>Conexão com banco indisponível</h2>
          <p>{dbError}</p>
          <p>
            Configure `DATABASE_URL` no ambiente da Vercel para habilitar os cadastros e histórico clínico.
          </p>
        </section>
      ) : (
        <>
          {!effectivePatientPageMode ? (
            <section className="dashboard-card dashboard-highlight">
              <h2>Profissional logado</h2>
              <p>
                {currentProfessional?.isTrainee ? (
                  <>
                    <strong>{responsibleProfessionalName}</strong> atua como{" "}
                    <strong>{formatProfessionalDisplayLabel(currentProfessional)}</strong>
                    {currentProfessional.supervisingPharmacistName
                      ? ` e está vinculada a ${currentProfessional.supervisingPharmacistName}.`
                      : "."}
                  </>
                ) : (
                  <>
                    <strong>{responsibleProfessionalName}</strong> é o farmacêutico responsável padrão para novos
                    registros.
                  </>
                )}
              </p>
            </section>
          ) : null}

          <div className={`dashboard-layout ${effectivePatientPageMode ? "is-patient-page" : ""}`}>
            {!effectivePatientPageMode ? (
              <aside className="dashboard-sidebar">
                <h2>Menu</h2>
                <nav>
                  {DASHBOARD_NAV_GROUPS.map((group) => (
                    <section key={group.label} className="dashboard-sidebar-group">
                      <p className="dashboard-sidebar-group-title">{group.label}</p>
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                        type="button"
                        className={`dashboard-sidebar-link ${activeSection === item.id ? "is-active" : ""}`}
                        onClick={() => openDashboardSection(item.id)}
                      >
                        <span>{item.label}</span>
                        {item.id === "interventions" && interventionSidebarIndicator > 0 ? (
                          <span className="dashboard-sidebar-indicator">
                            {interventionSidebarIndicator}
                          </span>
                        ) : item.id === "validated-medications" &&
                          validatedMedicationSidebarIndicator > 0 ? (
                          <span className="dashboard-sidebar-indicator">
                            {validatedMedicationSidebarIndicator}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </section>
                ))}

                  <div className="dashboard-sidebar-separator" />

                  <section className="dashboard-sidebar-group">
                    <p className="dashboard-sidebar-group-title">Pacientes internados</p>
                    {INPATIENT_SIDEBAR_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`dashboard-sidebar-link ${
                          activeSection === "inpatients" && inpatientOverviewMode === item.id
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() => openInpatientOverview(item.id)}
                      >
                        <span>{item.label}</span>
                        {inpatientSidebarIndicators[item.id] > 0 ? (
                          <span className="dashboard-sidebar-indicator">
                            {inpatientSidebarIndicators[item.id]}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </section>
                </nav>
              </aside>
            ) : null}

            <div className={`dashboard-content ${effectivePatientPageMode ? "is-patient-page" : ""}`}>
              {!effectivePatientPageMode && activeSection === null ? (
                <section className="dashboard-card dashboard-empty-card">
                  <div className="dashboard-empty-state">
                    <Image
                      src="/coreclin.png"
                      alt="CoreClin"
                      width={624}
                      height={624}
                      priority
                      className="dashboard-empty-logo"
                    />
                    <h2>A sua ferramenta de auxílio à decisão terapêutica.</h2>
                    <p>Escolha uma opção na barra lateral para abrir um módulo.</p>
                  </div>
                </section>
              ) : null}

              {activeSection === "professional" ? (
                <section className="dashboard-card">
                  <h2>{editingProfessionalId === null ? "Cadastrar Profissional" : "Editar Profissional"}</h2>
                  <form className="dashboard-form" onSubmit={handleProfessionalSubmit}>
                    <input
                      placeholder="Nome completo"
                      value={professionalForm.fullName}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                      required
                    />

                    <div className="dashboard-two-columns">
                      <select
                        value={professionalForm.profession}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({
                            ...current,
                            profession: event.target.value as ProfessionOption
                          }))
                        }
                      >
                        {PROFESSION_OPTIONS.map((profession) => (
                          <option key={profession} value={profession}>
                            {profession}
                          </option>
                        ))}
                      </select>

                      <label className="dashboard-inline-toggle">
                        <input
                          type="checkbox"
                          checked={professionalForm.isTrainee}
                          onChange={(event) =>
                            setProfessionalForm((current) => ({
                              ...current,
                              isTrainee: event.target.checked,
                              supervisingPharmacistId: event.target.checked
                                ? current.supervisingPharmacistId
                                : ""
                            }))
                          }
                        />
                        Cadastro de estagiário
                      </label>
                    </div>

                    {professionalForm.isTrainee ? (
                      <select
                        value={professionalForm.supervisingPharmacistId}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({
                            ...current,
                            supervisingPharmacistId: event.target.value
                          }))
                        }
                        required
                      >
                        <option value="">Selecione o farmacêutico responsável</option>
                        {pharmacistSupervisorOptions.map((professional) => (
                          <option key={professional.id} value={professional.id}>
                            {professional.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <div className="dashboard-two-columns">
                          <select
                            value={professionalForm.councilType}
                            onChange={(event) =>
                              setProfessionalForm((current) => ({
                                ...current,
                                councilType: event.target.value as CouncilOption
                              }))
                            }
                          >
                            {COUNCIL_OPTIONS.map((council) => (
                              <option key={council} value={council}>
                                {council}
                              </option>
                            ))}
                          </select>
                          <select
                            value={professionalForm.stateUf}
                            onChange={(event) =>
                              setProfessionalForm((current) => ({
                                ...current,
                                stateUf: event.target.value
                              }))
                            }
                          >
                            {UF_OPTIONS.map((uf) => (
                              <option key={uf} value={uf}>
                                {uf}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          placeholder="Número do conselho"
                          value={professionalForm.councilNumber}
                          onChange={(event) =>
                            setProfessionalForm((current) => ({
                              ...current,
                              councilNumber: event.target.value
                            }))
                          }
                          required
                        />
                      </>
                    )}

                    <div className="dashboard-two-columns">
                      <input
                        placeholder="Login"
                        value={professionalForm.login}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({ ...current, login: event.target.value }))
                        }
                        required
                      />
                      <input
                        type="password"
                        placeholder={
                          editingProfessionalId === null ? "Senha" : "Nova senha (opcional ao editar)"
                        }
                        value={professionalForm.password}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({ ...current, password: event.target.value }))
                        }
                        required={editingProfessionalId === null}
                      />
                    </div>

                    <input
                      placeholder="Instituição"
                      value={professionalForm.institution}
                      onChange={(event) =>
                        setProfessionalForm((current) => ({ ...current, institution: event.target.value }))
                      }
                      required
                    />

                    {professionalFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${professionalFeedback.type}`}>
                        {professionalFeedback.message}
                      </p>
                    ) : null}

                    <div className="dashboard-inline-actions">
                      <button type="submit" disabled={professionalLoading}>
                        {professionalLoading
                          ? "Salvando..."
                          : editingProfessionalId === null
                            ? "Salvar profissional"
                            : "Atualizar profissional"}
                      </button>
                      {editingProfessionalId !== null ? (
                        <button
                          type="button"
                          className="dashboard-chip-remove"
                          onClick={resetProfessionalForm}
                          disabled={professionalLoading}
                        >
                          Cancelar edição
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <div className="dashboard-list-box">
                    <button
                      type="button"
                      className="dashboard-list-toggle"
                      onClick={() => toggleList("professional")}
                    >
                      {listVisibility.professional
                        ? "Ocultar profissionais cadastrados"
                        : "Ver profissionais cadastrados"}
                    </button>
                    {listVisibility.professional ? (
                      professionals.length === 0 ? (
                        <p className="dashboard-muted">Nenhum profissional cadastrado.</p>
                      ) : (
                        <div className="dashboard-table-wrap">
                          <table className="dashboard-table">
                            <thead>
                              <tr>
                                <th>Nome</th>
                                <th>Perfil</th>
                                <th>Conselho</th>
                                <th>Login</th>
                                <th>Farmacêutico responsável</th>
                                <th>Instituição</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {professionals.map((professional) => (
                                <tr key={professional.id}>
                                  <td>{professional.fullName}</td>
                                  <td>{formatProfessionalDisplayLabel(professional)}</td>
                                  <td>{formatProfessionalCouncilSummary(professional) ?? "-"}</td>
                                  <td>{professional.login}</td>
                                  <td>{professional.supervisingPharmacistName ?? "-"}</td>
                                  <td>{professional.institution}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="dashboard-mini-button"
                                      onClick={() => startProfessionalEdit(professional)}
                                    >
                                      Editar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : null}
                  </div>
                </section>
              ) : null}

              {activeSection === "team" ? (
                <section className="dashboard-card">
                  <h2>Cadastrar Equipe</h2>
                  <form className="dashboard-form" onSubmit={handleTeamSubmit}>
                    <input
                      placeholder="Nome da equipe"
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      required
                    />

                    {teamFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${teamFeedback.type}`}>
                        {teamFeedback.message}
                      </p>
                    ) : null}

                    <button type="submit" disabled={teamLoading}>
                      {teamLoading ? "Salvando..." : "Salvar equipe"}
                    </button>
                  </form>

                  <div className="dashboard-list-box">
                    <button type="button" className="dashboard-list-toggle" onClick={() => toggleList("team")}>
                      {listVisibility.team ? "Ocultar equipes cadastradas" : "Ver equipes cadastradas"}
                    </button>
                    {listVisibility.team ? (
                      teams.length === 0 ? (
                        <p className="dashboard-muted">Nenhuma equipe cadastrada.</p>
                      ) : (
                        <ul className="dashboard-chip-list">
                          {groupedTeamOptions.map((group) => (
                            <li key={group.key}>{group.label}</li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </div>
                </section>
              ) : null}

              {activeSection === "patient" || activeSection === "inpatients" ? (
                <section className="dashboard-card">
                  {activeSection === "patient" ? (
                    <>
                      <h2>Cadastrar Paciente</h2>
                      <form className="dashboard-form" onSubmit={handlePatientSubmit}>
                    <input
                      placeholder="Nome completo"
                      value={patientForm.fullName}
                      onChange={(event) =>
                        setPatientForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                      required
                    />

                    <div className="dashboard-two-columns">
                      <input
                        placeholder="Prontuário"
                        value={patientForm.chartNumber}
                        onChange={(event) =>
                          setPatientForm((current) => ({ ...current, chartNumber: event.target.value }))
                        }
                        required
                      />
                      <input value={responsibleProfessionalName} disabled />
                    </div>

                    <div className="dashboard-two-columns">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Data de nascimento (DD/MM/AAAA)"
                        value={patientForm.birthDate}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            birthDate: formatEditableDateInput(event.target.value)
                          }))
                        }
                        required
                      />
                      <input value={agePreview === null ? "Idade" : `${agePreview} anos`} disabled />
                    </div>

                    <div className="dashboard-two-columns">
                      <select
                        value={patientForm.sex}
                        onChange={(event) =>
                          setPatientForm((current) => ({
                            ...current,
                            sex: event.target.value as PatientSex | ""
                          }))
                        }
                      >
                        <option value="">Sexo biológico</option>
                        {PATIENT_SEX_OPTIONS.map((sex) => (
                          <option key={sex} value={sex}>
                            {formatPatientSexLabel(sex)}
                          </option>
                        ))}
                      </select>
                      <input
                        value={
                          patientForm.sex
                            ? `Sexo: ${formatPatientSexLabel(patientForm.sex as PatientSex)}`
                            : "Sexo não informado"
                        }
                        disabled
                        aria-label="Sexo biológico selecionado"
                      />
                    </div>

                    <p className="dashboard-muted">
                      Se o prontuário já existir, este cadastro complementa o paciente já importado.
                    </p>

                    <div className="dashboard-subsection-block">
                      <h3>Alergias iniciais</h3>
                      <div className="dashboard-two-columns">
                        <select
                          value={patientInitialAllergyForm.medicationId}
                          onChange={(event) =>
                            setPatientInitialAllergyForm({ medicationId: event.target.value })
                          }
                          disabled={medications.length === 0}
                        >
                          <option value="">Selecione medicamento cadastrado</option>
                          {medications.map((medication) => (
                            <option key={medication.id} value={medication.id}>
                              {medication.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={selectedInitialAllergyMedication?.name ?? "Cadastre o medicamento primeiro"}
                          disabled
                          aria-label="Alergia selecionada"
                        />
                      </div>

                      <p className="dashboard-muted">
                        Alergia só pode ser adicionada com medicamento previamente cadastrado.
                      </p>

                      <button
                        type="button"
                        className="dashboard-mini-button dashboard-mini-button-inline"
                        onClick={handleAddInitialPatientAllergy}
                        disabled={!selectedInitialAllergyMedication}
                      >
                        Adicionar alergia
                      </button>

                      {patientForm.allergies.length === 0 ? (
                        <p className="dashboard-muted">Nenhuma alergia inicial adicionada.</p>
                      ) : (
                        <ul className="dashboard-chip-list">
                          {patientForm.allergies.map((allergy) => (
                            <li key={allergy}>
                              {allergy}
                              <button
                                type="button"
                                className="dashboard-chip-remove"
                                onClick={() => handleRemoveInitialPatientAllergy(allergy)}
                              >
                                Remover
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {patientFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${patientFeedback.type}`}>
                        {patientFeedback.message}
                      </p>
                    ) : null}

                    <button type="submit" disabled={patientLoading}>
                      {patientLoading ? "Salvando..." : "Salvar paciente"}
                    </button>
                  </form>

                  <div className="dashboard-list-box">
                    <button
                      type="button"
                      className="dashboard-list-toggle"
                      onClick={() => toggleList("patient")}
                    >
                      {listVisibility.patient ? "Ocultar pacientes cadastrados" : "Ver pacientes cadastrados"}
                    </button>
                    {listVisibility.patient ? (
                      patients.length === 0 ? (
                        <p className="dashboard-muted">Nenhum paciente cadastrado.</p>
                      ) : (
                        <div className="dashboard-table-wrap">
                          <table className="dashboard-table">
                            <thead>
                              <tr>
                                <th>Nome</th>
                                <th>Prontuário</th>
                                <th>Idade</th>
                                <th>Sexo</th>
                                <th>Profissional</th>
                                <th>Última internação</th>
                                <th>Último leito</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patients.map((patient) => (
                                <tr key={patient.id}>
                                  <td>{patient.fullName}</td>
                                  <td>{patient.chartNumber}</td>
                                  <td>{patient.ageYears !== null ? `${patient.ageYears} anos` : "-"}</td>
                                  <td>{formatPatientSexLabel(patient.sex)}</td>
                                  <td>{patient.responsibleProfessionalName}</td>
                                  <td>{formatAdmissionDate(patient.latestAdmission?.admissionDate)}</td>
                                  <td>{patient.latestAdmission?.bed ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : null}
                  </div>
                    </>
                  ) : null}

                  {activeSection === "inpatients" ? (
                    <>
                      <div className="dashboard-inline-actions">
                        {effectivePatientPageMode ? (
                          <button
                            type="button"
                            className="dashboard-mini-button"
                            onClick={closePatientDetailsPage}
                          >
                            Voltar aos internados
                          </button>
                        ) : null}
                      </div>

                      <h2>{effectivePatientPageMode ? "Paciente internado" : "Pacientes Internados"}</h2>
                      {!effectivePatientPageMode && inpatientOverviewMode === "all" ? (
                        <div className="dashboard-subsection-block">
                          {inpatients.length === 0 ? (
                            <p className="dashboard-muted">Nenhum paciente internado no momento.</p>
                          ) : (
                            <>
                              <input
                                placeholder="Buscar internado ativo por nome, prontuário, leito ou equipe"
                                value={inpatientSearch}
                                onChange={(event) => setInpatientSearch(event.target.value)}
                              />
                              {filteredInpatients.length === 0 ? (
                                <p className="dashboard-muted">
                                  Nenhum paciente internado encontrado para esta busca.
                                </p>
                              ) : (
                                <div className="dashboard-table-wrap">
                                  <table className="dashboard-table">
                                    <thead>
                                      <tr>
                                        <th>Paciente</th>
                                        <th>Prontuário</th>
                                        <th>Admissão</th>
                                        <th>Leito</th>
                                        <th>Equipe</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredInpatients.map((inpatient) => (
                                        <tr key={inpatient.key}>
                                          <td>
                                            <button
                                              type="button"
                                              className="dashboard-link-button"
                                            onClick={() => {
                                              if (inpatient.patientId !== null) {
                                                openPatientDetails(inpatient.patientId, "admission-info");
                                              }
                                            }}
                                          >
                                            {inpatient.patientName}
                                            </button>
                                          </td>
                                          <td>{inpatient.chartNumber}</td>
                                          <td>{formatAdmissionDate(inpatient.admissionDate)}</td>
                                          <td>{inpatient.bed}</td>
                                          <td>{formatCanonicalTeamName(inpatient.teamName)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : null}

                      {!effectivePatientPageMode && inpatientOverviewMode === "team" ? (
                        <section className="dashboard-subsection">
                          <div className="dashboard-subsection-block">
                            <h3>Pacientes por equipe</h3>
                            <p className="dashboard-muted">
                              Filtre pelos cards de equipe. O paciente permanece em equipe até status Alta.
                            </p>

                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className={`dashboard-mini-button ${
                                  inpatientTeamFilter === "all" ? "is-active" : ""
                                }`}
                                onClick={() => setInpatientTeamFilter("all")}
                              >
                                Todas as equipes
                              </button>
                              {groupedTeamOptions.map((group) => (
                                <button
                                  key={group.key}
                                  type="button"
                                  className={`dashboard-mini-button ${
                                    inpatientTeamFilter === group.key ? "is-active" : ""
                                  }`}
                                  onClick={() =>
                                    setInpatientTeamFilter((current) =>
                                      current === group.key ? "all" : group.key
                                    )
                                  }
                                >
                                  {group.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                className={`dashboard-mini-button ${
                                  inpatientTeamFilter === "without-team" ? "is-active" : ""
                                }`}
                                onClick={() =>
                                  setInpatientTeamFilter((current) =>
                                    current === "without-team" ? "all" : "without-team"
                                  )
                                }
                              >
                                Sem equipe
                              </button>
                            </div>

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Paciente</th>
                                    <th>Prontuário</th>
                                    <th>Leito</th>
                                    <th>Equipe</th>
                                    <th>Status</th>
                                    <th>Último farmacêutico</th>
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={7}>Nenhum paciente encontrado para este filtro.</td>
                                    </tr>
                                  ) : (
                                    teamOverviewRows.map(({ entry, workflow }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{entry.bed || "-"}</td>
                                        <td>
                                          <select
                                            className="dashboard-table-select"
                                            value={
                                              workflow.assignedTeamId !== null
                                                ? String(
                                                    canonicalTeamIdById.get(workflow.assignedTeamId) ??
                                                      workflow.assignedTeamId
                                                  )
                                                : ""
                                            }
                                            onChange={(event) =>
                                              handleInpatientTeamChange(entry.key, event.target.value)
                                            }
                                          >
                                            <option value="">Sem equipe</option>
                                            {groupedTeamOptions.map((group) => (
                                              <option key={group.key} value={group.representativeTeamId}>
                                                {group.label}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          <select
                                            className="dashboard-table-select"
                                            value={workflow.status}
                                            onChange={(event) =>
                                              handleInpatientStatusChange(
                                                entry.key,
                                                event.target.value as InpatientWorkflowStatus
                                              )
                                            }
                                          >
                                            {INPATIENT_STATUS_OPTIONS.map((statusOption) => (
                                              <option key={statusOption} value={statusOption}>
                                                {statusOption}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>{formatWorkflowEditorLabel(workflow)}</td>
                                        <td>
                                          {entry.patientId ? (
                                            <button
                                              type="button"
                                              className="dashboard-link-button"
                                              onClick={() => openPatientDetails(entry.patientId!)}
                                            >
                                              Abrir
                                            </button>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      ) : null}

                      {!effectivePatientPageMode && inpatientOverviewMode === "mandatory" ? (
                        <section className="dashboard-subsection">
                          <div className="dashboard-subsection-block">
                            <h3>Lista diária</h3>

                            <div className="dashboard-form">
                              <textarea
                                placeholder="Cole várias linhas do sistema para montar sua lista diária"
                                value={mandatoryRawInput}
                                onChange={(event) => setMandatoryRawInput(event.target.value)}
                              />
                              <button type="button" onClick={handleMandatoryRawImport} disabled={mandatoryLoading}>
                                {mandatoryLoading
                                  ? "Importando pacientes..."
                                  : "Adicionar à lista diária"}
                              </button>
                            </div>

                            {mandatoryFeedback ? (
                              <p className={`dashboard-feedback dashboard-feedback-${mandatoryFeedback.type}`}>
                                {mandatoryFeedback.message}
                              </p>
                            ) : null}

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Paciente</th>
                                    <th>Prontuário</th>
                                    <th>Admissão</th>
                                    <th>Leito</th>
                                    <th>Equipe</th>
                                    <th>Status</th>
                                    <th>1ª visita</th>
                                    <th>Evolução</th>
                                    <th>Origem</th>
                                    <th>Último farmacêutico</th>
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mandatoryOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={11}>Nenhum paciente na sua lista diária.</td>
                                    </tr>
                                  ) : (
                                    mandatoryOverviewRows.map(({ entry, workflow, assignedTeamName }) => (
                                      <tr
                                        key={entry.key}
                                        className={getMandatoryInpatientRowClassName(workflow.status)}
                                      >
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{formatAdmissionDate(entry.admissionDate)}</td>
                                        <td>{entry.bed || "-"}</td>
                                        <td>{assignedTeamName ?? formatCanonicalTeamName(entry.teamName)}</td>
                                        <td>
                                          <select
                                            className={`dashboard-table-select ${getMandatoryInpatientStatusSelectClassName(
                                              workflow.status
                                            )}`.trim()}
                                            value={workflow.status}
                                            onChange={(event) =>
                                              handleInpatientStatusChange(
                                                entry.key,
                                                event.target.value as InpatientWorkflowStatus
                                              )
                                            }
                                          >
                                            {INPATIENT_STATUS_OPTIONS.map((statusOption) => (
                                              <option key={statusOption} value={statusOption}>
                                                {statusOption}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          {workflow.firstVisitCompletedAt
                                            ? formatTimestamp(workflow.firstVisitCompletedAt)
                                            : "Pendente"}
                                        </td>
                                        <td>
                                          {workflow.evolutionGeneratedAt ? (
                                            formatTimestamp(workflow.evolutionGeneratedAt)
                                          ) : (
                                            <button
                                              type="button"
                                              className="dashboard-mini-button"
                                              onClick={() => void handleGenerateMandatoryEvolution(entry)}
                                              disabled={
                                                !workflow.firstVisitCompletedAt ||
                                                mandatoryEvolutionPreviewLoadingKey === entry.key
                                              }
                                            >
                                              {mandatoryEvolutionPreviewLoadingKey === entry.key
                                                ? "Carregando..."
                                                : "Gerar evolução"}
                                            </button>
                                          )}
                                        </td>
                                        <td>{entry.source === "active" ? "Internado ativo" : "Dados brutos"}</td>
                                        <td>{formatWorkflowEditorLabel(workflow)}</td>
                                        <td>
                                          {entry.patientId ? (
                                            <button
                                              type="button"
                                              className="dashboard-link-button"
                                              onClick={() => openPatientDetails(entry.patientId!)}
                                            >
                                              Abrir
                                            </button>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      ) : null}

                      {!effectivePatientPageMode && inpatientOverviewMode === "discharged" ? (
                        <section className="dashboard-subsection">
                          <div className="dashboard-subsection-block">
                            <h3>Pacientes de alta</h3>
                            <p className="dashboard-muted">
                              Histórico de pacientes com status Alta.
                            </p>
                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Paciente</th>
                                    <th>Prontuário</th>
                                    <th>Equipe</th>
                                    <th>Status</th>
                                    <th>Último farmacêutico</th>
                                    <th>Atualização</th>
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dischargedOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={7}>Nenhum paciente de alta ou concluído.</td>
                                    </tr>
                                  ) : (
                                    dischargedOverviewRows.map(({ entry, workflow, assignedTeamName }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{assignedTeamName ?? formatCanonicalTeamName(entry.teamName)}</td>
                                        <td>{workflow.status}</td>
                                        <td>{formatWorkflowEditorLabel(workflow)}</td>
                                        <td>{formatTimestamp(workflow.updatedAt)}</td>
                                        <td>
                                          {entry.patientId ? (
                                            <button
                                              type="button"
                                              className="dashboard-link-button"
                                              onClick={() => openPatientDetails(entry.patientId!)}
                                            >
                                              Abrir
                                            </button>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      ) : null}

                      {selectedPatient && patientDetailsOpen ? (
                        <section className="dashboard-subsection">
                          <h3>Detalhes do paciente internado</h3>
                          <p className="dashboard-muted">
                            Paciente selecionado: {selectedPatient.fullName} ({selectedPatient.chartNumber})
                          </p>

                          {!effectivePatientPageMode ? (
                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className="dashboard-mini-button"
                                onClick={() => setPatientDetailsOpen(false)}
                              >
                                Fechar detalhes
                              </button>
                            </div>
                          ) : null}

                          <div className="dashboard-inline-actions">
                            {PATIENT_VIEW_ITEMS.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={`dashboard-mini-button ${patientView === item.id ? "is-active" : ""}`}
                                onClick={() => openPatientView(item.id)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>

                          {!hasSelectedPatientDetailsLoaded ? (
                            <div className="dashboard-subsection-block">
                              <h3>Carregando dados do paciente</h3>
                              <p className="dashboard-muted">
                                {patientDetailsLoadingId === selectedPatient.id
                                  ? "Buscando histórico, prescrições, exames e alergias..."
                                  : patientDetailsError || "Os dados completos do paciente ainda não foram carregados."}
                              </p>
                              {patientDetailsError ? (
                                <div className="dashboard-inline-actions">
                                  <button
                                    type="button"
                                    className="dashboard-mini-button"
                                    onClick={() => void loadPatientDetails(selectedPatient.id, { force: true })}
                                  >
                                    Tentar novamente
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : patientView === "allergies" ? (
                            <div className="dashboard-subsection-block">
                              <h3>Alergias</h3>
                              <div className="dashboard-inline-actions">
                                <button
                                  type="button"
                                  className="dashboard-mini-button"
                                  onClick={() => {
                                    setShowAllergyComposer((current) => !current);
                                    setAllergyFeedback(null);
                                    setAllergyForm({
                                      query: "",
                                      selectedValue: "",
                                      reactionDescription: ""
                                    });
                                  }}
                                >
                                  {showAllergyComposer ? "Cancelar" : "Adicionar alergia"}
                                </button>
                              </div>

                              {showAllergyComposer ? (
                                <form className="dashboard-form" onSubmit={handleAllergySubmit}>
                                  <input
                                    placeholder="Buscar alergia por medicamento, princípio ativo ou classe"
                                    value={allergyForm.query}
                                    onChange={(event) =>
                                      setAllergyForm({
                                        query: event.target.value,
                                        selectedValue: "",
                                        reactionDescription: allergyForm.reactionDescription
                                      })
                                    }
                                  />

                                  {allergyForm.query.trim() ? (
                                    <div className="dashboard-allergy-suggestions">
                                      {filteredAllergySuggestions.length === 0 ? (
                                        <p className="dashboard-muted">
                                          Nenhuma sugestão encontrada para essa busca.
                                        </p>
                                      ) : (
                                        filteredAllergySuggestions.map((suggestion) => (
                                          <button
                                            key={suggestion.key}
                                            type="button"
                                            className={`dashboard-allergy-suggestion ${
                                              allergyForm.selectedValue === suggestion.value ? "is-active" : ""
                                            }`}
                                            onClick={() =>
                                              setAllergyForm({
                                                query: suggestion.value,
                                                selectedValue: suggestion.value,
                                                reactionDescription: allergyForm.reactionDescription
                                              })
                                            }
                                          >
                                            {suggestion.label}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  ) : null}

                                  <p className="dashboard-muted">
                                    A busca atualiza em tempo real. Você pode registrar por medicamento ou por
                                    princípio ativo (ex.: Morfina).
                                  </p>

                                  <textarea
                                    placeholder="Tipo de reação / o que aconteceu"
                                    value={allergyForm.reactionDescription}
                                    onChange={(event) =>
                                      setAllergyForm((current) => ({
                                        ...current,
                                        reactionDescription: event.target.value
                                      }))
                                    }
                                    rows={3}
                                  />

                                  {allergyFeedback ? (
                                    <p className={`dashboard-feedback dashboard-feedback-${allergyFeedback.type}`}>
                                      {allergyFeedback.message}
                                    </p>
                                  ) : null}

                                  <button type="submit" disabled={allergyLoading || !allergyForm.query.trim()}>
                                    {allergyLoading ? "Salvando..." : "Salvar alergia"}
                                  </button>
                                </form>
                              ) : allergyFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${allergyFeedback.type}`}>
                                  {allergyFeedback.message}
                                </p>
                              ) : null}

                              <div className="dashboard-table-wrap">
                                <table className="dashboard-table">
                                  <thead>
                                    <tr>
                                      <th>Alergia</th>
                                      <th>Reação</th>
                                      <th>Registro</th>
                                      <th>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedPatientAllergies.length === 0 ? (
                                      <tr>
                                        <td colSpan={4}>Nenhuma alergia cadastrada.</td>
                                      </tr>
                                    ) : (
                                      selectedPatientAllergies.map((allergy) => (
                                        <tr key={allergy.id}>
                                          <td>{allergy.allergyName}</td>
                                          <td>
                                            {allergyEditingId === allergy.id ? (
                                              <textarea
                                                value={allergyEditReactionDescription}
                                                onChange={(event) =>
                                                  setAllergyEditReactionDescription(event.target.value)
                                                }
                                                rows={3}
                                                placeholder="Tipo de reação / o que aconteceu"
                                              />
                                            ) : (
                                              allergy.reactionDescription?.trim() || "-"
                                            )}
                                          </td>
                                          <td>{formatTimestamp(allergy.createdAt)}</td>
                                          <td>
                                            <div className="dashboard-inline-actions">
                                              {allergyEditingId === allergy.id ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="dashboard-mini-button"
                                                    onClick={() => void handleUpdateAllergy(allergy)}
                                                    disabled={allergyUpdatingId === allergy.id}
                                                  >
                                                    {allergyUpdatingId === allergy.id
                                                      ? "Salvando..."
                                                      : "Salvar"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="dashboard-chip-remove"
                                                    onClick={cancelAllergyEdit}
                                                    disabled={allergyUpdatingId === allergy.id}
                                                  >
                                                    Cancelar
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="dashboard-mini-button"
                                                    onClick={() => startAllergyEdit(allergy)}
                                                    disabled={allergyRemovingId === allergy.id}
                                                  >
                                                    Editar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="dashboard-chip-remove"
                                                    onClick={() =>
                                                      handleRemoveAllergy(allergy.id, allergy.allergyName)
                                                    }
                                                    disabled={allergyRemovingId === allergy.id}
                                                  >
                                                    {allergyRemovingId === allergy.id
                                                      ? "Removendo..."
                                                      : "Remover"}
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}

                        {patientView === "admission-info" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Informações da internação</h3>

                            <form className="dashboard-form" onSubmit={handleAdmissionSubmit}>
                              <input
                                value={`${selectedPatient.fullName} (${selectedPatient.chartNumber})`}
                                disabled
                                aria-label="Paciente selecionado"
                              />

                              <div className="dashboard-two-columns">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Data de nascimento (DD/MM/AAAA)"
                                  value={selectedPatientProfileForm.birthDate}
                                  onChange={(event) =>
                                    setSelectedPatientProfileForm((current) => ({
                                      ...current,
                                      birthDate: formatEditableDateInput(event.target.value)
                                    }))
                                  }
                                />
                                <input
                                  value={selectedPatientAgePreview === null ? "Idade: -" : `Idade: ${selectedPatientAgePreview} anos`}
                                  disabled
                                  aria-label="Idade calculada"
                                />
                              </div>

                              <div className="dashboard-two-columns">
                                <select
                                  value={selectedPatientProfileForm.sex}
                                  onChange={(event) =>
                                    setSelectedPatientProfileForm((current) => ({
                                      ...current,
                                      sex: event.target.value as PatientSex | ""
                                    }))
                                  }
                                >
                                  <option value="">Sexo biológico</option>
                                  {PATIENT_SEX_OPTIONS.map((sex) => (
                                    <option key={sex} value={sex}>
                                      {formatPatientSexLabel(sex)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={
                                    selectedPatientProfileForm.sex
                                      ? `Sexo: ${formatPatientSexLabel(
                                          selectedPatientProfileForm.sex as PatientSex
                                        )}`
                                      : "Sexo não informado"
                                  }
                                  disabled
                                  aria-label="Sexo biológico do paciente"
                                />
                              </div>

                              <div className="dashboard-calculation-box">
                                <h3>Alergias replicadas do cadastro do paciente</h3>
                                {selectedPatientAllergies.length === 0 ? (
                                  <p>Nenhuma alergia cadastrada para este paciente.</p>
                                ) : (
                                  <ul className="dashboard-chip-list">
                                    {selectedPatientAllergies.map((allergy) => (
                                      <li key={allergy.id}>{formatAllergyDisplay(allergy)}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="dashboard-two-columns">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Admissão (DD/MM/AAAA)"
                                  value={admissionForm.admissionDate}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      admissionDate: event.target.value
                                    }))
                                  }
                                  required
                                />
                                <input
                                  placeholder="Leito"
                                  value={admissionForm.bed}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({ ...current, bed: event.target.value }))
                                  }
                                  required
                                />
                              </div>

                              <input
                                placeholder="Motivo da internação"
                                value={admissionForm.admissionReason}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({
                                    ...current,
                                    admissionReason: event.target.value
                                  }))
                                }
                                required
                              />

                              <select
                                value={admissionForm.teamId}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({ ...current, teamId: event.target.value }))
                                }
                                required
                              >
                                <option value="">Selecione a equipe</option>
                                {groupedTeamOptions.map((group) => (
                                  <option key={group.key} value={group.representativeTeamId}>
                                    {group.label}
                                  </option>
                                ))}
                              </select>

                              <div className="dashboard-two-columns">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Peso (kg)"
                                  value={admissionForm.weightKg}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({ ...current, weightKg: event.target.value }))
                                  }
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Altura (cm)"
                                  value={admissionForm.heightCm}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({ ...current, heightCm: event.target.value }))
                                  }
                                />
                              </div>

                              <div className="dashboard-two-columns">
                                <select
                                  value={admissionForm.bmiFormula}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      bmiFormula: event.target.value as BmiFormulaId
                                    }))
                                  }
                                >
                                  {BMI_FORMULA_OPTIONS.map((formula) => (
                                    <option key={formula.id} value={formula.id}>
                                      IMC: {formula.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={admissionForm.bsaFormula}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      bsaFormula: event.target.value as BsaFormulaId
                                    }))
                                  }
                                >
                                  {BSA_FORMULA_OPTIONS.map((formula) => (
                                    <option key={formula.id} value={formula.id}>
                                      SC: {formula.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="dashboard-calculation-box">
                                <h3>Cálculo automático</h3>
                                <p>Os resultados são preenchidos automaticamente a partir de peso e altura.</p>
                                <div className="dashboard-two-columns">
                                  <div className="dashboard-calculation-result">
                                    <label>IMC calculado</label>
                                    <input
                                      value={
                                        admissionPreview ? formatNumber(admissionPreview.bmi) : "IMC calculado"
                                      }
                                      disabled
                                    />
                                    <p>{selectedBmiFormula?.equation ?? "-"}</p>
                                  </div>
                                  <div className="dashboard-calculation-result">
                                    <label>SC calculada</label>
                                    <input
                                      value={
                                        admissionPreview
                                          ? formatNumber(admissionPreview.bodySurfaceArea)
                                          : "Superfície corporal calculada"
                                      }
                                      disabled
                                    />
                                    <p>{selectedBsaFormula?.equation ?? "-"}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="dashboard-inline-actions">
                                <button
                                  type="button"
                                  className="dashboard-mini-button"
                                  onClick={() => setShowAdmissionSummaryComposer((current) => !current)}
                                >
                                  {showAdmissionSummaryComposer
                                    ? "Cancelar resumo"
                                    : admissionForm.admissionSummary.trim()
                                      ? "Editar resumo da internação"
                                      : "Adicionar resumo da internação"}
                                </button>
                                {admissionForm.admissionSummary.trim() ? (
                                  <button
                                    type="button"
                                    className="dashboard-mini-button"
                                    onClick={() => setShowAdmissionSummaryPreview((current) => !current)}
                                  >
                                    {showAdmissionSummaryPreview ? "Ocultar resumo" : "Ver resumo"}
                                  </button>
                                ) : null}
                              </div>

                              {showAdmissionSummaryComposer ? (
                                <>
                                  <textarea
                                    ref={admissionSummaryTextareaRef}
                                    placeholder="Resumo da internação"
                                    value={admissionForm.admissionSummary}
                                    onChange={(event) =>
                                      setAdmissionForm((current) => ({
                                        ...current,
                                        admissionSummary: event.target.value
                                      }))
                                    }
                                    onSelect={syncAdmissionSummarySelection}
                                    onKeyUp={syncAdmissionSummarySelection}
                                    onMouseUp={syncAdmissionSummarySelection}
                                    rows={8}
                                  />
                                  <div className="dashboard-inline-actions">
                                    <button
                                      type="button"
                                      className="dashboard-mini-button"
                                      onClick={applySelectedAdmissionSummaryText}
                                      disabled={!admissionSummarySelection.trim()}
                                    >
                                      Salvar selecao para MUC
                                    </button>
                                  </div>
                                  <p className="dashboard-muted">
                                    Selecione no resumo apenas o trecho do MUC e clique em salvar selecao.
                                  </p>
                                </>
                              ) : null}

                              {showAdmissionSummaryPreview && admissionForm.admissionSummary.trim() ? (
                                <div className="dashboard-calculation-box">
                                  <h3>Resumo da internação</h3>
                                  <p style={{ whiteSpace: "pre-wrap" }}>{admissionForm.admissionSummary}</p>
                                </div>
                              ) : null}

                              {admissionForm.admissionSummary.trim() ? (
                                <div className="dashboard-calculation-box">
                                  <h3>Trecho salvo para MUC</h3>
                                  {admissionSummarySelection.trim() ? (
                                    <p className="dashboard-muted">
                                      Selecao atual: {admissionSummarySelection}
                                    </p>
                                  ) : (
                                    <p className="dashboard-muted">
                                      Nenhum trecho selecionado no momento.
                                    </p>
                                  )}
                                  <div className="dashboard-inline-actions">
                                    <span
                                      className="dashboard-status-pill"
                                      style={{ background: "#d7ecff", color: "#163c68" }}
                                    >
                                      {admissionForm.admissionImportExcerpt.trim() ? "Trecho de MUC salvo" : "Nenhum trecho salvo"}
                                    </span>
                                    {admissionForm.admissionImportExcerpt.trim() ? (
                                      <button
                                        type="button"
                                        className="dashboard-mini-button"
                                        onClick={() =>
                                          setAdmissionForm((current) => ({
                                            ...current,
                                            admissionImportExcerpt: ""
                                          }))
                                        }
                                      >
                                        Limpar trecho
                                      </button>
                                    ) : null}
                                  </div>
                                  {admissionForm.admissionImportExcerpt.trim() ? (
                                    <p
                                      className="dashboard-muted"
                                      style={{ whiteSpace: "pre-wrap", background: "#d7ecff", padding: "0.75rem", borderRadius: "12px" }}
                                    >
                                      {admissionForm.admissionImportExcerpt}
                                    </p>
                                  ) : null}
                                  <p className="dashboard-muted">
                                    Ao clicar em Atualizar internação, a importação automática vai usar apenas este trecho para MUC.
                                  </p>
                                </div>
                              ) : null}

                              {admissionFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${admissionFeedback.type}`}>
                                  {admissionFeedback.message}
                                </p>
                              ) : null}

                              <button type="submit" disabled={admissionLoading}>
                                {admissionLoading
                                  ? "Salvando..."
                                  : admissionForm.admissionId
                                    ? "Atualizar internação"
                                    : "Salvar internação"}
                              </button>
                            </form>

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Admissão</th>
                                    <th>Leito</th>
                                    <th>Equipe</th>
                                    <th>Motivo</th>
                                    <th>Resumo</th>
                                    <th>Peso/Altura</th>
                                    <th>IMC</th>
                                    <th>SC</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedPatientAdmissions.length === 0 ? (
                                    <tr>
                                      <td colSpan={8}>Sem internações cadastradas para este paciente.</td>
                                    </tr>
                                  ) : (
                                    selectedPatientAdmissions.map((admission) => (
                                      <tr key={admission.id}>
                                        <td>{formatAdmissionDate(admission.admissionDate)}</td>
                                        <td>{admission.bed}</td>
                                        <td>{admission.teamName ?? "-"}</td>
                                        <td>{admission.admissionReason}</td>
                                        <td>{admission.admissionSummary?.trim() ? "Disponível" : "-"}</td>
                                        <td>
                                          {admission.weightKg !== null && admission.heightCm !== null
                                            ? `${formatNumber(admission.weightKg)} kg / ${formatNumber(admission.heightCm)} cm`
                                            : "-"}
                                        </td>
                                        <td>{admission.bmi !== null ? formatNumber(admission.bmi) : "-"}</td>
                                        <td>
                                          {admission.bodySurfaceArea !== null
                                            ? formatNumber(admission.bodySurfaceArea)
                                            : "-"}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}

                        {patientView === "interview" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Entrevista</h3>
                            <p className="dashboard-muted">
                              Registre a fonte da informação e os dados clínicos disponíveis desta internação.
                            </p>

                            <form className="dashboard-form" onSubmit={handleInterviewSubmit}>
                              <input
                                value={`${selectedPatient.fullName} (${selectedPatient.chartNumber})`}
                                disabled
                                aria-label="Paciente selecionado"
                              />

                              <div className="dashboard-two-columns">
                                <select
                                  value={admissionForm.interviewInformationQuality}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      interviewInformationQuality: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Qualidade das informações</option>
                                  {INTERVIEW_INFORMATION_QUALITY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {INTERVIEW_INFORMATION_QUALITY_LABELS[option]}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={admissionForm.interviewInformationSourceType}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      interviewInformationSourceType: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Quem forneceu as informações?</option>
                                  <option value="patient">Próprio paciente</option>
                                  <option value="informant">Cuidador/familiar/outro</option>
                                </select>
                              </div>

                              {admissionForm.interviewInformationSourceType === "informant" ? (
                                <div className="dashboard-two-columns">
                                  <input
                                    placeholder="Nome de quem forneceu as informações"
                                    value={admissionForm.interviewInformationSourceName}
                                    onChange={(event) =>
                                      setAdmissionForm((current) => ({
                                        ...current,
                                        interviewInformationSourceName: event.target.value
                                      }))
                                    }
                                  />
                                  <input
                                    placeholder="Parentesco ou vínculo"
                                    value={admissionForm.interviewInformationSourceRelationship}
                                    onChange={(event) =>
                                      setAdmissionForm((current) => ({
                                        ...current,
                                        interviewInformationSourceRelationship: event.target.value
                                      }))
                                    }
                                  />
                                </div>
                              ) : null}

                              <textarea
                                placeholder="Subjetivo"
                                value={admissionForm.interviewSubjective}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({
                                    ...current,
                                    interviewSubjective: event.target.value
                                  }))
                                }
                                rows={5}
                              />

                              <textarea
                                placeholder="Sintomas relevantes"
                                value={admissionForm.interviewRelevantSymptoms}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({
                                    ...current,
                                    interviewRelevantSymptoms: event.target.value
                                  }))
                                }
                                rows={3}
                              />

                              <div className="dashboard-two-columns">
                                <textarea
                                  placeholder="Plano farmacêutico e conduta"
                                  value={admissionForm.interviewPlan}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      interviewPlan: event.target.value
                                    }))
                                  }
                                  rows={5}
                                />
                                <textarea
                                  placeholder="Pendências"
                                  value={admissionForm.interviewPendingIssues}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      interviewPendingIssues: event.target.value
                                    }))
                                  }
                                  rows={5}
                                />
                              </div>

                              {!admissionForm.admissionId.trim() ? (
                                <p className="dashboard-muted">
                                  Salve primeiro as informações da internação para persistir a entrevista.
                                </p>
                              ) : null}

                              {admissionFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${admissionFeedback.type}`}>
                                  {admissionFeedback.message}
                                </p>
                              ) : null}

                              <div className="dashboard-inline-actions">
                                <button
                                  type="submit"
                                  disabled={admissionLoading || !admissionForm.admissionId.trim()}
                                >
                                  {admissionLoading ? "Salvando..." : "Salvar entrevista"}
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : null}

                        {patientView === "exams" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Exames</h3>
                            <p className="dashboard-muted">
                              Importe um PDF de exames para extrair o texto e identificar resultados. O PDF é
                              processado para extração, mas não fica salvo no sistema; apenas os dados extraídos
                              permanecem vinculados ao paciente.
                            </p>

                            <form className="dashboard-form" onSubmit={handleExamPdfImport}>
                              <input
                                ref={examPdfInputRef}
                                type="file"
                                accept="application/pdf"
                                aria-label="Importar PDF de exames"
                              />

                              {examImportFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${examImportFeedback.type}`}>
                                  {examImportFeedback.message}
                                </p>
                              ) : null}

                              <button type="submit" disabled={examImportLoading}>
                                {examImportLoading ? "Extraindo..." : "Extrair dados do PDF"}
                              </button>
                            </form>

                            {shouldShowLatestExamImportPreview && examImportResult ? (
                              <>
                                <div className="dashboard-calculation-box">
                                  <h3>Última importação processada</h3>
                                  <div className="dashboard-exam-summary-grid">
                                    <div className="dashboard-exam-summary-card">
                                      <span>Arquivo</span>
                                      <strong>{examImportResult.fileName}</strong>
                                    </div>
                                    <div className="dashboard-exam-summary-card">
                                      <span>Páginas processadas</span>
                                      <strong>{examImportResult.pageCount}</strong>
                                    </div>
                                    <div className="dashboard-exam-summary-card">
                                      <span>Extraído em</span>
                                      <strong>{formatTimestamp(examImportResult.importedAt)}</strong>
                                    </div>
                                    <div className="dashboard-exam-summary-card">
                                      <span>Resultados identificados</span>
                                      <strong>{examImportResult.records.length}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="dashboard-calculation-box">
                                  <h3>Exames principais em card</h3>
                                  <ImportantExamCardsPanel
                                    records={examImportResult.records}
                                    rawText={examImportResult.rawText}
                                    patientAgeYears={selectedPatient?.ageYears}
                                    patientSex={selectedPatient?.sex}
                                    emptyMessage="Nenhum exame principal foi identificado nesta importação."
                                  />
                                </div>

                                <details className="dashboard-collapsible-panel">
                                  <summary>Ver outros resultados e texto extraído</summary>
                                  <div className="dashboard-calculation-box">
                                    <h3>Outros resultados extraídos</h3>
                                    <ExamResultsPanel
                                      records={examImportResult.records.filter(
                                        (record) => !isImportantExamRecord(record.examName)
                                      )}
                                      rawText={examImportResult.rawText}
                                      emptyMessage="Nenhum resultado adicional foi identificado nesta importação."
                                    />
                                  </div>

                                  <div className="dashboard-calculation-box">
                                    <h3>Texto extraído</h3>
                                    <textarea value={examImportResult.rawText} readOnly rows={18} />
                                  </div>
                                </details>
                              </>
                            ) : null}

                            <div className="dashboard-calculation-box">
                              <h3>Histórico salvo no paciente</h3>

                              {selectedPatientExamImports.length > 0 ? (
                                <>
                                  <select
                                    value={
                                      selectedSavedExamImportDetails
                                        ? String(selectedSavedExamImportDetails.id)
                                        : ""
                                    }
                                    onChange={(event) => setSelectedExamImportId(event.target.value)}
                                  >
                                    {selectedPatientExamImports.map((examImport) => (
                                      <option key={examImport.id} value={examImport.id}>
                                        {`${formatTimestamp(examImport.createdAt)} - ${examImport.fileName}`}
                                      </option>
                                    ))}
                                  </select>

                                  {selectedSavedExamImportDetails ? (
                                    <>
                                      <div className="dashboard-inline-actions">
                                        <button
                                          type="button"
                                          className="dashboard-chip-remove"
                                          onClick={() =>
                                            handleRemoveExamImport(selectedSavedExamImportDetails)
                                          }
                                          disabled={
                                            examImportRemovingId === selectedSavedExamImportDetails.id
                                          }
                                        >
                                          {examImportRemovingId === selectedSavedExamImportDetails.id
                                            ? "Removendo..."
                                            : "Remover importação"}
                                        </button>
                                      </div>

                                      <div className="dashboard-exam-summary-grid">
                                        <div className="dashboard-exam-summary-card">
                                          <span>Arquivo</span>
                                          <strong>{selectedSavedExamImportDetails.fileName}</strong>
                                        </div>
                                        <div className="dashboard-exam-summary-card">
                                          <span>Páginas processadas</span>
                                          <strong>{selectedSavedExamImportDetails.pageCount}</strong>
                                        </div>
                                        <div className="dashboard-exam-summary-card">
                                          <span>Importado em</span>
                                          <strong>
                                            {formatTimestamp(selectedSavedExamImportDetails.createdAt)}
                                          </strong>
                                        </div>
                                        <div className="dashboard-exam-summary-card">
                                          <span>Importado por</span>
                                          <strong>
                                            {selectedSavedExamImportDetails.importedByProfessionalName}
                                          </strong>
                                        </div>
                                        <div className="dashboard-exam-summary-card">
                                          <span>Resultados identificados</span>
                                          <strong>{selectedSavedExamImportDetails.records.length}</strong>
                                        </div>
                                      </div>

                                      <div className="dashboard-calculation-box">
                                        <h3>Exames principais em card</h3>
                                        <p className="dashboard-muted">
                                          Os exames principais mostram valor, faixa de referência e alerta de alto ou baixo.
                                        </p>
                                        {selectedExamImportDetailsLoading ? (
                                          <p className="dashboard-muted">
                                            Carregando detalhes completos da importação...
                                          </p>
                                        ) : null}
                                        <ImportantExamCardsPanel
                                          records={selectedSavedExamImportDetails.records}
                                          rawText={selectedSavedExamImportDetails.rawText}
                                          patientAgeYears={selectedPatient?.ageYears}
                                          patientSex={selectedPatient?.sex}
                                          emptyMessage="Essa importação não gerou exames principais estruturados."
                                          onRemoveRecord={(record) =>
                                            void handleRemoveExamRecord(
                                              selectedSavedExamImportDetails,
                                              record
                                            )
                                          }
                                          removingRecordKey={examRecordRemovingKey}
                                        />
                                      </div>

                                      <details className="dashboard-collapsible-panel">
                                        <summary>Ver outros resultados e texto extraído</summary>
                                        <div className="dashboard-calculation-box">
                                          <h3>Outros resultados salvos</h3>
                                          <p className="dashboard-muted">
                                            Você pode remover resultados individualmente sem excluir a importação inteira.
                                          </p>
                                          <ExamResultsPanel
                                            records={selectedSavedExamImportDetails.records.filter(
                                              (record) => !isImportantExamRecord(record.examName)
                                            )}
                                            rawText={selectedSavedExamImportDetails.rawText}
                                            emptyMessage="Essa importação não gerou outros resultados estruturados, mas o texto foi salvo."
                                            onRemoveRecord={(record) =>
                                              void handleRemoveExamRecord(
                                                selectedSavedExamImportDetails,
                                                record
                                              )
                                            }
                                            removingRecordKey={examRecordRemovingKey}
                                          />
                                        </div>

                                        <div className="dashboard-calculation-box">
                                          <h3>Texto extraído</h3>
                                          <textarea
                                            value={
                                              selectedExamImportDetailsLoading
                                                ? "Carregando texto extraído..."
                                                : selectedSavedExamImportDetails.rawText
                                            }
                                            readOnly
                                            rows={18}
                                          />
                                        </div>
                                      </details>
                                    </>
                                  ) : null}
                                </>
                              ) : (
                                <p className="dashboard-muted">
                                  Nenhuma importação de exames salva para este paciente.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {patientView === "prior-use" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Medicamentos de uso prévio</h3>
                            <form className="dashboard-form" onSubmit={handlePriorMedicationSubmit}>
                              <div className="dashboard-two-columns">
                                <input
                                  list="prior-medication-options"
                                  placeholder="Pesquisar no cadastro ou digitar medicamento"
                                  value={priorMedicationForm.medicationName}
                                  onChange={(event) => handlePriorMedicationNameChange(event.target.value)}
                                  required
                                />
                                <input
                                  value={
                                    priorMedicationCatalogMatch
                                      ? "Vinculado ao cadastro de medicamentos"
                                      : priorMedicationForm.medicationName.trim()
                                        ? "Fora do cadastro: será incluído na lista rápida"
                                        : "Sem medicamento selecionado"
                                  }
                                  disabled
                                  aria-label="Status do medicamento"
                                />
                              </div>
                              <datalist id="prior-medication-options">
                                {priorMedicationQuickOptions.map((medicationName) => (
                                  <option key={medicationName} value={medicationName} />
                                ))}
                              </datalist>

                              <div className="dashboard-two-columns">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Dose (opcional)"
                                  value={priorMedicationForm.dose}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      dose: formatEditableDecimalInput(event.target.value)
                                    }))
                                  }
                                />
                                <input
                                  placeholder="Unidade da dose (opcional)"
                                  value={priorMedicationForm.doseUnit}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      doseUnit: event.target.value
                                    }))
                                  }
                                />
                              </div>

                              <div className="dashboard-two-columns">
                                <select
                                  value={priorMedicationForm.frequency}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      frequency: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Selecione a frequência (opcional)</option>
                                  {PRIOR_MEDICATION_FREQUENCY_OPTIONS.map((frequencyOption) => (
                                    <option key={frequencyOption} value={frequencyOption}>
                                      {frequencyOption}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  placeholder="Quantidade por horário (ex.: 1-1-1)"
                                  value={priorMedicationForm.shifts}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      shifts: event.target.value
                                    }))
                                  }
                                />
                              </div>

                              <p className="dashboard-muted">
                                Se não tiver dose, frequência ou quantidade por horário, você pode salvar apenas
                                o nome do medicamento.
                              </p>

                              <p className="dashboard-muted">
                                Para esquema semanal (ex.: 3 vezes por semana), selecione a frequência e informe a
                                quantidade por horário no padrão da tomada (ex.: 1-1-1).
                              </p>

                              <label className="dashboard-inline-toggle">
                                <input
                                  type="checkbox"
                                  checked={admissionForm.deniesContinuousMedicationUse}
                                  onChange={(event) =>
                                    setAdmissionForm((current) => ({
                                      ...current,
                                      deniesContinuousMedicationUse: event.target.checked
                                    }))
                                  }
                                />
                                Paciente nega uso de MUC
                              </label>

                              <p className="dashboard-muted">
                                Use esse marcador quando não houver medicamento de uso prévio para registrar. Ele
                                entra automaticamente na evolução após salvar.
                              </p>

                              {!admissionForm.admissionId.trim() ? (
                                <p className="dashboard-muted">
                                  Salve primeiro a internação para persistir o marcador de nega uso de MUC.
                                </p>
                              ) : null}

                              <div className="dashboard-two-columns">
                                <input
                                  value={
                                    priorMedicationFormReconciliation?.latestPrescriptionDate
                                      ? `Última prescrição: ${formatTimestamp(
                                          priorMedicationFormReconciliation.latestPrescriptionDate
                                        )}`
                                      : "Última prescrição: não encontrada"
                                  }
                                  disabled
                                  aria-label="Data da última prescrição"
                                />
                                <input
                                  value={
                                    priorMedicationFormReconciliation?.latestReconciled
                                      ? "Reconciliado na última: Sim"
                                      : "Reconciliado na última: Não"
                                  }
                                  className={
                                    priorMedicationFormReconciliation?.latestReconciled
                                      ? ""
                                      : "dashboard-alert-missing"
                                  }
                                  disabled
                                  aria-label="Reconciliado na última prescrição"
                                />
                              </div>

                              <input
                                value={
                                  priorMedicationFormReconciliation?.reconciledInAllPrescriptions
                                    ? "Reconciliado em todas as prescrições: Sim"
                                    : "Reconciliado em todas as prescrições: Não"
                                }
                                disabled
                                aria-label="Reconciliado em todas as prescrições"
                              />

                            {priorMedicationFeedback ? (
                              <p
                                className={`dashboard-feedback dashboard-feedback-${priorMedicationFeedback.type}`}
                              >
                                {priorMedicationFeedback.message}
                              </p>
                            ) : null}

                            <button type="submit" disabled={priorMedicationLoading}>
                              {priorMedicationLoading ? "Salvando..." : "Salvar medicamento prévio"}
                            </button>
                          </form>

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Medicamento</th>
                                    <th>Dose</th>
                                    <th>Frequência</th>
                                    <th>Qtd. por horário</th>
                                    <th>Data da prescrição</th>
                                    <th>Reconciliado</th>
                                    <th>Reconciliado em todas</th>
                                    <th>Manual</th>
                                    <th>Vincular prescrição</th>
                                    <th>Histórico</th>
                                    <th>Registro</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {priorMedicationEditableRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={12}>Nenhum medicamento prévio cadastrado.</td>
                                    </tr>
                                  ) : (
                                    priorMedicationEditableRows.map((row) => (
                                      <tr
                                        key={row.priorMedication.id}
                                        className={row.latestReconciled ? "" : "dashboard-row-missing"}
                                      >
                                        <td>{row.priorMedication.medicationName}</td>
                                        <td>
                                          <input
                                            placeholder="Dose (ex.: 100 mg)"
                                            value={row.formState.dose}
                                            onChange={(event) =>
                                              updatePriorMedicationReconciliationField(
                                                row.priorMedication.id,
                                                "dose",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={row.formState.frequency}
                                            onChange={(event) =>
                                              updatePriorMedicationReconciliationField(
                                                row.priorMedication.id,
                                                "frequency",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={row.formState.shifts}
                                            onChange={(event) =>
                                              updatePriorMedicationReconciliationField(
                                                row.priorMedication.id,
                                                "shifts",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          {row.latestPrescriptionDate
                                            ? formatTimestamp(row.latestPrescriptionDate)
                                            : "-"}
                                        </td>
                                        <td className={row.latestReconciled ? "" : "dashboard-cell-alert"}>
                                          {row.latestReconciled ? "Sim" : "Não"}
                                        </td>
                                        <td>
                                          {row.reconciledInAllPrescriptions === null
                                            ? "Não"
                                            : row.reconciledInAllPrescriptions
                                              ? "Sim"
                                              : "Não"}
                                        </td>
                                        <td>
                                          <select
                                            value={row.formState.reconciliationManualStatus}
                                            onChange={(event) =>
                                              setPriorMedicationReconciliationForm((current) => ({
                                                ...current,
                                                [row.priorMedication.id]: {
                                                  ...(current[row.priorMedication.id] ??
                                                    createPriorMedicationReconciliationFormState(
                                                      row.priorMedication
                                                    )),
                                                  reconciliationManualStatus: event.target.value as
                                                    PriorMedicationReconciliationFormState["reconciliationManualStatus"]
                                                }
                                              }))
                                            }
                                          >
                                            <option value="">Automático</option>
                                            <option value="sim">Sim</option>
                                            <option value="nao">Não</option>
                                          </select>
                                        </td>
                                        <td>
                                          <select
                                            value={row.formState.reconciliationPrescriptionId}
                                            onChange={(event) =>
                                              setPriorMedicationReconciliationForm((current) => ({
                                                ...current,
                                                [row.priorMedication.id]: {
                                                  ...(current[row.priorMedication.id] ??
                                                    createPriorMedicationReconciliationFormState(
                                                      row.priorMedication
                                                    )),
                                                  reconciliationPrescriptionId: event.target.value
                                                }
                                              }))
                                            }
                                          >
                                            <option value="">
                                              {priorMedicationPrescriptionLinkOptions.length > 0
                                                ? "Sem vínculo manual"
                                                : "Sem prescrições para vincular"}
                                            </option>
                                            {priorMedicationPrescriptionLinkOptions.map((option) => (
                                              <option key={option.id} value={option.id}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          {row.history.length === 0 ? (
                                            "-"
                                          ) : (
                                            <details>
                                              <summary>Ver histórico</summary>
                                              {row.history.map((historyItem) => (
                                                <p key={`${row.priorMedication.id}-${historyItem.key}`}>
                                                  {historyItem.prescriptionDate
                                                    ? formatTimestamp(historyItem.prescriptionDate)
                                                    : "Sem data"}
                                                  {" "}
                                                  | Reconciliado: {historyItem.reconciled ? "Sim" : "Não"}
                                                  {" "}
                                                  | Origem:{" "}
                                                  {historyItem.source === "manual"
                                                    ? "Manual"
                                                    : "Automática"}
                                                </p>
                                              ))}
                                            </details>
                                          )}
                                        </td>
                                        <td>{formatTimestamp(row.priorMedication.createdAt)}</td>
                                        <td>
                                          <button
                                            type="button"
                                            className="dashboard-mini-button dashboard-mini-button-inline"
                                            onClick={() =>
                                              handleUpdatePriorMedicationReconciliation(row.priorMedication.id)
                                            }
                                            disabled={
                                              priorMedicationUpdatingId === row.priorMedication.id ||
                                              priorMedicationBatchSaving
                                            }
                                          >
                                            {priorMedicationUpdatingId === row.priorMedication.id
                                              ? "Salvando..."
                                              : "Salvar"}
                                          </button>
                                          <button
                                            type="button"
                                            className="dashboard-chip-remove"
                                            onClick={() =>
                                              handleRemovePriorMedication(
                                                row.priorMedication.id,
                                                row.priorMedication.medicationName
                                              )
                                            }
                                            disabled={priorMedicationRemovingId === row.priorMedication.id}
                                          >
                                            {priorMedicationRemovingId === row.priorMedication.id
                                              ? "Removendo..."
                                              : "Remover"}
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className="dashboard-mini-button"
                                onClick={handleSaveAllPriorMedicationReconciliation}
                                disabled={
                                  priorMedicationBatchSaving ||
                                  (priorMedicationEditableRows.length === 0 &&
                                    !hasPriorMedicationNegationChange)
                                }
                              >
                                {priorMedicationBatchSaving ? "Salvando todos..." : "Salvar todos"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {patientView === "medication-validation" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Validação de medicamentos</h3>
                            <p className="dashboard-muted">
                              Lista automática dos medicamentos prescritos com `MEDICAMENTO NAO CADASTRADO`,
                              para validar estoque externo e calcular duração.
                            </p>

                            {prescriptionFeedback ? (
                              <p className={`dashboard-feedback dashboard-feedback-${prescriptionFeedback.type}`}>
                                {prescriptionFeedback.message}
                              </p>
                            ) : null}

                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className="dashboard-mini-button"
                                onClick={handleSaveAllMedicationValidation}
                                disabled={
                                  medicationValidationBatchSaving ||
                                  medicationValidationEditableRows.length === 0
                                }
                              >
                                {medicationValidationBatchSaving ? "Salvando todos..." : "Salvar todos"}
                              </button>
                            </div>

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Medicamento</th>
                                    <th>Dose</th>
                                    <th>Frequência</th>
                                    <th>Qtd. por horário</th>
                                    <th>Qtd. comp.</th>
                                    <th>Lote</th>
                                    <th>Validade</th>
                                    <th>Laboratório/Marca</th>
                                    <th>Consumo/dia</th>
                                    <th>Duração</th>
                                    <th>Prescrição</th>
                                    <th>Nota</th>
                                    <th>Não trouxe</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {medicationValidationEditableRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={14}>
                                        Nenhum medicamento não cadastrado encontrado na prescrição.
                                      </td>
                                    </tr>
                                  ) : (
                                    medicationValidationEditableRows.map((row) => (
                                      <tr key={row.prescription.id}>
                                        <td>{row.displayMedicationName}</td>
                                        <td>
                                          {formatNumber(row.prescription.dose)} {row.prescription.doseUnit}
                                        </td>
                                        <td>{row.prescription.frequency}</td>
                                        <td>{row.prescription.shifts}</td>
                                        <td>
                                          <input
                                            type="number"
                                            min="0"
                                            value={row.formState.quantityTablets}
                                            disabled={row.formState.patientDidNotBring}
                                            onChange={(event) =>
                                              updateMedicationValidationField(
                                                row.prescription.id,
                                                "quantityTablets",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={row.formState.lotNumber}
                                            disabled={row.formState.patientDidNotBring}
                                            onChange={(event) =>
                                              updateMedicationValidationField(
                                                row.prescription.id,
                                                "lotNumber",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="date"
                                            value={row.formState.expirationDate}
                                            disabled={row.formState.patientDidNotBring}
                                            onChange={(event) =>
                                              updateMedicationValidationField(
                                                row.prescription.id,
                                                "expirationDate",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={row.formState.manufacturer}
                                            disabled={row.formState.patientDidNotBring}
                                            onChange={(event) =>
                                              updateMedicationValidationField(
                                                row.prescription.id,
                                                "manufacturer",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          {row.dailyTabletUse !== null
                                            ? `${formatNumber(row.dailyTabletUse)} comp/dia`
                                            : "-"}
                                        </td>
                                        <td>
                                          {row.formState.patientDidNotBring
                                            ? "Paciente não trouxe"
                                            : formatDurationDays(row.currentDurationDays)}
                                        </td>
                                        <td>
                                          {row.prescription.validationStartAt
                                            ? formatTimestamp(row.prescription.validationStartAt)
                                            : formatTimestamp(row.prescription.createdAt)}
                                        </td>
                                        <td>
                                          <input
                                            placeholder="Observação"
                                            value={row.formState.stockValidationNote}
                                            onChange={(event) =>
                                              updateMedicationValidationField(
                                                row.prescription.id,
                                                "stockValidationNote",
                                                event.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <label className="dashboard-inline-toggle">
                                            <input
                                              type="checkbox"
                                              checked={row.formState.patientDidNotBring}
                                              onChange={(event) =>
                                                toggleMedicationDidNotBring(
                                                  row.prescription.id,
                                                  event.target.checked
                                                )
                                              }
                                            />
                                            Não trouxe
                                          </label>
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateMedicationValidation(row.prescription.id)
                                            }
                                            disabled={
                                              medicationValidationUpdatingId === row.prescription.id ||
                                              medicationValidationBatchSaving
                                            }
                                          >
                                            {medicationValidationUpdatingId === row.prescription.id
                                              ? "Salvando..."
                                              : "Salvar"}
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}

                        {patientView === "prescriptions" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Prescrição médica</h3>

                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className={`dashboard-mini-button ${
                                  prescriptionMode === "view" ? "is-active" : ""
                                }`}
                                onClick={() => setPrescriptionMode("view")}
                              >
                                Ver prescrições
                              </button>
                              <button
                                type="button"
                                className={`dashboard-mini-button ${
                                  prescriptionMode === "raw" ? "is-active" : ""
                                }`}
                                onClick={() => setPrescriptionMode("raw")}
                              >
                                Colar prescrição
                              </button>
                            </div>

                            {prescriptionMode === "view" ? (
                              <div className="dashboard-subtle-picker">
                                <p className="dashboard-subtle-picker-label">Últimas vigências</p>
                                {recentPrescriptionGroups.length === 0 ? (
                                  <p className="dashboard-muted">Nenhuma vigência disponível.</p>
                                ) : (
                                  <div className="dashboard-subtle-picker-actions">
                                    {recentPrescriptionGroups.map((group) => {
                                      const referenceDate =
                                        group.validationEndAt ??
                                        group.validationStartAt ??
                                        group.prescriptions[0]?.createdAt ??
                                        "";

                                      const titleStartDate =
                                        group.validationStartAt ??
                                        group.validationEndAt ??
                                        group.prescriptions[0]?.createdAt ??
                                        "";

                                      return (
                                        <button
                                          key={group.key}
                                          type="button"
                                          className={`dashboard-subtle-choice ${
                                            selectedPrescriptionGroupKey === group.key ? "is-active" : ""
                                          }`}
                                          onClick={() => setSelectedPrescriptionGroupKey(group.key)}
                                          title={`Vigência: ${
                                            titleStartDate
                                              ? formatPrescriptionValidityDate(titleStartDate)
                                              : "não definida"
                                          } até ${
                                            group.validationEndAt
                                              ? formatPrescriptionValidityDate(group.validationEndAt)
                                              : "não definida"
                                          } | Status: ${group.validationStatus ?? "Sem status"}`}
                                        >
                                          {formatPrescriptionValidityDate(referenceDate)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {prescriptionMode === "raw" ? (
                              <div className="dashboard-subsection-block">
                                <h3>Colar prescrição</h3>
                                <p className="dashboard-muted">
                                  Cole as linhas da prescrição. O sistema trata automaticamente as linhas válidas
                                  e vincula à internação atual do paciente quando houver uma ativa.
                                </p>

                                <textarea
                                  placeholder="Cole aqui as linhas da prescrição bruta"
                                  value={rawPrescriptionInput}
                                  onChange={(event) => setRawPrescriptionInput(event.target.value)}
                                />

                                <div className="dashboard-inline-actions">
                                  <button
                                    type="button"
                                    className="dashboard-mini-button"
                                    onClick={handleProcessRawPrescription}
                                  >
                                    Tratar prescrição
                                  </button>
                                  <button
                                    type="button"
                                    className="dashboard-mini-button"
                                    onClick={handleImportRawPrescriptions}
                                    disabled={rawPrescriptionLoading}
                                  >
                                    {rawPrescriptionLoading
                                      ? "Importando..."
                                      : "Salvar linhas válidas"}
                                  </button>
                                </div>

                                {rawPrescriptionFeedback ? (
                                  <p className={`dashboard-feedback dashboard-feedback-${rawPrescriptionFeedback.type}`}>
                                    {rawPrescriptionFeedback.message}
                                  </p>
                                ) : null}

                                <div className="dashboard-table-wrap">
                                  <table className="dashboard-table">
                                    <thead>
                                      <tr>
                                        <th>Linha</th>
                                        <th>Medicamentos</th>
                                        <th>Dose</th>
                                        <th>Unidade</th>
                                        <th>Via</th>
                                        <th>Frequência</th>
                                        <th>Obs.</th>
                                        <th>Flag</th>
                                        <th>Resultado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rawPrescriptionDrafts.length === 0 ? (
                                        <tr>
                                          <td colSpan={9}>Nenhuma linha tratada ainda.</td>
                                        </tr>
                                      ) : (
                                        rawPrescriptionDrafts.map((draft) => (
                                          <tr key={`${draft.lineNumber}-${draft.rawLine}`}>
                                            <td>{draft.lineNumber}</td>
                                            <td>{draft.medicationName || "-"}</td>
                                            <td>{draft.dose !== null ? formatNumber(draft.dose) : "-"}</td>
                                            <td>{draft.doseUnit || "-"}</td>
                                            <td>{draft.administrationRoute || "-"}</td>
                                            <td>{draft.frequency || "-"}</td>
                                            <td>{draft.notes || "-"}</td>
                                            <td>{renderMedicationFlags(draft.allergyConflict, draft.safetyFlags)}</td>
                                            <td>
                                              <span
                                                className={`dashboard-status-pill ${
                                                  draft.isValid ? "is-valid" : "is-invalid"
                                                }`}
                                              >
                                                {draft.validationMessage}
                                              </span>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : null}

                            {prescriptionMode === "view" ? (
                              visiblePrescriptionGroups.length === 0 ? (
                                <p className="dashboard-muted">
                                  Nenhuma prescrição cadastrada para este paciente.
                                </p>
                              ) : (
                                <div className="dashboard-list-box">
                                  <p className="dashboard-muted">
                                    Clique em um medicamento para ver o histórico deste paciente.
                                  </p>
                                  {visiblePrescriptionGroups.map((group) => {
                                    const groupNumber =
                                      selectedPatientPrescriptionGroups.findIndex(
                                        (currentGroup) => currentGroup.key === group.key
                                      ) + 1;

                                    return (
                                    <div key={group.key} className="dashboard-subsection-block">
                                      <h3>Conjunto de prescrição {groupNumber}</h3>
                                      <p className="dashboard-muted">
                                        Internação:
                                        {" "}
                                        {group.admissionDate
                                          ? `${formatAdmissionDate(group.admissionDate)} | Leito ${group.bed ?? "-"}`
                                          : "Sem vínculo"}
                                      </p>
                                      <p className="dashboard-muted">
                                        Vigência:
                                        {" "}
                                        {group.validationStartAt
                                          ? formatPrescriptionValidityDate(group.validationStartAt)
                                          : "não definida"}
                                        {" "}
                                        até
                                        {" "}
                                        {group.validationEndAt
                                          ? formatPrescriptionValidityDate(group.validationEndAt)
                                          : "não definida"}
                                        {" "}
                                        | Status: {group.validationStatus ?? "Sem status"}
                                        {" "}
                                        | Vigência atual:
                                        {" "}
                                        {isWithinPrescriptionValidity(
                                          group.validationStartAt,
                                          group.validationEndAt
                                        )
                                          ? "Ativa"
                                          : "Fora da vigência"}
                                      </p>
                                      <div className="dashboard-table-wrap">
                                        <table className="dashboard-table">
                                          <thead>
                                            <tr>
                                              <th>Medicamentos</th>
                                              <th>Dose</th>
                                              <th>Unidade</th>
                                              <th>Via</th>
                                              <th>Frequência</th>
                                              <th>Obs.</th>
                                              <th>Flag</th>
                                              <th>Intervenção</th>
                                              <th>Registro</th>
                                              <th>Ações</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {group.prescriptions.map((prescription) => {
                                              const prescriptionConflict = resolveAllergyConflict(
                                                getMedicationReferenceName(prescription.medicationName)
                                              );
                                              const prescriptionSafetyFlags = resolveMedicationSafetyFlags(
                                                getMedicationReferenceName(prescription.medicationName)
                                              );
                                              const isInterventionOpen =
                                                prescriptionInterventionOpenId === prescription.id;

                                              return (
                                                <Fragment key={prescription.id}>
                                                  <tr>
                                                    <td>
                                                      <button
                                                        type="button"
                                                        className="dashboard-link-button"
                                                        onClick={() =>
                                                          setSelectedPrescriptionMedicationHistory((current) => {
                                                            const sameSelection =
                                                              current !== null &&
                                                              ((current.medicationId !== null &&
                                                                prescription.medicationId !== null &&
                                                                current.medicationId ===
                                                                  prescription.medicationId) ||
                                                                current.medicationName ===
                                                                  prescription.medicationName);

                                                            return sameSelection
                                                              ? null
                                                              : {
                                                                  medicationId: prescription.medicationId,
                                                                  medicationName: prescription.medicationName,
                                                                  externalValidationCandidate:
                                                                    prescription.externalValidationCandidate
                                                                };
                                                          })
                                                        }
                                                      >
                                                        {getPrescriptionMedicationDisplayName(
                                                          prescription.medicationName,
                                                          prescription.externalValidationCandidate
                                                        )}
                                                      </button>
                                                    </td>
                                                    <td>{formatNumber(prescription.dose)}</td>
                                                    <td>{prescription.doseUnit}</td>
                                                    <td>{prescription.administrationRoute ?? "-"}</td>
                                                    <td>{prescription.frequency}</td>
                                                    <td>{prescription.notes ?? "-"}</td>
                                                    <td>
                                                      {renderMedicationFlags(
                                                        prescriptionConflict,
                                                        prescriptionSafetyFlags
                                                      )}
                                                    </td>
                                                    <td>
                                                      {hasPrescriptionIntervention(prescription) ? (
                                                        <span className="dashboard-table-summary">
                                                          {formatPrescriptionInterventionSummary(prescription)}
                                                        </span>
                                                      ) : (
                                                        "-"
                                                      )}
                                                    </td>
                                                    <td>{formatTimestamp(prescription.createdAt)}</td>
                                                    <td>
                                                      <button
                                                        type="button"
                                                        className="dashboard-mini-button"
                                                        onClick={() =>
                                                          setPrescriptionInterventionOpenId((current) =>
                                                            current === prescription.id ? null : prescription.id
                                                          )
                                                        }
                                                      >
                                                        {hasPrescriptionIntervention(prescription)
                                                          ? isInterventionOpen
                                                            ? "Fechar"
                                                            : "Editar intervenção"
                                                          : isInterventionOpen
                                                            ? "Fechar"
                                                            : "Intervir"}
                                                      </button>
                                                    </td>
                                                  </tr>
                                                  {isInterventionOpen ? (
                                                    <tr>
                                                      <td colSpan={10}>
                                                        <PrescriptionInterventionEditor
                                                          prescription={prescription}
                                                          isSaving={
                                                            prescriptionInterventionSavingId === prescription.id
                                                          }
                                                          onSave={handleSavePrescriptionIntervention}
                                                        />
                                                      </td>
                                                    </tr>
                                                  ) : null}
                                                </Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              )
                            ) : null}

                            {prescriptionMode === "view" && selectedPrescriptionMedicationHistory ? (
                              <div className="dashboard-subsection-block">
                                <div className="dashboard-inline-actions">
                                  <button
                                    type="button"
                                    className="dashboard-mini-button"
                                    onClick={() => setSelectedPrescriptionMedicationHistory(null)}
                                  >
                                    Fechar histórico
                                  </button>
                                </div>

                                <h3>Histórico do medicamento</h3>
                                <p className="dashboard-muted">
                                  Paciente: {selectedPatient?.fullName ?? "-"} | Medicamento:{" "}
                                  {getPrescriptionMedicationDisplayName(
                                    selectedPrescriptionMedicationHistory.medicationName,
                                    selectedPrescriptionMedicationHistory.externalValidationCandidate
                                  )}
                                </p>

                                {hasMedicationSafetyFlag(selectedPrescriptionMedicationSafetyFlags)
                                  ? renderMedicationFlags(null, selectedPrescriptionMedicationSafetyFlags)
                                  : null}

                                {selectedPrescriptionMedicationCatalogMatch ? (
                                  <p className="dashboard-muted">
                                    {selectedPrescriptionMedicationCatalogMatch.activeIngredients
                                      ? `Princípio ativo: ${selectedPrescriptionMedicationCatalogMatch.activeIngredients}. `
                                      : ""}
                                    {selectedPrescriptionMedicationCatalogMatch.therapeuticClass
                                      ? `Classe: ${selectedPrescriptionMedicationCatalogMatch.therapeuticClass}.`
                                      : ""}
                                  </p>
                                ) : null}

                                {selectedPrescriptionMedicationHistoryRows.length === 0 ? (
                                  <p className="dashboard-muted">
                                    Nenhum histórico encontrado para este medicamento neste paciente.
                                  </p>
                                ) : (
                                  <div className="dashboard-table-wrap">
                                    <table className="dashboard-table">
                                      <thead>
                                        <tr>
                                          <th>Vigência</th>
                                          <th>Status</th>
                                          <th>Internação</th>
                                          <th>Dose</th>
                                          <th>Via</th>
                                          <th>Frequência</th>
                                          <th>Obs.</th>
                                          <th>Intervenção</th>
                                          <th>Registro</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedPrescriptionMedicationHistoryRows.map((prescription) => (
                                          <tr key={`history-${prescription.id}`}>
                                            <td>
                                              {prescription.validationStartAt
                                                ? formatPrescriptionValidityDate(prescription.validationStartAt)
                                                : prescription.validationEndAt
                                                  ? formatPrescriptionValidityDate(prescription.validationEndAt)
                                                  : "-"}
                                            </td>
                                            <td>{prescription.validationStatus ?? "-"}</td>
                                            <td>
                                              {prescription.admissionDate
                                                ? `${formatAdmissionDate(prescription.admissionDate)} | Leito ${
                                                    prescription.bed ?? "-"
                                                  }`
                                                : "Sem vínculo"}
                                            </td>
                                            <td>
                                              {formatNumber(prescription.dose)} {prescription.doseUnit}
                                            </td>
                                            <td>{prescription.administrationRoute ?? "-"}</td>
                                            <td>{prescription.frequency}</td>
                                            <td>{prescription.notes ?? "-"}</td>
                                            <td>
                                              {hasPrescriptionIntervention(prescription) ? (
                                                <span className="dashboard-table-summary">
                                                  {formatPrescriptionInterventionSummary(prescription)}
                                                </span>
                                              ) : (
                                                "-"
                                              )}
                                            </td>
                                            <td>{formatTimestamp(prescription.createdAt)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            <div className="dashboard-flag-legend">
                              <span className="dashboard-flag-legend-label">Legenda:</span>
                              <div className="dashboard-flag-list">
                                <span
                                  className="dashboard-status-pill is-allergy"
                                  title="Alergia medicamentosa"
                                  aria-hidden="true"
                                >
                                  (A)
                                </span>
                                <span className="dashboard-flag-legend-text">Alergia</span>
                                <span
                                  className="dashboard-status-pill is-renal"
                                  title="Ajuste para função renal"
                                  aria-hidden="true"
                                >
                                  (FR)
                                </span>
                                <span className="dashboard-flag-legend-text">Função renal</span>
                                <span
                                  className="dashboard-status-pill is-hepatic"
                                  title="Medicamento hepatotóxico"
                                  aria-hidden="true"
                                >
                                  (HT)
                                </span>
                                <span className="dashboard-flag-legend-text">Hepatotóxico</span>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {patientView === "round-summary" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Resumo do round</h3>
                            <p className="dashboard-muted">
                              Anotação interna do round farmacêutico. Este texto não entra na evolução.
                            </p>

                            <form className="dashboard-form" onSubmit={handleRoundSummarySubmit}>
                              <input
                                value={`${selectedPatient.fullName} (${selectedPatient.chartNumber})`}
                                disabled
                                aria-label="Paciente selecionado"
                              />

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Data do round (DD/MM/AAAA)"
                                value={admissionForm.roundSummaryDate}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({
                                    ...current,
                                    roundSummaryDate: formatEditableDateInput(event.target.value)
                                  }))
                                }
                              />

                              <textarea
                                placeholder="Anotações internas do round"
                                value={admissionForm.roundSummary}
                                onChange={(event) =>
                                  setAdmissionForm((current) => ({
                                    ...current,
                                    roundSummary: event.target.value
                                  }))
                                }
                                rows={12}
                              />

                              {!admissionForm.admissionId.trim() ? (
                                <p className="dashboard-muted">
                                  Salve primeiro as informações da internação para persistir o resumo do round.
                                </p>
                              ) : null}

                              {roundSummaryFeedback ? (
                                <p
                                  className={`dashboard-feedback dashboard-feedback-${roundSummaryFeedback.type}`}
                                >
                                  {roundSummaryFeedback.message}
                                </p>
                              ) : null}

                              <div className="dashboard-inline-actions">
                                <button
                                  type="submit"
                                  disabled={roundSummaryLoading || !admissionForm.admissionId.trim()}
                                >
                                  {roundSummaryLoading ? "Salvando..." : "Salvar resumo do round"}
                                </button>
                              </div>
                            </form>

                            <div className="dashboard-list-box">
                              <h3>Histórico do round</h3>
                              {!admissionForm.admissionId.trim() ? (
                                <p className="dashboard-muted">
                                  O histórico aparece depois que a internação estiver salva.
                                </p>
                              ) : selectedCurrentAdmissionRoundNotes.length === 0 ? (
                                <p className="dashboard-muted">
                                  Nenhum comentário do round salvo para esta internação.
                                </p>
                              ) : (
                                selectedCurrentAdmissionRoundNotes.map((roundNote) => (
                                  <div
                                    key={`${roundNote.admissionId}-${roundNote.id}`}
                                    className="dashboard-subsection-block"
                                  >
                                    <p className="dashboard-muted">
                                      {formatAdmissionDate(roundNote.roundDate)}
                                      {" "}
                                      | {roundNote.responsibleProfessionalName}
                                      {" "}
                                      | {formatTimestamp(roundNote.createdAt)}
                                    </p>
                                    <p style={{ whiteSpace: "pre-wrap" }}>{roundNote.note}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ) : null}

                        {patientView === "evolution" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Evolução atualizada</h3>
                            <p className="dashboard-muted">
                              O texto considera os dados já preenchidos da internação, exames importados,
                              reconciliação e intervenções da prescrição.
                            </p>

                            {evolutionFeedback ? (
                              <p className={`dashboard-feedback dashboard-feedback-${evolutionFeedback.type}`}>
                                {evolutionFeedback.message}
                              </p>
                            ) : null}

                            <div className="dashboard-inline-actions">
                              <button
                                type="button"
                                className="dashboard-mini-button"
                                onClick={() => void handleCopyEvolution()}
                              >
                                Copiar evolução
                              </button>
                            </div>

                            <div className="dashboard-calculation-box">
                              <h3>Prévia da evolução</h3>
                              <p className="dashboard-muted">
                                Só entram no texto os blocos que já tiverem informação preenchida.
                              </p>
                              <label className="dashboard-inline-toggle">
                                <input
                                  type="checkbox"
                                  checked={interviewEvolutionIncludeTitles}
                                  onChange={(event) =>
                                    setInterviewEvolutionIncludeTitles(event.target.checked)
                                  }
                                />
                                Mostrar títulos automáticos
                              </label>
                              <textarea
                                className="dashboard-evolution-preview"
                                value={visibleInterviewEvolutionText}
                                readOnly
                                rows={22}
                              />
                            </div>
                          </div>
                        ) : null}
                        </section>
                      ) : null}
                    </>
                  ) : null}
                </section>
              ) : null}

              {activeSection === "interventions" ? (
                <section className="dashboard-card">
                  <h2>Intervenções</h2>
                  <p className="dashboard-muted">
                    Escolha o período para listar as intervenções farmacêuticas registradas e exportar
                    a planilha para Excel.
                  </p>

                  <form className="dashboard-form" onSubmit={handleApplyInterventionReportRange}>
                    <div className="dashboard-two-columns">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Data inicial (DD/MM/AAAA)"
                        value={interventionReportForm.startDate}
                        onChange={(event) =>
                          setInterventionReportForm((current) => ({
                            ...current,
                            startDate: formatEditableDateInput(event.target.value)
                          }))
                        }
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Data final (DD/MM/AAAA)"
                        value={interventionReportForm.endDate}
                        onChange={(event) =>
                          setInterventionReportForm((current) => ({
                            ...current,
                            endDate: formatEditableDateInput(event.target.value)
                          }))
                        }
                      />
                    </div>

                    {interventionReportFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${interventionReportFeedback.type}`}>
                        {interventionReportFeedback.message}
                      </p>
                    ) : null}

                    <div className="dashboard-inline-actions">
                      <button type="submit" disabled={interventionReportLoading}>
                        {interventionReportLoading ? "Atualizando..." : "Puxar intervenções"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-mini-button"
                        onClick={handleExportInterventionReport}
                        disabled={interventionReportLoading}
                      >
                        Exportar Excel
                      </button>
                    </div>
                  </form>

                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>N° Prontuário</th>
                          <th>Leito</th>
                          <th>Unidade</th>
                          <th>Medicamento</th>
                          <th>Tipo de erro</th>
                          <th>Contato</th>
                          <th>Intervenção</th>
                          <th>Realizada por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interventionReportLoading ? (
                          <tr>
                            <td colSpan={9}>Carregando intervenções...</td>
                          </tr>
                        ) : interventionReportRows.length === 0 ? (
                          <tr>
                            <td colSpan={9}>Nenhuma intervenção encontrada no período selecionado.</td>
                          </tr>
                        ) : (
                          interventionReportRows.map((prescription) => (
                            <tr key={`intervention-${prescription.id}`}>
                              <td>
                                {formatTimestamp(
                                  prescription.interventionRecordedAt ?? prescription.createdAt
                                )}
                              </td>
                              <td>{prescription.chartNumber}</td>
                              <td>{prescription.bed ?? "-"}</td>
                              <td>{formatInterventionUnitLabel(prescription.teamName)}</td>
                              <td>
                                {getPrescriptionMedicationDisplayName(
                                  prescription.medicationName,
                                  prescription.externalValidationCandidate
                                )}
                              </td>
                              <td>{prescription.interventionErrorType ?? "-"}</td>
                              <td>
                                {prescription.interventionContactStatus ??
                                  (prescription.interventionRequestedToPrescriber === true
                                    ? "Realizado"
                                    : prescription.interventionRequestedToPrescriber === false
                                      ? "Não realizado"
                                      : "-")}
                              </td>
                              <td>{prescription.interventionResponse ?? "-"}</td>
                              <td>{prescription.interventionProfessionalName ?? "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeSection === "validated-medications" ? (
                <section className="dashboard-card">
                  <h2>Medicamentos validados</h2>
                  <p className="dashboard-muted">
                    Escolha o período para listar os medicamentos validados e exportar a planilha para
                    Excel.
                  </p>

                  <form className="dashboard-form" onSubmit={handleApplyValidatedMedicationReportRange}>
                    <div className="dashboard-two-columns">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Data inicial (DD/MM/AAAA)"
                        value={validatedMedicationReportForm.startDate}
                        onChange={(event) =>
                          setValidatedMedicationReportForm((current) => ({
                            ...current,
                            startDate: formatEditableDateInput(event.target.value)
                          }))
                        }
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Data final (DD/MM/AAAA)"
                        value={validatedMedicationReportForm.endDate}
                        onChange={(event) =>
                          setValidatedMedicationReportForm((current) => ({
                            ...current,
                            endDate: formatEditableDateInput(event.target.value)
                          }))
                        }
                      />
                    </div>

                    {validatedMedicationReportFeedback ? (
                      <p
                        className={`dashboard-feedback dashboard-feedback-${validatedMedicationReportFeedback.type}`}
                      >
                        {validatedMedicationReportFeedback.message}
                      </p>
                    ) : null}

                    <div className="dashboard-inline-actions">
                      <button type="submit" disabled={interventionReportLoading}>
                        {interventionReportLoading ? "Atualizando..." : "Puxar medicamentos validados"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-mini-button"
                        onClick={handleExportValidatedMedicationReport}
                        disabled={interventionReportLoading}
                      >
                        Exportar Excel
                      </button>
                    </div>
                  </form>

                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Leito</th>
                          <th>Prontuário</th>
                          <th>Paciente</th>
                          <th>Medicamento</th>
                          <th>Posologia</th>
                          <th>Qtd</th>
                          <th>Lab</th>
                          <th>Lote</th>
                          <th>Val</th>
                          <th>Validado por</th>
                          <th>Data validação</th>
                          <th>Revalidar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interventionReportLoading ? (
                          <tr>
                            <td colSpan={12}>Carregando medicamentos validados...</td>
                          </tr>
                        ) : validatedMedicationReportRows.length === 0 ? (
                          <tr>
                            <td colSpan={12}>
                              Nenhum medicamento validado encontrado no período selecionado.
                            </td>
                          </tr>
                        ) : (
                          validatedMedicationReportRows.map((row) => (
                            <tr key={`validated-medication-${row.prescription.id}`}>
                              <td>{row.prescription.bed ?? "-"}</td>
                              <td>{row.prescription.chartNumber}</td>
                              <td>{row.prescription.patientName}</td>
                              <td>{row.displayMedicationName}</td>
                              <td>{row.posology || "-"}</td>
                              <td>
                                {row.prescription.quantityTablets === null
                                  ? row.prescription.patientDidNotBring
                                    ? "Não trouxe"
                                    : "-"
                                  : row.prescription.quantityTablets}
                              </td>
                              <td>{row.prescription.manufacturer ?? "-"}</td>
                              <td>{row.prescription.lotNumber ?? "-"}</td>
                              <td>{formatMedicationValidationExpiry(row.prescription.expirationDate)}</td>
                              <td>{row.prescription.stockValidationProfessionalName ?? "-"}</td>
                              <td>{formatAdmissionDateValue(row.validationRecordedAt)}</td>
                              <td>
                                {row.revalidationDate
                                  ? formatAdmissionDateValue(row.revalidationDate)
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeSection === "medication" ? (
                <section className="dashboard-card">
                  <h2>Cadastro de Medicamentos</h2>
                  <p className="dashboard-muted">
                    Base estruturada para alergias e reconciliação: marca/medicamento, princípio ativo,
                    classe terapêutica e sinônimos.
                  </p>
                  <form className="dashboard-form" onSubmit={handleMedicationSubmit}>
                    <input
                      placeholder="Medicamento ou marca"
                      value={medicationForm.name}
                      onChange={(event) =>
                        setMedicationForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />

                    <div className="dashboard-two-columns">
                      <input
                        placeholder="Princípio(s) ativo(s) (ex.: Dipirona + Cafeína)"
                        value={medicationForm.activeIngredients}
                        onChange={(event) =>
                          setMedicationForm((current) => ({
                            ...current,
                            activeIngredients: event.target.value
                          }))
                        }
                      />
                      <input
                        placeholder="Classe terapêutica"
                        value={medicationForm.therapeuticClass}
                        onChange={(event) =>
                          setMedicationForm((current) => ({
                            ...current,
                            therapeuticClass: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="dashboard-two-columns">
                      <input
                        placeholder="Sinônimos/termos relacionados (opcional)"
                        value={medicationForm.searchAliases}
                        onChange={(event) =>
                          setMedicationForm((current) => ({
                            ...current,
                            searchAliases: event.target.value
                          }))
                        }
                      />
                      <input
                        placeholder="Unidade padrão (ex.: mg, mL, UI)"
                        value={medicationForm.defaultUnit}
                        onChange={(event) =>
                          setMedicationForm((current) => ({ ...current, defaultUnit: event.target.value }))
                        }
                        required
                      />
                    </div>

                    {medicationFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${medicationFeedback.type}`}>
                        {medicationFeedback.message}
                      </p>
                    ) : null}

                    <button type="submit" disabled={medicationLoading}>
                      {medicationLoading ? "Salvando..." : "Salvar medicamento"}
                    </button>
                  </form>

                  <div className="dashboard-subsection-block">
                    <h3>Importação em lote (planilha)</h3>
                    <p className="dashboard-muted">
                      Cole colunas da planilha no formato:
                      `Medicamento/Marca[TAB]Princípio ativo[TAB]Classe terapêutica`.
                    </p>
                    <div className="dashboard-form">
                      <div className="dashboard-two-columns">
                        <input
                          placeholder="Unidade padrão para importação"
                          value={medicationBulkDefaultUnit}
                          onChange={(event) => setMedicationBulkDefaultUnit(event.target.value)}
                        />
                        <input
                          value="Coluna opcional 4: sinônimos/aliases"
                          disabled
                          aria-label="Formato opcional de aliases"
                        />
                      </div>
                      <textarea
                        placeholder="Cole aqui as linhas da planilha"
                        value={medicationBulkInput}
                        onChange={(event) => setMedicationBulkInput(event.target.value)}
                      />
                      <button type="button" onClick={handleMedicationBulkImport} disabled={medicationBulkLoading}>
                        {medicationBulkLoading ? "Importando..." : "Importar medicamentos em lote"}
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-list-box">
                    <button
                      type="button"
                      className="dashboard-list-toggle"
                      onClick={() => toggleList("medication")}
                    >
                      {listVisibility.medication
                        ? "Ocultar medicamentos cadastrados"
                        : "Ver medicamentos cadastrados"}
                    </button>
                    {listVisibility.medication ? (
                      medications.length === 0 ? (
                        <p className="dashboard-muted">Nenhum medicamento cadastrado.</p>
                      ) : (
                        <div className="dashboard-table-wrap">
                          <table className="dashboard-table">
                            <thead>
                              <tr>
                                <th>Medicamento</th>
                                <th>Princípio ativo</th>
                                <th>Classe</th>
                                <th>Sinônimos</th>
                                <th>Unidade padrão</th>
                                <th>Registro</th>
                              </tr>
                            </thead>
                            <tbody>
                              {medications.map((medication) => (
                                <tr key={medication.id}>
                                  <td>{medication.name}</td>
                                  <td>{medication.activeIngredients ?? "-"}</td>
                                  <td>{medication.therapeuticClass ?? "-"}</td>
                                  <td>{medication.searchAliases ?? "-"}</td>
                                  <td>{medication.defaultUnit}</td>
                                  <td>{formatTimestamp(medication.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
