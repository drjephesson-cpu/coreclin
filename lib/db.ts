import { Pool, PoolClient } from "pg";

import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS,
  PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS,
  PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS,
  COUNCIL_OPTIONS,
  INTERVIEW_INFORMATION_QUALITY_OPTIONS,
  INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS,
  LAMG_PROPHYLAXIS_AGENT_OPTIONS,
  PATIENT_SEX_OPTIONS,
  PROFESSION_OPTIONS,
  type AdmissionRecord,
  type BmiFormulaId,
  type BsaFormulaId,
  type CouncilOption,
  type AuditLogRecord,
  type DashboardData,
  type InpatientEntry,
  type InpatientWorkflowState,
  type InpatientWorkflowStoragePayload,
  type InterviewInformationQuality,
  type InterviewInformationSourceType,
  type LamgProphylaxisAgent,
  type AdmissionRoundNoteRecord,
  type PatientExamImportRecord,
  type PatientExamResultRecord,
  type MedicalPrescriptionRecord,
  type MedicalPrescriptionInterventionResponse,
  type MedicationRecord,
  type MeasurementHistoryRecord,
  type PatientRecord,
  type PatientAllergyRecord,
  type PrescriptionInterventionContactStatus,
  type PrescriptionInterventionErrorType,
  type PatientSex,
  type PriorMedicationRecord,
  type ProfessionOption,
  type ProfessionalRecord,
  type TeamRecord
} from "@/lib/coreclin-types";
import { hashPassword, verifyPassword } from "@/lib/password";

export { COUNCIL_OPTIONS, PROFESSION_OPTIONS };

export type CreateProfessionalInput = {
  fullName: string;
  profession: ProfessionOption;
  councilType?: CouncilOption | null;
  councilNumber?: string | null;
  stateUf?: string | null;
  login: string;
  password: string;
  institution: string;
  isTrainee?: boolean;
  supervisingPharmacistId?: number | null;
};

export type UpdateProfessionalInput = {
  professionalId: number;
  fullName: string;
  profession: ProfessionOption;
  councilType?: CouncilOption | null;
  councilNumber?: string | null;
  stateUf?: string | null;
  login: string;
  password?: string | null;
  institution: string;
  isTrainee?: boolean;
  supervisingPharmacistId?: number | null;
};

export type CreatePatientInput = {
  fullName: string;
  chartNumber: string;
  birthDate?: string | null;
  sex?: PatientSex | null;
  responsibleLogin: string;
  allergies: string[];
};

export type CreateAdmissionInput = {
  patientId: number;
  admissionDate: string;
  bed: string;
  admissionReason?: string | null;
  deniesContinuousMedicationUse?: boolean;
  admissionSummary?: string | null;
  roundSummary?: string | null;
  roundSummaryDate?: string | null;
  admissionImportExcerpt?: string | null;
  interviewInformationQuality?: InterviewInformationQuality | null;
  interviewInformationSourceType?: InterviewInformationSourceType | null;
  interviewInformationSourceName?: string | null;
  interviewInformationSourceRelationship?: string | null;
  interviewAmbulates?: boolean | null;
  interviewIsIntubated?: boolean | null;
  paduaActiveCancer?: boolean | null;
  paduaPreviousVte?: boolean | null;
  paduaKnownThrombophilia?: boolean | null;
  paduaRecentTraumaOrSurgery?: boolean | null;
  paduaHeartOrRespiratoryFailure?: boolean | null;
  paduaAcuteMiOrIschemicStroke?: boolean | null;
  paduaAcuteInfectionOrRheumatologicDisorder?: boolean | null;
  paduaHormonalTreatment?: boolean | null;
  paduaContraindicationToPharmacologicProphylaxis?: boolean | null;
  paduaNotes?: string | null;
  lamgCriticallyIll?: boolean | null;
  lamgShock?: boolean | null;
  lamgCoagulopathy?: boolean | null;
  lamgChronicLiverDisease?: boolean | null;
  lamgNeurocritical?: boolean | null;
  lamgEnteralNutrition?: boolean | null;
  lamgAgent?: LamgProphylaxisAgent | null;
  lamgNotes?: string | null;
  interviewInterventionMotive?: string | null;
  interviewSubjective?: string | null;
  interviewRelevantSymptoms?: string | null;
  interviewPendingIssues?: string | null;
  interviewPlan?: string | null;
  teamId?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmiFormula?: BmiFormulaId;
  bsaFormula?: BsaFormulaId;
  responsibleLogin: string;
};

export type UpdateAdmissionInput = {
  admissionId: number;
  admissionDate: string;
  bed: string;
  admissionReason?: string | null;
  deniesContinuousMedicationUse?: boolean;
  admissionSummary?: string | null;
  roundSummary?: string | null;
  roundSummaryDate?: string | null;
  admissionImportExcerpt?: string | null;
  interviewInformationQuality?: InterviewInformationQuality | null;
  interviewInformationSourceType?: InterviewInformationSourceType | null;
  interviewInformationSourceName?: string | null;
  interviewInformationSourceRelationship?: string | null;
  interviewAmbulates?: boolean | null;
  interviewIsIntubated?: boolean | null;
  paduaActiveCancer?: boolean | null;
  paduaPreviousVte?: boolean | null;
  paduaKnownThrombophilia?: boolean | null;
  paduaRecentTraumaOrSurgery?: boolean | null;
  paduaHeartOrRespiratoryFailure?: boolean | null;
  paduaAcuteMiOrIschemicStroke?: boolean | null;
  paduaAcuteInfectionOrRheumatologicDisorder?: boolean | null;
  paduaHormonalTreatment?: boolean | null;
  paduaContraindicationToPharmacologicProphylaxis?: boolean | null;
  paduaNotes?: string | null;
  lamgCriticallyIll?: boolean | null;
  lamgShock?: boolean | null;
  lamgCoagulopathy?: boolean | null;
  lamgChronicLiverDisease?: boolean | null;
  lamgNeurocritical?: boolean | null;
  lamgEnteralNutrition?: boolean | null;
  lamgAgent?: LamgProphylaxisAgent | null;
  lamgNotes?: string | null;
  interviewInterventionMotive?: string | null;
  interviewSubjective?: string | null;
  interviewRelevantSymptoms?: string | null;
  interviewPendingIssues?: string | null;
  interviewPlan?: string | null;
  teamId?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bmiFormula?: BmiFormulaId;
  bsaFormula?: BsaFormulaId;
  responsibleLogin: string;
};

export type CreateMedicationInput = {
  name: string;
  defaultUnit: string;
  activeIngredients: string;
  therapeuticClass: string;
  searchAliases: string;
};

export type AddPatientAllergyInput = {
  patientId: number;
  allergyName: string;
  reactionDescription?: string | null;
};

export type UpdatePatientAllergyInput = {
  patientId: number;
  allergyId: number;
  allergyName?: string | null;
  reactionDescription?: string | null;
};

export type SavePatientAllergyResult = {
  allergy: PatientAllergyRecord;
  learnedMedication: MedicationRecord | null;
};

export type RemovePatientAllergyInput = {
  patientId: number;
  allergyId: number;
};

export type CreateAdmissionRoundNoteInput = {
  admissionId: number;
  roundDate: string;
  note: string;
  responsibleLogin: string;
};

export type RemovePriorMedicationInput = {
  patientId: number;
  priorMedicationId: number;
};

export type RemovePatientExamImportInput = {
  patientId: number;
  examImportId: number;
};

export type RemovePatientExamRecordInput = {
  patientId: number;
  examImportId: number;
  recordKey: string;
};

export type AddPriorMedicationInput = {
  patientId: number;
  medicationId?: number;
  medicationName: string;
  preserveTypedName?: boolean;
  dose: number | null;
  doseUnit: string;
  frequency: string;
  shifts: string;
  quantityTablets?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  manufacturer?: string | null;
};

export type UpdatePriorMedicationInput = {
  patientId: number;
  priorMedicationId: number;
  medicationId?: number;
  medicationName?: string;
  preserveTypedName?: boolean;
  dose: number | null;
  doseUnit: string;
  frequency: string;
  shifts: string;
  reconciliationManualStatus?: boolean | null;
  reconciliationIntentionalStatus?: "sim" | "nao" | "nao-se-aplica" | null;
  reconciliationPrescriptionId?: number | null;
};

export type UpdatePriorMedicationResult = {
  priorMedication: PriorMedicationRecord;
  learnedMedication: MedicationRecord | null;
};

export type AddMedicalPrescriptionInput = {
  patientId: number;
  admissionId?: number;
  medicationId?: number;
  medicationName: string;
  dose: number;
  doseUnit: string;
  administrationRoute?: string;
  frequency: string;
  shifts?: string;
  notes?: string;
  validationStartAt?: string;
  validationEndAt?: string;
  validationStatus?: string;
  externalValidationCandidate?: boolean;
};

export type RemoveMedicalPrescriptionSetInput = {
  patientId: number;
  prescriptionIds: number[];
};

export type AddPatientExamImportInput = {
  patientId: number;
  fileName: string;
  pageCount: number;
  rawText: string;
  records: PatientExamResultRecord[];
  importedByLogin: string;
};

export type SaveInpatientWorkflowSnapshotInput = {
  login: string;
  workflowByKey: Record<string, InpatientWorkflowState>;
  trackedEntries: InpatientEntry[];
  priorityTeamIds: number[];
};

export type RecordAuditLogInput = {
  actorLogin: string;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  patientId?: number | null;
  patientNameSnapshot?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateMedicalPrescriptionValidationInput = {
  patientId: number;
  prescriptionId: number;
  quantityTablets?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  manufacturer?: string | null;
  patientDidNotBring?: boolean | null;
  stockValidationNote?: string | null;
  interventionNotes?: string | null;
  interventionErrorType?: PrescriptionInterventionErrorType | null;
  interventionContactStatus?: PrescriptionInterventionContactStatus | null;
  interventionRequestedToPrescriber?: boolean | null;
  interventionResponse?: MedicalPrescriptionInterventionResponse | null;
  responsibleLogin?: string | null;
};

type GlobalDbState = typeof globalThis & {
  coreclinPool?: Pool;
  coreclinSetupPromise?: Promise<void>;
};

const globalDbState = globalThis as GlobalDbState;

type DbRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return "";
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === "object") {
    return value as T;
  }

  return fallback;
}

function normalizePatientSex(value: unknown): PatientSex | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return PATIENT_SEX_OPTIONS.includes(normalized as PatientSex) ? (normalized as PatientSex) : null;
}

function normalizeMedicationCatalogName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeClinicalSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function splitClinicalTerms(input: string): Array<{ raw: string; normalized: string }> {
  const cleaned = input.trim();
  if (!cleaned) {
    return [];
  }

  const fragments = cleaned
    .replace(/\s+[eE]\s+/g, " + ")
    .split(/[+;,|/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const terms = new Map<string, string>();
  for (const fragment of fragments) {
    const normalized = normalizeClinicalSearchValue(fragment);
    if (normalized && !terms.has(normalized)) {
      terms.set(normalized, fragment);
    }
  }

  return Array.from(terms.entries()).map(([normalized, raw]) => ({ normalized, raw }));
}

function hasClinicalTermMatch(source: string, target: string): boolean {
  if (!source || !target) {
    return false;
  }

  if (source === target) {
    return true;
  }

  if (source.includes(` ${target} `) || source.startsWith(`${target} `) || source.endsWith(` ${target}`)) {
    return true;
  }

  if (target.length >= 4 && (source.startsWith(target) || target.startsWith(source))) {
    return true;
  }

  return target.length >= 5 && (source.includes(target) || target.includes(source));
}

const PROFESSIONAL_SELECT_FIELDS = `
  p.id,
  p.full_name,
  p.profession,
  p.council_type,
  p.council_number,
  p.state_uf,
  p.login,
  p.institution,
  p.is_trainee,
  p.supervising_pharmacist_id,
  p.created_at,
  supervisor.full_name AS supervising_pharmacist_name,
  supervisor.council_type AS supervising_pharmacist_council_type,
  supervisor.council_number AS supervising_pharmacist_council_number,
  supervisor.state_uf AS supervising_pharmacist_state_uf
`;

function mapProfessional(row: DbRow): ProfessionalRecord {
  return {
    id: toNumber(row.id),
    fullName: String(row.full_name ?? ""),
    profession: String(row.profession ?? "Farmacêutico") as ProfessionOption,
    councilType: row.council_type === null ? null : (String(row.council_type ?? "CRF") as CouncilOption),
    councilNumber: row.council_number === null ? null : String(row.council_number ?? ""),
    stateUf: row.state_uf === null ? null : String(row.state_uf ?? ""),
    login: String(row.login ?? ""),
    institution: String(row.institution ?? ""),
    isTrainee: Boolean(row.is_trainee),
    supervisingPharmacistId:
      row.supervising_pharmacist_id === null ? null : toNumber(row.supervising_pharmacist_id),
    supervisingPharmacistName:
      row.supervising_pharmacist_name === null
        ? null
        : String(row.supervising_pharmacist_name ?? ""),
    supervisingPharmacistCouncilType:
      row.supervising_pharmacist_council_type === null
        ? null
        : (String(row.supervising_pharmacist_council_type ?? "CRF") as CouncilOption),
    supervisingPharmacistCouncilNumber:
      row.supervising_pharmacist_council_number === null
        ? null
        : String(row.supervising_pharmacist_council_number ?? ""),
    supervisingPharmacistStateUf:
      row.supervising_pharmacist_state_uf === null
        ? null
        : String(row.supervising_pharmacist_state_uf ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapTeam(row: DbRow): TeamRecord {
  return {
    id: toNumber(row.id),
    name: String(row.name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapAuditLog(row: DbRow): AuditLogRecord {
  return {
    id: toNumber(row.id),
    actorLogin: String(row.actor_login ?? ""),
    action: String(row.action ?? ""),
    resourceType: String(row.resource_type ?? ""),
    resourceId: row.resource_id === null ? null : String(row.resource_id ?? ""),
    patientId: row.patient_id === null ? null : toNumber(row.patient_id),
    patientNameSnapshot:
      row.patient_name_snapshot === null ? null : String(row.patient_name_snapshot ?? ""),
    metadata: parseJsonValue<Record<string, unknown>>(row.metadata, {}),
    createdAt: toIso(row.created_at)
  };
}

function normalizeLamgProphylaxisAgent(value: unknown): LamgProphylaxisAgent | null {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value).trim().toLowerCase();

  return LAMG_PROPHYLAXIS_AGENT_OPTIONS.includes(normalizedValue as LamgProphylaxisAgent)
    ? (normalizedValue as LamgProphylaxisAgent)
    : null;
}

function mapAdmission(row: DbRow): AdmissionRecord {
  const interviewInformationQualityRaw =
    row.interview_information_quality === null
      ? null
      : String(row.interview_information_quality ?? "").trim().toLowerCase();
  const interviewInformationSourceTypeRaw =
    row.interview_information_source_type === null
      ? null
      : String(row.interview_information_source_type ?? "").trim().toLowerCase();

  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    admissionDate: String(row.admission_date ?? ""),
    bed: String(row.bed ?? ""),
    admissionReason: String(row.admission_reason ?? ""),
    deniesContinuousMedicationUse: Boolean(row.denies_continuous_medication_use),
    admissionSummary: row.admission_summary === null ? null : String(row.admission_summary ?? ""),
    roundSummary: row.round_summary === null ? null : String(row.round_summary ?? ""),
    roundSummaryDate: row.round_summary_date === null ? null : String(row.round_summary_date),
    admissionImportExcerpt:
      row.admission_import_excerpt === null ? null : String(row.admission_import_excerpt ?? ""),
    interviewInformationQuality: INTERVIEW_INFORMATION_QUALITY_OPTIONS.includes(
      interviewInformationQualityRaw as InterviewInformationQuality
    )
      ? (interviewInformationQualityRaw as InterviewInformationQuality)
      : null,
    interviewInformationSourceType: INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS.includes(
      interviewInformationSourceTypeRaw as InterviewInformationSourceType
    )
      ? (interviewInformationSourceTypeRaw as InterviewInformationSourceType)
      : null,
    interviewInformationSourceName:
      row.interview_information_source_name === null
        ? null
        : String(row.interview_information_source_name ?? ""),
    interviewInformationSourceRelationship:
      row.interview_information_source_relationship === null
        ? null
        : String(row.interview_information_source_relationship ?? ""),
    interviewAmbulates:
      row.interview_ambulates === null ? null : Boolean(row.interview_ambulates),
    interviewIsIntubated:
      row.interview_is_intubated === null ? null : Boolean(row.interview_is_intubated),
    paduaActiveCancer:
      row.padua_active_cancer === null ? null : Boolean(row.padua_active_cancer),
    paduaPreviousVte:
      row.padua_previous_vte === null ? null : Boolean(row.padua_previous_vte),
    paduaKnownThrombophilia:
      row.padua_known_thrombophilia === null ? null : Boolean(row.padua_known_thrombophilia),
    paduaRecentTraumaOrSurgery:
      row.padua_recent_trauma_or_surgery === null
        ? null
        : Boolean(row.padua_recent_trauma_or_surgery),
    paduaHeartOrRespiratoryFailure:
      row.padua_heart_or_respiratory_failure === null
        ? null
        : Boolean(row.padua_heart_or_respiratory_failure),
    paduaAcuteMiOrIschemicStroke:
      row.padua_acute_mi_or_ischemic_stroke === null
        ? null
        : Boolean(row.padua_acute_mi_or_ischemic_stroke),
    paduaAcuteInfectionOrRheumatologicDisorder:
      row.padua_acute_infection_or_rheumatologic_disorder === null
        ? null
        : Boolean(row.padua_acute_infection_or_rheumatologic_disorder),
    paduaHormonalTreatment:
      row.padua_hormonal_treatment === null ? null : Boolean(row.padua_hormonal_treatment),
    paduaContraindicationToPharmacologicProphylaxis:
      row.padua_contraindication_to_pharmacologic_prophylaxis === null
        ? null
        : Boolean(row.padua_contraindication_to_pharmacologic_prophylaxis),
    paduaNotes: row.padua_notes === null ? null : String(row.padua_notes ?? ""),
    lamgCriticallyIll:
      row.lamg_critically_ill === null ? null : Boolean(row.lamg_critically_ill),
    lamgShock: row.lamg_shock === null ? null : Boolean(row.lamg_shock),
    lamgCoagulopathy:
      row.lamg_coagulopathy === null ? null : Boolean(row.lamg_coagulopathy),
    lamgChronicLiverDisease:
      row.lamg_chronic_liver_disease === null ? null : Boolean(row.lamg_chronic_liver_disease),
    lamgNeurocritical:
      row.lamg_neurocritical === null ? null : Boolean(row.lamg_neurocritical),
    lamgEnteralNutrition:
      row.lamg_enteral_nutrition === null ? null : Boolean(row.lamg_enteral_nutrition),
    lamgAgent: normalizeLamgProphylaxisAgent(row.lamg_agent),
    lamgNotes: row.lamg_notes === null ? null : String(row.lamg_notes ?? ""),
    interviewInterventionMotive:
      row.interview_intervention_motive === null
        ? null
        : String(row.interview_intervention_motive ?? ""),
    interviewSubjective:
      row.interview_subjective === null ? null : String(row.interview_subjective ?? ""),
    interviewRelevantSymptoms:
      row.interview_relevant_symptoms === null
        ? null
        : String(row.interview_relevant_symptoms ?? ""),
    interviewPendingIssues:
      row.interview_pending_issues === null
        ? null
        : String(row.interview_pending_issues ?? ""),
    interviewPlan: row.interview_plan === null ? null : String(row.interview_plan ?? ""),
    teamId: row.team_id === null ? null : toNumber(row.team_id),
    teamName: row.team_name === null ? null : String(row.team_name),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    weightKg: row.weight_kg === null ? null : toNumber(row.weight_kg),
    heightCm: row.height_cm === null ? null : toNumber(row.height_cm),
    bmi: row.bmi === null ? null : toNumber(row.bmi),
    bmiFormula:
      row.bmi_formula === null ? null : (String(row.bmi_formula) as BmiFormulaId),
    bodySurfaceArea: row.body_surface_area === null ? null : toNumber(row.body_surface_area),
    bsaFormula:
      row.bsa_formula === null ? null : (String(row.bsa_formula) as BsaFormulaId),
    createdAt: toIso(row.created_at)
  };
}

function mapMeasurement(row: DbRow): MeasurementHistoryRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    weightKg: toNumber(row.weight_kg),
    heightCm: toNumber(row.height_cm),
    bmi: toNumber(row.bmi),
    bmiFormula: String(row.bmi_formula ?? "quetelet") as BmiFormulaId,
    bodySurfaceArea: toNumber(row.body_surface_area),
    bsaFormula: String(row.bsa_formula ?? "mosteller") as BsaFormulaId,
    recordedAt: toIso(row.recorded_at)
  };
}

function mapMedication(row: DbRow): MedicationRecord {
  return {
    id: toNumber(row.id),
    name: String(row.name ?? ""),
    defaultUnit: String(row.default_unit ?? ""),
    activeIngredients: row.active_ingredients == null ? null : String(row.active_ingredients),
    therapeuticClass: row.therapeutic_class == null ? null : String(row.therapeutic_class),
    searchAliases: row.search_aliases == null ? null : String(row.search_aliases),
    createdAt: toIso(row.created_at)
  };
}

function mapPatientAllergy(row: DbRow): PatientAllergyRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    allergyName: String(row.allergy_name ?? ""),
    reactionDescription:
      row.reaction_description === null ? null : String(row.reaction_description ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapPriorMedication(row: DbRow): PriorMedicationRecord {
  const reconciliationIntentionalStatusRaw = String(
    row.reconciliation_intentional_status ?? ""
  ).trim();

  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    medicationId: row.medication_id === null ? null : toNumber(row.medication_id),
    medicationName: String(row.medication_name ?? ""),
    dose: toNumber(row.dose),
    doseUnit: String(row.dose_unit ?? ""),
    frequency: String(row.frequency ?? ""),
    shifts: String(row.shifts ?? ""),
    quantityTablets: row.quantity_tablets === null ? null : toNumber(row.quantity_tablets),
    lotNumber: row.lot_number === null ? null : String(row.lot_number ?? ""),
    expirationDate: row.expiration_date === null ? null : String(row.expiration_date),
    manufacturer: row.manufacturer === null ? null : String(row.manufacturer ?? ""),
    reconciliationManualStatus:
      row.reconciliation_manual_status === null
        ? null
        : Boolean(row.reconciliation_manual_status),
    reconciliationIntentionalStatus:
      reconciliationIntentionalStatusRaw === "sim" ||
      reconciliationIntentionalStatusRaw === "nao" ||
      reconciliationIntentionalStatusRaw === "nao-se-aplica"
        ? reconciliationIntentionalStatusRaw
        : null,
    reconciliationPrescriptionId:
      row.reconciliation_prescription_id === null
        ? null
        : toNumber(row.reconciliation_prescription_id),
    reconciliationPrescriptionMedicationName:
      row.reconciliation_prescription_medication_name === null
        ? null
        : String(row.reconciliation_prescription_medication_name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function normalizeExamImportRecords(value: unknown): PatientExamResultRecord[] {
  const parsedValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item, index) => ({
      key:
        typeof item.key === "string" && item.key.trim().length > 0
          ? item.key.trim()
          : `exam-${index + 1}`,
      examName: typeof item.examName === "string" ? item.examName.trim() : "",
      result: typeof item.result === "string" ? item.result.trim() : "",
      unit: typeof item.unit === "string" ? item.unit.trim() : "",
      referenceRange:
        typeof item.referenceRange === "string" ? item.referenceRange.trim() : "",
      examDate:
        typeof item.examDate === "string" && item.examDate.trim().length > 0
          ? item.examDate.trim()
          : null,
      pageNumber:
        typeof item.pageNumber === "number"
          ? item.pageNumber
          : typeof item.pageNumber === "string"
            ? Number(item.pageNumber)
            : 0
    }))
    .filter(
      (item) =>
        item.examName.length > 0 &&
        item.result.length > 0 &&
        Number.isInteger(item.pageNumber) &&
        item.pageNumber > 0
    );
}

function mapPatientExamImport(row: DbRow): PatientExamImportRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    importedByProfessionalId: toNumber(row.imported_by_professional_id),
    importedByProfessionalName: String(row.imported_by_professional_name ?? ""),
    fileName: String(row.file_name ?? ""),
    pageCount: toNumber(row.page_count),
    rawText: String(row.raw_text ?? ""),
    records: normalizeExamImportRecords(row.extracted_records),
    createdAt: toIso(row.created_at)
  };
}

function mapAdmissionRoundNote(row: DbRow): AdmissionRoundNoteRecord {
  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    admissionId: toNumber(row.admission_id),
    roundDate: String(row.round_date ?? ""),
    note: String(row.note ?? ""),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapInpatientWorkflowSnapshot(row: DbRow): InpatientWorkflowStoragePayload {
  const priorityTeamIds = parseJsonValue<unknown[]>(row.priority_team_ids, []).filter(
    (teamId): teamId is number => typeof teamId === "number" && Number.isInteger(teamId)
  );

  return {
    workflowByKey: parseJsonValue<Record<string, InpatientWorkflowState>>(row.workflow_by_key, {}),
    trackedEntries: parseJsonValue<InpatientEntry[]>(row.tracked_entries, []),
    priorityTeamIds
  };
}

function normalizeMedicalPrescriptionInterventionResponse(
  value: unknown
): MedicalPrescriptionInterventionResponse | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "aceito" || normalized === "aceita") {
    return "Aceita";
  }

  if (normalized === "recusado" || normalized === "não aceita" || normalized === "nao aceita") {
    return "Não aceita";
  }

  if (normalized === "não se aplica" || normalized === "nao se aplica") {
    return "Não se aplica";
  }

  if (normalized === "pendente" || normalized === "não informado" || normalized === "nao informado") {
    return "Não informado";
  }

  return MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS.includes(
    String(value).trim() as MedicalPrescriptionInterventionResponse
  )
    ? (String(value).trim() as MedicalPrescriptionInterventionResponse)
    : null;
}

function normalizePrescriptionInterventionContactStatus(
  value: unknown
): PrescriptionInterventionContactStatus | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS.includes(
    normalized as PrescriptionInterventionContactStatus
  )
    ? (normalized as PrescriptionInterventionContactStatus)
    : null;
}

function normalizePrescriptionInterventionErrorType(
  value: unknown
): PrescriptionInterventionErrorType | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS.includes(
    normalized as PrescriptionInterventionErrorType
  )
    ? (normalized as PrescriptionInterventionErrorType)
    : null;
}

function mapMedicalPrescription(row: DbRow): MedicalPrescriptionRecord {
  const interventionResponse = normalizeMedicalPrescriptionInterventionResponse(
    row.intervention_response
  );

  return {
    id: toNumber(row.id),
    patientId: toNumber(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    admissionId: row.admission_id === null ? null : toNumber(row.admission_id),
    admissionDate: row.admission_date === null ? null : String(row.admission_date),
    bed: row.bed === null ? null : String(row.bed),
    teamName: row.team_name === null ? null : String(row.team_name ?? ""),
    medicationId: row.medication_id === null ? null : toNumber(row.medication_id),
    medicationName: String(row.medication_name ?? ""),
    dose: toNumber(row.dose),
    doseUnit: String(row.dose_unit ?? ""),
    administrationRoute:
      row.administration_route === null ? null : String(row.administration_route),
    frequency: String(row.frequency ?? ""),
    shifts: String(row.shifts ?? ""),
    notes: row.notes === null ? null : String(row.notes),
    validationStartAt:
      row.validation_start_at === null ? null : toIso(row.validation_start_at),
    validationEndAt: row.validation_end_at === null ? null : toIso(row.validation_end_at),
    validationStatus: row.validation_status === null ? null : String(row.validation_status),
    externalValidationCandidate: Boolean(row.external_validation_candidate),
    quantityTablets: row.quantity_tablets === null ? null : toNumber(row.quantity_tablets),
    lotNumber: row.lot_number === null ? null : String(row.lot_number ?? ""),
    expirationDate: row.expiration_date === null ? null : String(row.expiration_date),
    manufacturer: row.manufacturer === null ? null : String(row.manufacturer ?? ""),
    patientDidNotBring: Boolean(row.patient_did_not_bring),
    stockValidationNote:
      row.stock_validation_note === null ? null : String(row.stock_validation_note ?? ""),
    stockValidationRecordedAt:
      row.stock_validation_recorded_at === null ? null : toIso(row.stock_validation_recorded_at),
    stockValidationProfessionalId:
      row.stock_validation_professional_id === null
        ? null
        : toNumber(row.stock_validation_professional_id),
    stockValidationProfessionalName:
      row.stock_validation_professional_name === null
        ? null
        : String(row.stock_validation_professional_name ?? ""),
    interventionNotes:
      row.intervention_notes === null ? null : String(row.intervention_notes ?? ""),
    interventionErrorType: normalizePrescriptionInterventionErrorType(row.intervention_error_type),
    interventionContactStatus: normalizePrescriptionInterventionContactStatus(
      row.intervention_contact_status
    ),
    interventionRequestedToPrescriber:
      row.intervention_requested_to_prescriber === null
        ? null
        : Boolean(row.intervention_requested_to_prescriber),
    interventionResponse,
    interventionRecordedAt:
      row.intervention_recorded_at === null ? null : toIso(row.intervention_recorded_at),
    interventionProfessionalId:
      row.intervention_professional_id === null ? null : toNumber(row.intervention_professional_id),
    interventionProfessionalName:
      row.intervention_professional_name === null
        ? null
        : String(row.intervention_professional_name ?? ""),
    createdAt: toIso(row.created_at)
  };
}

function mapInpatientOverviewEntry(row: DbRow): InpatientEntry {
  const patientId = toNumber(row.patient_id);

  return {
    key: `patient-${patientId}`,
    patientId,
    patientName: String(row.patient_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    reportedAgeYears: row.reported_age_years === null ? null : toNumber(row.reported_age_years),
    admissionDate: String(row.admission_date ?? ""),
    bed: String(row.bed ?? ""),
    teamName: row.team_name === null ? null : String(row.team_name),
    teamId: row.team_id === null ? null : toNumber(row.team_id),
    source: "active",
    createdAt: toIso(row.created_at)
  };
}

function mapPatient(row: DbRow): PatientRecord {
  const hasLatestAdmission = row.latest_admission_id !== null;
  const hasLatestMeasurement = row.weight_kg !== null && row.height_cm !== null;
  const latestInterviewInformationQualityRaw =
    row.latest_admission_interview_information_quality === null
      ? null
      : String(row.latest_admission_interview_information_quality ?? "")
          .trim()
          .toLowerCase();
  const latestInterviewInformationSourceTypeRaw =
    row.latest_admission_interview_information_source_type === null
      ? null
      : String(row.latest_admission_interview_information_source_type ?? "")
          .trim()
          .toLowerCase();

  return {
    id: toNumber(row.id),
    fullName: String(row.full_name ?? ""),
    chartNumber: String(row.chart_number ?? ""),
    birthDate: row.birth_date === null ? null : String(row.birth_date),
    ageYears: row.age_years === null ? null : toNumber(row.age_years),
    sex: normalizePatientSex(row.sex),
    responsibleProfessionalId: toNumber(row.responsible_professional_id),
    responsibleProfessionalName: String(row.responsible_professional_name ?? ""),
    responsibleProfessionalLogin: String(row.responsible_professional_login ?? ""),
    latestAdmission: hasLatestAdmission
      ? {
          id: toNumber(row.latest_admission_id),
          patientId: toNumber(row.id),
          patientName: String(row.full_name ?? ""),
          chartNumber: String(row.chart_number ?? ""),
          admissionDate: String(row.latest_admission_date ?? ""),
          bed: String(row.latest_admission_bed ?? ""),
          admissionReason: String(row.latest_admission_reason ?? ""),
          deniesContinuousMedicationUse: Boolean(
            row.latest_admission_denies_continuous_medication_use
          ),
          admissionSummary:
            row.latest_admission_summary === null ? null : String(row.latest_admission_summary ?? ""),
          roundSummary:
            row.latest_admission_round_summary === null
              ? null
              : String(row.latest_admission_round_summary ?? ""),
          roundSummaryDate:
            row.latest_admission_round_summary_date === null
              ? null
              : String(row.latest_admission_round_summary_date),
          admissionImportExcerpt:
            row.latest_admission_import_excerpt === null
              ? null
              : String(row.latest_admission_import_excerpt ?? ""),
          interviewInformationQuality: INTERVIEW_INFORMATION_QUALITY_OPTIONS.includes(
            latestInterviewInformationQualityRaw as InterviewInformationQuality
          )
            ? (latestInterviewInformationQualityRaw as InterviewInformationQuality)
            : null,
          interviewInformationSourceType: INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS.includes(
            latestInterviewInformationSourceTypeRaw as InterviewInformationSourceType
          )
            ? (latestInterviewInformationSourceTypeRaw as InterviewInformationSourceType)
            : null,
          interviewInformationSourceName:
            row.latest_admission_interview_information_source_name === null
              ? null
              : String(row.latest_admission_interview_information_source_name ?? ""),
          interviewInformationSourceRelationship:
            row.latest_admission_interview_information_source_relationship === null
              ? null
              : String(row.latest_admission_interview_information_source_relationship ?? ""),
          interviewAmbulates:
            row.latest_admission_interview_ambulates === null
              ? null
              : Boolean(row.latest_admission_interview_ambulates),
          interviewIsIntubated:
            row.latest_admission_interview_is_intubated === null
              ? null
              : Boolean(row.latest_admission_interview_is_intubated),
          paduaActiveCancer:
            row.latest_admission_padua_active_cancer === null
              ? null
              : Boolean(row.latest_admission_padua_active_cancer),
          paduaPreviousVte:
            row.latest_admission_padua_previous_vte === null
              ? null
              : Boolean(row.latest_admission_padua_previous_vte),
          paduaKnownThrombophilia:
            row.latest_admission_padua_known_thrombophilia === null
              ? null
              : Boolean(row.latest_admission_padua_known_thrombophilia),
          paduaRecentTraumaOrSurgery:
            row.latest_admission_padua_recent_trauma_or_surgery === null
              ? null
              : Boolean(row.latest_admission_padua_recent_trauma_or_surgery),
          paduaHeartOrRespiratoryFailure:
            row.latest_admission_padua_heart_or_respiratory_failure === null
              ? null
              : Boolean(row.latest_admission_padua_heart_or_respiratory_failure),
          paduaAcuteMiOrIschemicStroke:
            row.latest_admission_padua_acute_mi_or_ischemic_stroke === null
              ? null
              : Boolean(row.latest_admission_padua_acute_mi_or_ischemic_stroke),
          paduaAcuteInfectionOrRheumatologicDisorder:
            row.latest_admission_padua_acute_infection_or_rheumatologic_disorder === null
              ? null
              : Boolean(row.latest_admission_padua_acute_infection_or_rheumatologic_disorder),
          paduaHormonalTreatment:
            row.latest_admission_padua_hormonal_treatment === null
              ? null
              : Boolean(row.latest_admission_padua_hormonal_treatment),
          paduaContraindicationToPharmacologicProphylaxis:
            row.latest_admission_padua_contraindication_to_pharmacologic_prophylaxis === null
              ? null
              : Boolean(
                  row.latest_admission_padua_contraindication_to_pharmacologic_prophylaxis
                ),
          paduaNotes:
            row.latest_admission_padua_notes === null
              ? null
              : String(row.latest_admission_padua_notes ?? ""),
          lamgCriticallyIll:
            row.latest_admission_lamg_critically_ill === null
              ? null
              : Boolean(row.latest_admission_lamg_critically_ill),
          lamgShock:
            row.latest_admission_lamg_shock === null
              ? null
              : Boolean(row.latest_admission_lamg_shock),
          lamgCoagulopathy:
            row.latest_admission_lamg_coagulopathy === null
              ? null
              : Boolean(row.latest_admission_lamg_coagulopathy),
          lamgChronicLiverDisease:
            row.latest_admission_lamg_chronic_liver_disease === null
              ? null
              : Boolean(row.latest_admission_lamg_chronic_liver_disease),
          lamgNeurocritical:
            row.latest_admission_lamg_neurocritical === null
              ? null
              : Boolean(row.latest_admission_lamg_neurocritical),
          lamgEnteralNutrition:
            row.latest_admission_lamg_enteral_nutrition === null
              ? null
              : Boolean(row.latest_admission_lamg_enteral_nutrition),
          lamgAgent: normalizeLamgProphylaxisAgent(row.latest_admission_lamg_agent),
          lamgNotes:
            row.latest_admission_lamg_notes === null
              ? null
              : String(row.latest_admission_lamg_notes ?? ""),
          interviewInterventionMotive:
            row.latest_admission_interview_intervention_motive === null
              ? null
              : String(row.latest_admission_interview_intervention_motive ?? ""),
          interviewSubjective:
            row.latest_admission_interview_subjective === null
              ? null
              : String(row.latest_admission_interview_subjective ?? ""),
          interviewRelevantSymptoms:
            row.latest_admission_interview_relevant_symptoms === null
              ? null
              : String(row.latest_admission_interview_relevant_symptoms ?? ""),
          interviewPendingIssues:
            row.latest_admission_interview_pending_issues === null
              ? null
              : String(row.latest_admission_interview_pending_issues ?? ""),
          interviewPlan:
            row.latest_admission_interview_plan === null
              ? null
              : String(row.latest_admission_interview_plan ?? ""),
          teamId: row.latest_admission_team_id === null ? null : toNumber(row.latest_admission_team_id),
          teamName: row.latest_admission_team_name === null ? null : String(row.latest_admission_team_name),
          responsibleProfessionalId: toNumber(row.latest_admission_responsible_professional_id),
          responsibleProfessionalName: String(row.latest_admission_responsible_professional_name ?? ""),
          weightKg: null,
          heightCm: null,
          bmi: null,
          bmiFormula: null,
          bodySurfaceArea: null,
          bsaFormula: null,
          createdAt: toIso(row.latest_admission_created_at)
        }
      : null,
    latestMeasurement: hasLatestMeasurement
      ? {
          weightKg: toNumber(row.weight_kg),
          heightCm: toNumber(row.height_cm),
          bmi: toNumber(row.bmi),
          bmiFormula: String(row.bmi_formula ?? "quetelet") as BmiFormulaId,
          bodySurfaceArea: toNumber(row.body_surface_area),
          bsaFormula: String(row.bsa_formula ?? "mosteller") as BsaFormulaId,
          recordedAt: toIso(row.recorded_at)
        }
      : null
  };
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }

  if (!globalDbState.coreclinPool) {
    globalDbState.coreclinPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return globalDbState.coreclinPool;
}

async function getPatientsColumns(pool: Pool): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patients'
    `
  );

  return new Set(result.rows.map((row) => String((row as DbRow).column_name)));
}

async function makeLegacyPatientColumnsNullable(pool: Pool, columns: Set<string>): Promise<void> {
  const nullableTargets = ["admission_date", "bed", "admission_reason"] as const;

  for (const column of nullableTargets) {
    if (!columns.has(column)) {
      continue;
    }
    await pool.query(`ALTER TABLE patients ALTER COLUMN ${column} DROP NOT NULL`);
  }
}

async function migrateLegacyAdmissions(pool: Pool, columns: Set<string>): Promise<void> {
  const hasAdmissionFields =
    columns.has("admission_date") && columns.has("bed") && columns.has("admission_reason");
  if (!hasAdmissionFields || !columns.has("responsible_professional_id")) {
    return;
  }

  const teamSelect = columns.has("team_id") ? "p.team_id" : "NULL::integer";

  await pool.query(`
    INSERT INTO admissions (
      patient_id,
      admission_date,
      bed,
      admission_reason,
      team_id,
      responsible_professional_id,
      created_at
    )
    SELECT
      p.id,
      p.admission_date,
      p.bed,
      p.admission_reason,
      ${teamSelect},
      p.responsible_professional_id,
      p.created_at
    FROM patients p
    WHERE
      p.admission_date IS NOT NULL
      AND p.bed IS NOT NULL
      AND p.admission_reason IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM admissions a
        WHERE
          a.patient_id = p.id
          AND a.admission_date = p.admission_date
          AND a.bed = p.bed
          AND a.admission_reason = p.admission_reason
      )
  `);
}

async function seedDefaultProfessional(pool: Pool): Promise<void> {
  const seedLogin = (process.env.AUTH_USERNAME ?? "jephesson").trim().toLowerCase() || "jephesson";
  const seedPassword = process.env.AUTH_PASSWORD ?? "ufpb2010";
  const seedPasswordHash = hashPassword(seedPassword);

  await pool.query(
    `
      INSERT INTO professionals (
        full_name,
        profession,
        council_type,
        council_number,
        state_uf,
        login,
        password_hash,
        institution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (login) DO NOTHING
    `,
    [
      "Dr. Jephesson Alex Floriano dos Santos",
      "Farmacêutico",
      "CRF",
      "18913",
      "RS",
      seedLogin,
      seedPasswordHash,
      "HE-UFPel"
    ]
  );
}

async function setupDatabase(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS professionals (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      profession TEXT NOT NULL,
      council_type TEXT,
      council_number TEXT,
      state_uf CHAR(2),
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      institution TEXT NOT NULL,
      is_trainee BOOLEAN NOT NULL DEFAULT FALSE,
      supervising_pharmacist_id INTEGER REFERENCES professionals(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      chart_number TEXT NOT NULL UNIQUE,
      responsible_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      birth_date DATE,
      sex TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admissions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_date DATE NOT NULL,
      bed TEXT NOT NULL,
      admission_reason TEXT NOT NULL,
      denies_continuous_medication_use BOOLEAN NOT NULL DEFAULT FALSE,
      admission_summary TEXT,
      round_summary TEXT,
      round_summary_date DATE,
      admission_import_excerpt TEXT,
      interview_information_quality TEXT,
      interview_information_source_type TEXT,
      interview_information_source_name TEXT,
      interview_information_source_relationship TEXT,
      interview_ambulates BOOLEAN,
      interview_is_intubated BOOLEAN,
      padua_active_cancer BOOLEAN,
      padua_previous_vte BOOLEAN,
      padua_known_thrombophilia BOOLEAN,
      padua_recent_trauma_or_surgery BOOLEAN,
      padua_heart_or_respiratory_failure BOOLEAN,
      padua_acute_mi_or_ischemic_stroke BOOLEAN,
      padua_acute_infection_or_rheumatologic_disorder BOOLEAN,
      padua_hormonal_treatment BOOLEAN,
      padua_contraindication_to_pharmacologic_prophylaxis BOOLEAN,
      padua_notes TEXT,
      lamg_critically_ill BOOLEAN,
      lamg_shock BOOLEAN,
      lamg_coagulopathy BOOLEAN,
      lamg_chronic_liver_disease BOOLEAN,
      lamg_neurocritical BOOLEAN,
      lamg_enteral_nutrition BOOLEAN,
      lamg_agent TEXT,
      lamg_notes TEXT,
      interview_intervention_motive TEXT,
      interview_subjective TEXT,
      interview_relevant_symptoms TEXT,
      interview_pending_issues TEXT,
      interview_plan TEXT,
      team_id INTEGER REFERENCES teams(id),
      responsible_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_measurements (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL,
      weight_kg NUMERIC(6, 2) NOT NULL,
      height_cm NUMERIC(6, 2) NOT NULL,
      bmi NUMERIC(6, 2) NOT NULL,
      bmi_formula TEXT NOT NULL DEFAULT 'quetelet',
      body_surface_area NUMERIC(6, 2) NOT NULL,
      bsa_formula TEXT NOT NULL DEFAULT 'mosteller',
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medication_catalog (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_unit TEXT NOT NULL,
      active_ingredients TEXT,
      therapeutic_class TEXT,
      search_aliases TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_allergies (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      allergy_name TEXT NOT NULL,
      reaction_description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (patient_id, allergy_name)
    );

    CREATE TABLE IF NOT EXISTS patient_prior_medications (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      medication_name TEXT NOT NULL,
      dose NUMERIC(10, 2) NOT NULL,
      dose_unit TEXT NOT NULL,
      frequency TEXT NOT NULL,
      shifts TEXT NOT NULL,
      quantity_tablets INTEGER,
      lot_number TEXT,
      expiration_date DATE,
      manufacturer TEXT,
      reconciliation_manual_status BOOLEAN,
      reconciliation_intentional_status TEXT,
      reconciliation_prescription_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prior_medication_name_corrections (
      id SERIAL PRIMARY KEY,
      normalized_source_name TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL,
      corrected_medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      corrected_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medical_prescriptions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL,
      medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      medication_name TEXT NOT NULL,
      dose NUMERIC(10, 2) NOT NULL,
      dose_unit TEXT NOT NULL,
      administration_route TEXT,
      frequency TEXT NOT NULL,
      shifts TEXT NOT NULL,
      notes TEXT,
      validation_start_at TIMESTAMPTZ,
      validation_end_at TIMESTAMPTZ,
      validation_status TEXT,
      external_validation_candidate BOOLEAN NOT NULL DEFAULT FALSE,
      quantity_tablets INTEGER,
      lot_number TEXT,
      expiration_date DATE,
      manufacturer TEXT,
      patient_did_not_bring BOOLEAN NOT NULL DEFAULT FALSE,
      stock_validation_note TEXT,
      stock_validation_recorded_at TIMESTAMPTZ,
      stock_validation_professional_id INTEGER REFERENCES professionals(id),
      intervention_notes TEXT,
      intervention_error_type TEXT,
      intervention_contact_status TEXT,
      intervention_requested_to_prescriber BOOLEAN,
      intervention_response TEXT,
      intervention_recorded_at TIMESTAMPTZ,
      intervention_professional_id INTEGER REFERENCES professionals(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patient_exam_imports (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      imported_by_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      file_name TEXT NOT NULL,
      page_count INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      extracted_records JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admission_round_notes (
      id SERIAL PRIMARY KEY,
      admission_id INTEGER NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      responsible_professional_id INTEGER NOT NULL REFERENCES professionals(id),
      round_date DATE NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inpatient_workflow_snapshots (
      professional_id INTEGER PRIMARY KEY REFERENCES professionals(id) ON DELETE CASCADE,
      workflow_by_key JSONB NOT NULL DEFAULT '{}'::jsonb,
      tracked_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
      priority_team_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_login TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      patient_id INTEGER,
      patient_name_snapshot TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admissions_patient_id ON admissions (patient_id);
    CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions (admission_date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admissions_patient_latest ON admissions (patient_id, admission_date DESC, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_measurements_patient_id ON patient_measurements (patient_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_recorded_at ON patient_measurements (recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON patient_allergies (patient_id);
    CREATE INDEX IF NOT EXISTS idx_allergies_patient_latest ON patient_allergies (patient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_prior_medications_patient_id ON patient_prior_medications (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prior_medications_patient_latest ON patient_prior_medications (patient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_prior_medication_name_corrections_source ON prior_medication_name_corrections (normalized_source_name);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON medical_prescriptions (patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_admission_id ON medical_prescriptions (admission_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_latest ON medical_prescriptions (patient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_exam_imports_patient_id ON patient_exam_imports (patient_id);
    CREATE INDEX IF NOT EXISTS idx_exam_imports_created_at ON patient_exam_imports (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_exam_imports_patient_latest ON patient_exam_imports (patient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_round_notes_admission_id ON admission_round_notes (admission_id, round_date DESC, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_round_notes_patient_id ON admission_round_notes (patient_id, round_date DESC, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_inpatient_workflow_updated_at ON inpatient_workflow_snapshots (updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_login ON audit_logs (actor_login, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON audit_logs (patient_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC, id DESC);
  `);

  await pool.query(`
    ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS is_trainee BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS supervising_pharmacist_id INTEGER REFERENCES professionals(id);

    ALTER TABLE professionals
    ALTER COLUMN council_type DROP NOT NULL;

    ALTER TABLE professionals
    ALTER COLUMN council_number DROP NOT NULL;

    ALTER TABLE professionals
    ALTER COLUMN state_uf DROP NOT NULL;

    ALTER TABLE patients
    ALTER COLUMN birth_date DROP NOT NULL;

    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS sex TEXT;

    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL;

    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS bmi_formula TEXT NOT NULL DEFAULT 'quetelet';

    ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS bsa_formula TEXT NOT NULL DEFAULT 'mosteller';

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS admission_summary TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS round_summary TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS round_summary_date DATE;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS admission_import_excerpt TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS denies_continuous_medication_use BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_information_quality TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_information_source_type TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_information_source_name TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_information_source_relationship TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_ambulates BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_is_intubated BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_active_cancer BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_previous_vte BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_known_thrombophilia BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_recent_trauma_or_surgery BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_heart_or_respiratory_failure BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_acute_mi_or_ischemic_stroke BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_acute_infection_or_rheumatologic_disorder BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_hormonal_treatment BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_contraindication_to_pharmacologic_prophylaxis BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS padua_notes TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_critically_ill BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_shock BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_coagulopathy BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_chronic_liver_disease BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_neurocritical BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_enteral_nutrition BOOLEAN;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_agent TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS lamg_notes TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_intervention_motive TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_subjective TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_relevant_symptoms TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_pending_issues TEXT;

    ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS interview_plan TEXT;

    ALTER TABLE patient_allergies
    ADD COLUMN IF NOT EXISTS reaction_description TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_notes TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_error_type TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_contact_status TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_requested_to_prescriber BOOLEAN;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_response TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_recorded_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS intervention_professional_id INTEGER REFERENCES professionals(id);
  `);

  await pool.query(`
    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS quantity_tablets INTEGER;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS lot_number TEXT;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS expiration_date DATE;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS manufacturer TEXT;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS reconciliation_manual_status BOOLEAN;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS reconciliation_intentional_status TEXT;

    ALTER TABLE patient_prior_medications
    ADD COLUMN IF NOT EXISTS reconciliation_prescription_id INTEGER;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prior_medication_name_corrections (
      id SERIAL PRIMARY KEY,
      normalized_source_name TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL,
      corrected_medication_id INTEGER REFERENCES medication_catalog(id) ON DELETE SET NULL,
      corrected_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_prior_medication_name_corrections_source
      ON prior_medication_name_corrections (normalized_source_name);
  `);

  await pool.query(`
    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS external_validation_candidate BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS quantity_tablets INTEGER;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS lot_number TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS expiration_date DATE;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS manufacturer TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS patient_did_not_bring BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS stock_validation_note TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS stock_validation_recorded_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS stock_validation_professional_id INTEGER REFERENCES professionals(id);
  `);

  await pool.query(`
    ALTER TABLE medication_catalog
    ADD COLUMN IF NOT EXISTS active_ingredients TEXT;

    ALTER TABLE medication_catalog
    ADD COLUMN IF NOT EXISTS therapeutic_class TEXT;

    ALTER TABLE medication_catalog
    ADD COLUMN IF NOT EXISTS search_aliases TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS administration_route TEXT;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_start_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_end_at TIMESTAMPTZ;

    ALTER TABLE medical_prescriptions
    ADD COLUMN IF NOT EXISTS validation_status TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_measurements_admission_id ON patient_measurements (admission_id);
  `);

  const patientColumns = await getPatientsColumns(pool);
  await makeLegacyPatientColumnsNullable(pool, patientColumns);
  await migrateLegacyAdmissions(pool, patientColumns);
  await seedDefaultProfessional(pool);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL não configurada.");
  }

  if (!globalDbState.coreclinSetupPromise) {
    globalDbState.coreclinSetupPromise = setupDatabase().catch((error) => {
      globalDbState.coreclinSetupPromise = undefined;
      throw error;
    });
  }

  await globalDbState.coreclinSetupPromise;
}

async function getProfessionalByIdFromClient(
  client: Pool | PoolClient,
  professionalId: number
): Promise<ProfessionalRecord | null> {
  const result = await client.query(
    `
      SELECT
        ${PROFESSIONAL_SELECT_FIELDS}
      FROM professionals p
      LEFT JOIN professionals supervisor ON supervisor.id = p.supervising_pharmacist_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [professionalId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProfessional(result.rows[0] as DbRow);
}

async function resolveSupervisingPharmacistId(
  client: Pool | PoolClient,
  input: {
    professionalId?: number | null;
    isTrainee: boolean;
    supervisingPharmacistId?: number | null;
  }
): Promise<number | null> {
  if (!input.isTrainee) {
    return null;
  }

  const supervisorId = input.supervisingPharmacistId ?? null;
  if (!supervisorId || !Number.isInteger(supervisorId) || supervisorId <= 0) {
    throw new Error("Selecione o farmacêutico responsável pelo estagiário.");
  }

  if (input.professionalId !== undefined && input.professionalId !== null && supervisorId === input.professionalId) {
    throw new Error("O estagiário não pode ser vinculado a si mesmo como responsável.");
  }

  const result = await client.query(
    `
      SELECT id
      FROM professionals
      WHERE id = $1
        AND profession = 'Farmacêutico'
        AND COALESCE(is_trainee, FALSE) = FALSE
      LIMIT 1
    `,
    [supervisorId]
  );

  if (result.rows.length === 0) {
    throw new Error("Farmacêutico responsável inválido.");
  }

  return supervisorId;
}

export async function findProfessionalByLogin(login: string): Promise<ProfessionalRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = login.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        ${PROFESSIONAL_SELECT_FIELDS}
      FROM professionals p
      LEFT JOIN professionals supervisor ON supervisor.id = p.supervising_pharmacist_id
      WHERE p.login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProfessional(result.rows[0] as DbRow);
}

export async function getInpatientWorkflowSnapshotByLogin(
  login: string
): Promise<InpatientWorkflowStoragePayload | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = login.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        iws.workflow_by_key,
        iws.tracked_entries,
        iws.priority_team_ids
      FROM inpatient_workflow_snapshots iws
      INNER JOIN professionals p ON p.id = iws.professional_id
      WHERE p.login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapInpatientWorkflowSnapshot(result.rows[0] as DbRow);
}

export async function authenticateProfessional(
  login: string,
  password: string
): Promise<ProfessionalRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = login.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        ${PROFESSIONAL_SELECT_FIELDS},
        p.password_hash
      FROM professionals p
      LEFT JOIN professionals supervisor ON supervisor.id = p.supervising_pharmacist_id
      WHERE p.login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as DbRow;
  const passwordHash = String(row.password_hash ?? "");
  const isPasswordValid = verifyPassword(password, passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return mapProfessional(row);
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  await ensureDatabaseReady();
  const pool = getPool();
  const actorLogin = input.actorLogin.trim().toLowerCase();
  const action = input.action.trim();
  const resourceType = input.resourceType.trim();
  const resourceId =
    input.resourceId === null || input.resourceId === undefined
      ? null
      : String(input.resourceId).trim() || null;
  const patientId =
    Number.isInteger(input.patientId) && Number(input.patientId) > 0 ? Number(input.patientId) : null;
  const patientNameSnapshot = input.patientNameSnapshot?.trim() || null;

  if (!actorLogin || !action || !resourceType) {
    return;
  }

  await pool.query(
    `
      INSERT INTO audit_logs (
        actor_login,
        action,
        resource_type,
        resource_id,
        patient_id,
        patient_name_snapshot,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      actorLogin,
      action,
      resourceType,
      resourceId,
      patientId,
      patientNameSnapshot,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function recordAuditLogSafely(input: RecordAuditLogInput): Promise<void> {
  try {
    await recordAuditLog(input);
  } catch (error) {
    console.error("Falha ao registrar log de auditoria.", error);
  }
}

export async function listAuditLogs(options?: {
  limit?: number | null;
  actorLogin?: string | null;
  patientId?: number | null;
}): Promise<AuditLogRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const safeLimit =
    Number.isInteger(options?.limit) && Number(options?.limit) > 0
      ? Math.min(Number(options?.limit), 500)
      : 200;
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (options?.actorLogin?.trim()) {
    clauses.push(`actor_login = $${values.push(options.actorLogin.trim().toLowerCase())}`);
  }

  if (Number.isInteger(options?.patientId) && Number(options?.patientId) > 0) {
    clauses.push(`patient_id = $${values.push(Number(options?.patientId))}`);
  }

  const result = await pool.query(
    `
      SELECT
        id,
        actor_login,
        action,
        resource_type,
        resource_id,
        patient_id,
        patient_name_snapshot,
        metadata,
        created_at
      FROM audit_logs
      ${clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY created_at DESC, id DESC
      LIMIT $${values.push(safeLimit)}
    `,
    values
  );

  return result.rows.map((row) => mapAuditLog(row as DbRow));
}

export async function listProfessionals(): Promise<ProfessionalRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      ${PROFESSIONAL_SELECT_FIELDS}
    FROM professionals p
    LEFT JOIN professionals supervisor ON supervisor.id = p.supervising_pharmacist_id
    ORDER BY p.full_name ASC
  `);

  return result.rows.map((row) => mapProfessional(row as DbRow));
}

export async function createProfessional(input: CreateProfessionalInput): Promise<ProfessionalRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = input.login.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);
  const isTrainee = input.isTrainee === true;

  try {
    const supervisingPharmacistId = await resolveSupervisingPharmacistId(pool, {
      isTrainee,
      supervisingPharmacistId: input.supervisingPharmacistId ?? null
    });

    const result = await pool.query(
      `
        INSERT INTO professionals (
          full_name,
          profession,
          council_type,
          council_number,
          state_uf,
          login,
          password_hash,
          institution,
          is_trainee,
          supervising_pharmacist_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        input.fullName.trim(),
        input.profession,
        isTrainee ? null : (input.councilType ?? null),
        isTrainee ? null : input.councilNumber?.trim() || null,
        isTrainee ? null : input.stateUf?.trim().toUpperCase() || null,
        normalizedLogin,
        passwordHash,
        input.institution.trim(),
        isTrainee,
        supervisingPharmacistId
      ]
    );

    return (await getProfessionalByIdFromClient(pool, toNumber((result.rows[0] as DbRow).id)))!;
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe um profissional com este login.");
    }
    throw error;
  }
}

export async function updateProfessional(input: UpdateProfessionalInput): Promise<ProfessionalRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedLogin = input.login.trim().toLowerCase();
  const isTrainee = input.isTrainee === true;
  const passwordHash =
    typeof input.password === "string" && input.password.trim().length > 0
      ? hashPassword(input.password)
      : null;

  try {
    const supervisingPharmacistId = await resolveSupervisingPharmacistId(pool, {
      professionalId: input.professionalId,
      isTrainee,
      supervisingPharmacistId: input.supervisingPharmacistId ?? null
    });

    const result = await pool.query(
      `
        UPDATE professionals
        SET
          full_name = $2,
          profession = $3,
          council_type = $4,
          council_number = $5,
          state_uf = $6,
          login = $7,
          password_hash = COALESCE($8, password_hash),
          institution = $9,
          is_trainee = $10,
          supervising_pharmacist_id = $11
        WHERE id = $1
        RETURNING id
      `,
      [
        input.professionalId,
        input.fullName.trim(),
        input.profession,
        isTrainee ? null : (input.councilType ?? null),
        isTrainee ? null : input.councilNumber?.trim() || null,
        isTrainee ? null : input.stateUf?.trim().toUpperCase() || null,
        normalizedLogin,
        passwordHash,
        input.institution.trim(),
        isTrainee,
        supervisingPharmacistId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Profissional não encontrado.");
    }

    return (await getProfessionalByIdFromClient(pool, input.professionalId))!;
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe um profissional com este login.");
    }
    throw error;
  }
}

export async function listTeams(): Promise<TeamRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, name, created_at
    FROM teams
    ORDER BY name ASC
  `);

  return result.rows.map((row) => mapTeam(row as DbRow));
}

export async function createTeam(name: string): Promise<TeamRecord> {
  await ensureDatabaseReady();
  const pool = getPool();

  try {
    const result = await pool.query(
      `
        INSERT INTO teams (name)
        VALUES ($1)
        RETURNING id, name, created_at
      `,
      [name.trim()]
    );

    return mapTeam(result.rows[0] as DbRow);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Já existe uma equipe com este nome.");
    }
    throw error;
  }
}

export async function listMedicationCatalog(): Promise<MedicationRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      id,
      name,
      default_unit,
      active_ingredients,
      therapeutic_class,
      search_aliases,
      created_at
    FROM medication_catalog
    ORDER BY name ASC
  `);

  return result.rows.map((row) => mapMedication(row as DbRow));
}

export async function createMedication(input: CreateMedicationInput): Promise<MedicationRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const normalizedMedicationName = normalizeMedicationCatalogName(input.name);
  const normalizedDefaultUnit = input.defaultUnit.trim();
  const normalizedActiveIngredients = input.activeIngredients.trim() || null;
  const normalizedTherapeuticClass = input.therapeuticClass.trim() || null;
  const normalizedSearchAliases = input.searchAliases.trim() || null;

  try {
    const duplicateCheck = await pool.query(
      `
        SELECT id
        FROM medication_catalog
        WHERE LOWER(REGEXP_REPLACE(name, '[[:space:]]+', ' ', 'g')) = LOWER($1)
        LIMIT 1
      `,
      [normalizedMedicationName]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error("Medicamento já cadastrado.");
    }

    const result = await pool.query(
      `
        INSERT INTO medication_catalog (
          name,
          default_unit,
          active_ingredients,
          therapeutic_class,
          search_aliases
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          default_unit,
          active_ingredients,
          therapeutic_class,
          search_aliases,
          created_at
      `,
      [
        normalizedMedicationName,
        normalizedDefaultUnit,
        normalizedActiveIngredients,
        normalizedTherapeuticClass,
        normalizedSearchAliases
      ]
    );
    return mapMedication(result.rows[0] as DbRow);
  } catch (error) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Medicamento já cadastrado.");
    }
    throw error;
  }
}

export async function createMedicationsBulk(
  items: CreateMedicationInput[]
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  totalProcessed: number;
}> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const normalizedByName = new Map<string, CreateMedicationInput>();
    for (const item of items) {
      const normalizedName = normalizeMedicationCatalogName(item.name);
      if (!normalizedName) {
        continue;
      }
      normalizedByName.set(normalizedName.toLocaleLowerCase(), {
        name: normalizedName,
        defaultUnit: item.defaultUnit.trim() || "mg",
        activeIngredients: item.activeIngredients.trim(),
        therapeuticClass: item.therapeuticClass.trim(),
        searchAliases: item.searchAliases.trim()
      });
    }

    const normalizedItems = Array.from(normalizedByName.values());
    if (normalizedItems.length === 0) {
      return {
        inserted: 0,
        updated: 0,
        skipped: items.length,
        totalProcessed: 0
      };
    }

    await client.query("BEGIN");

    const existingRows = await client.query(
      `
        SELECT
          id,
          LOWER(REGEXP_REPLACE(name, '[[:space:]]+', ' ', 'g')) AS normalized_name
        FROM medication_catalog
      `
    );

    const existingByName = new Map<string, number>();
    for (const row of existingRows.rows) {
      existingByName.set(
        String((row as DbRow).normalized_name ?? "").toLocaleLowerCase(),
        toNumber((row as DbRow).id)
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const item of normalizedItems) {
      const normalizedKey = item.name.toLocaleLowerCase();
      const medicationId = existingByName.get(normalizedKey);
      const defaultUnit = item.defaultUnit.trim() || "mg";
      const activeIngredients = item.activeIngredients.trim() || null;
      const therapeuticClass = item.therapeuticClass.trim() || null;
      const searchAliases = item.searchAliases.trim() || null;

      if (!medicationId) {
        await client.query(
          `
            INSERT INTO medication_catalog (
              name,
              default_unit,
              active_ingredients,
              therapeutic_class,
              search_aliases
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [item.name, defaultUnit, activeIngredients, therapeuticClass, searchAliases]
        );
        inserted += 1;
        continue;
      }

      const updateResult = await client.query(
        `
          UPDATE medication_catalog
          SET
            default_unit = $2,
            active_ingredients = COALESCE(NULLIF($3, ''), active_ingredients),
            therapeutic_class = COALESCE(NULLIF($4, ''), therapeutic_class),
            search_aliases = COALESCE(NULLIF($5, ''), search_aliases)
          WHERE id = $1
        `,
        [medicationId, defaultUnit, activeIngredients, therapeuticClass, searchAliases]
      );

      if ((updateResult.rowCount ?? 0) > 0) {
        updated += 1;
      }
    }

    await client.query("COMMIT");

    return {
      inserted,
      updated,
      skipped: items.length - normalizedItems.length,
      totalProcessed: normalizedItems.length
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensurePatientExists(client: PoolClient, patientId: number): Promise<void> {
  const result = await client.query(`SELECT id FROM patients WHERE id = $1 LIMIT 1`, [patientId]);
  if (result.rows.length === 0) {
    throw new Error("Paciente não encontrado.");
  }
}

async function ensureAdmissionExists(
  client: PoolClient,
  admissionId: number
): Promise<{ patientId: number }> {
  const result = await client.query(
    `
      SELECT patient_id
      FROM admissions
      WHERE id = $1
      LIMIT 1
    `,
    [admissionId]
  );
  if (result.rows.length === 0) {
    throw new Error("Internação não encontrada.");
  }

  return {
    patientId: toNumber((result.rows[0] as DbRow).patient_id)
  };
}

async function findLatestAdmissionIdByPatient(
  client: PoolClient,
  patientId: number
): Promise<number | null> {
  const result = await client.query(
    `
      SELECT id
      FROM admissions
      WHERE patient_id = $1
      ORDER BY admission_date DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [patientId]
  );

  return result.rows.length > 0 ? toNumber((result.rows[0] as DbRow).id) : null;
}

async function appendMedicationCatalogAlias(
  client: PoolClient,
  medicationId: number,
  alias: string
): Promise<MedicationRecord | null> {
  const normalizedAlias = normalizeMedicationCatalogName(alias);
  const normalizedAliasSearch = normalizeClinicalSearchValue(normalizedAlias);
  if (!normalizedAlias || !normalizedAliasSearch) {
    return null;
  }

  const currentMedication = await client.query(
    `
      SELECT
        id,
        name,
        default_unit,
        active_ingredients,
        therapeutic_class,
        search_aliases,
        created_at
      FROM medication_catalog
      WHERE id = $1
      LIMIT 1
    `,
    [medicationId]
  );

  if (currentMedication.rows.length === 0) {
    return null;
  }

  const medicationRow = currentMedication.rows[0] as DbRow;
  const existingAliases = String(medicationRow.search_aliases ?? "").trim();
  const existingAliasTerms = splitClinicalTerms(existingAliases);
  const hasAlias = existingAliasTerms.some((term) => term.normalized === normalizedAliasSearch);
  const normalizedMedicationName = normalizeClinicalSearchValue(String(medicationRow.name ?? ""));

  if (hasAlias || normalizedMedicationName === normalizedAliasSearch) {
    return mapMedication(medicationRow);
  }

  const nextAliases = [...existingAliasTerms.map((term) => term.raw), normalizedAlias].join("; ");
  const updatedMedication = await client.query(
    `
      UPDATE medication_catalog
      SET search_aliases = $2
      WHERE id = $1
      RETURNING
        id,
        name,
        default_unit,
        active_ingredients,
        therapeutic_class,
        search_aliases,
        created_at
    `,
    [medicationId, nextAliases]
  );

  return updatedMedication.rows[0] ? mapMedication(updatedMedication.rows[0] as DbRow) : null;
}

async function findMedicationCatalogBySearchText(
  client: PoolClient,
  searchText: string
): Promise<MedicationRecord | null> {
  const normalizedSearch = normalizeClinicalSearchValue(searchText);
  if (!normalizedSearch) {
    return null;
  }

  const catalogRows = await client.query(
    `
      SELECT
        id,
        name,
        default_unit,
        active_ingredients,
        therapeutic_class,
        search_aliases,
        created_at
      FROM medication_catalog
    `
  );

  for (const row of catalogRows.rows) {
    const catalogRow = row as DbRow;
    const catalogMedicationName = String(catalogRow.name ?? "").trim();
    const activeIngredients = String(catalogRow.active_ingredients ?? "").trim();
    const therapeuticClass = String(catalogRow.therapeutic_class ?? "").trim();
    const aliases = String(catalogRow.search_aliases ?? "").trim();

    const normalizedCatalogMedicationName = normalizeClinicalSearchValue(catalogMedicationName);
    if (
      normalizedCatalogMedicationName === normalizedSearch ||
      hasClinicalTermMatch(normalizedCatalogMedicationName, normalizedSearch)
    ) {
      return mapMedication(catalogRow);
    }

    const activeTerms = splitClinicalTerms(activeIngredients);
    if (activeTerms.some((term) => hasClinicalTermMatch(term.normalized, normalizedSearch))) {
      return mapMedication(catalogRow);
    }

    const normalizedTherapeuticClass = normalizeClinicalSearchValue(therapeuticClass);
    if (
      normalizedTherapeuticClass &&
      hasClinicalTermMatch(normalizedTherapeuticClass, normalizedSearch)
    ) {
      return mapMedication(catalogRow);
    }

    const aliasTerms = splitClinicalTerms(aliases);
    if (aliasTerms.some((term) => hasClinicalTermMatch(term.normalized, normalizedSearch))) {
      return mapMedication(catalogRow);
    }
  }

  return null;
}

async function findMedicationCatalogExactMatchBySearchText(
  client: PoolClient,
  searchText: string
): Promise<MedicationRecord | null> {
  const normalizedSearch = normalizeClinicalSearchValue(searchText);
  if (!normalizedSearch) {
    return null;
  }

  const catalogRows = await client.query(
    `
      SELECT
        id,
        name,
        default_unit,
        active_ingredients,
        therapeutic_class,
        search_aliases,
        created_at
      FROM medication_catalog
    `
  );

  for (const row of catalogRows.rows) {
    const catalogRow = row as DbRow;
    const catalogMedicationName = String(catalogRow.name ?? "").trim();
    const activeIngredients = String(catalogRow.active_ingredients ?? "").trim();
    const therapeuticClass = String(catalogRow.therapeutic_class ?? "").trim();
    const aliases = String(catalogRow.search_aliases ?? "").trim();

    if (normalizeClinicalSearchValue(catalogMedicationName) === normalizedSearch) {
      return mapMedication(catalogRow);
    }

    if (
      splitClinicalTerms(activeIngredients).some((term) => term.normalized === normalizedSearch) ||
      splitClinicalTerms(aliases).some((term) => term.normalized === normalizedSearch) ||
      normalizeClinicalSearchValue(therapeuticClass) === normalizedSearch
    ) {
      return mapMedication(catalogRow);
    }
  }

  return null;
}

async function findPriorMedicationNameCorrection(
  client: PoolClient,
  sourceName: string
): Promise<{ correctedMedicationId: number | null; correctedName: string } | null> {
  const normalizedSourceName = normalizeClinicalSearchValue(normalizeMedicationCatalogName(sourceName));
  if (!normalizedSourceName) {
    return null;
  }

  const result = await client.query(
    `
      SELECT
        pmnc.corrected_medication_id,
        pmnc.corrected_name
      FROM prior_medication_name_corrections pmnc
      WHERE pmnc.normalized_source_name = $1
      LIMIT 1
    `,
    [normalizedSourceName]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as DbRow;
  return {
    correctedMedicationId:
      row.corrected_medication_id === null ? null : toNumber(row.corrected_medication_id),
    correctedName: String(row.corrected_name ?? "").trim()
  };
}

async function upsertPriorMedicationNameCorrection(
  client: PoolClient,
  sourceName: string,
  correctedMedicationId: number | null,
  correctedName: string
): Promise<void> {
  const normalizedSourceName = normalizeClinicalSearchValue(normalizeMedicationCatalogName(sourceName));
  const normalizedCorrectedName = normalizeClinicalSearchValue(
    normalizeMedicationCatalogName(correctedName)
  );

  if (
    !normalizedSourceName ||
    !normalizedCorrectedName ||
    normalizedSourceName === normalizedCorrectedName
  ) {
    return;
  }

  await client.query(
    `
      INSERT INTO prior_medication_name_corrections (
        normalized_source_name,
        source_name,
        corrected_medication_id,
        corrected_name,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (normalized_source_name)
      DO UPDATE SET
        source_name = EXCLUDED.source_name,
        corrected_medication_id = EXCLUDED.corrected_medication_id,
        corrected_name = EXCLUDED.corrected_name,
        updated_at = NOW()
    `,
    [
      normalizedSourceName,
      normalizeMedicationCatalogName(sourceName),
      correctedMedicationId,
      normalizeMedicationCatalogName(correctedName)
    ]
  );
}

async function learnMedicationCorrection(
  client: PoolClient,
  sourceName: string,
  correctedName: string
): Promise<MedicationRecord | null> {
  const normalizedSourceName = normalizeMedicationCatalogName(sourceName);
  const normalizedCorrectedName = normalizeMedicationCatalogName(correctedName);

  if (!normalizedSourceName || !normalizedCorrectedName) {
    return null;
  }

  const matchedMedication = await findMedicationCatalogBySearchText(client, normalizedCorrectedName);
  if (matchedMedication) {
    await appendMedicationCatalogAlias(client, matchedMedication.id, normalizedSourceName);
  }

  await upsertPriorMedicationNameCorrection(
    client,
    normalizedSourceName,
    matchedMedication?.id ?? null,
    normalizedCorrectedName
  );

  return matchedMedication;
}

async function resolveMedicationData(
  client: PoolClient,
  medicationId: number | undefined,
  fallbackMedicationName: string
): Promise<{ medicationId: number | null; medicationName: string }> {
  if (medicationId && Number.isInteger(medicationId) && medicationId > 0) {
    const result = await client.query(
      `
        SELECT id, name
        FROM medication_catalog
        WHERE id = $1
        LIMIT 1
      `,
      [medicationId]
    );
    if (result.rows.length === 0) {
      throw new Error("Medicamento selecionado não encontrado.");
    }
    return {
      medicationId: toNumber((result.rows[0] as DbRow).id),
      medicationName: String((result.rows[0] as DbRow).name ?? "")
    };
  }

  const normalizedName = fallbackMedicationName.trim();
  if (!normalizedName) {
    throw new Error("Informe o nome do medicamento.");
  }

  return {
    medicationId: null,
    medicationName: normalizedName
  };
}

async function resolvePriorMedicationData(
  client: PoolClient,
  medicationId: number | undefined,
  fallbackMedicationName: string,
  preserveTypedName = false
): Promise<{ medicationId: number | null; medicationName: string }> {
  if (medicationId && Number.isInteger(medicationId) && medicationId > 0) {
    const resolvedMedication = await resolveMedicationData(client, medicationId, fallbackMedicationName);
    const typedMedicationName = normalizeMedicationCatalogName(fallbackMedicationName);

    return {
      medicationId: resolvedMedication.medicationId,
      medicationName:
        preserveTypedName && typedMedicationName
          ? typedMedicationName
          : resolvedMedication.medicationName
    };
  }

  const normalizedName = normalizeMedicationCatalogName(fallbackMedicationName);
  if (!normalizedName) {
    throw new Error("Informe o nome do medicamento.");
  }

  if (preserveTypedName) {
    return {
      medicationId: null,
      medicationName: normalizedName
    };
  }

  const learnedCorrection = await findPriorMedicationNameCorrection(client, normalizedName);
  if (learnedCorrection) {
    return {
      medicationId: learnedCorrection.correctedMedicationId,
      medicationName: learnedCorrection.correctedName
    };
  }

  const exactCatalogMedication = await findMedicationCatalogExactMatchBySearchText(client, normalizedName);
  if (exactCatalogMedication) {
    return {
      medicationId: exactCatalogMedication.id,
      medicationName: exactCatalogMedication.name
    };
  }

  return {
    medicationId: null,
    medicationName: normalizedName
  };
}

async function resolveMedicationNameFromCatalog(
  client: PoolClient,
  medicationName: string,
  preserveMatchedInput = false
): Promise<string> {
  const normalizedMedicationName = normalizeMedicationCatalogName(medicationName);
  if (!normalizedMedicationName) {
    throw new Error("Selecione um medicamento para registrar alergia.");
  }

  const normalizedSearch = normalizeClinicalSearchValue(normalizedMedicationName);

  const catalogRows = await client.query(
    `
      SELECT
        name,
        active_ingredients,
        therapeutic_class,
        search_aliases
      FROM medication_catalog
    `
  );

  let medicationMatch: string | null = null;
  let activeIngredientMatch: string | null = null;
  let therapeuticClassMatch: string | null = null;
  let aliasMatch: string | null = null;

  for (const row of catalogRows.rows) {
    const catalogRow = row as DbRow;
    const catalogMedicationName = String(catalogRow.name ?? "").trim();
    const activeIngredients = String(catalogRow.active_ingredients ?? "").trim();
    const therapeuticClass = String(catalogRow.therapeutic_class ?? "").trim();
    const aliases = String(catalogRow.search_aliases ?? "").trim();

    const normalizedCatalogMedicationName = normalizeClinicalSearchValue(catalogMedicationName);
    if (
      normalizedCatalogMedicationName === normalizedSearch ||
      hasClinicalTermMatch(normalizedCatalogMedicationName, normalizedSearch)
    ) {
      medicationMatch = catalogMedicationName;
      break;
    }

    const activeTerms = splitClinicalTerms(activeIngredients);
    for (const activeTerm of activeTerms) {
      if (hasClinicalTermMatch(activeTerm.normalized, normalizedSearch)) {
        activeIngredientMatch = activeTerm.raw;
        break;
      }
    }
    if (activeIngredientMatch) {
      break;
    }

    const normalizedTherapeuticClass = normalizeClinicalSearchValue(therapeuticClass);
    if (
      normalizedTherapeuticClass &&
      hasClinicalTermMatch(normalizedTherapeuticClass, normalizedSearch)
    ) {
      therapeuticClassMatch = therapeuticClass;
    }

    const aliasTerms = splitClinicalTerms(aliases);
    for (const aliasTerm of aliasTerms) {
      if (hasClinicalTermMatch(aliasTerm.normalized, normalizedSearch)) {
        aliasMatch = catalogMedicationName;
        break;
      }
    }
  }

  if (medicationMatch) {
    return preserveMatchedInput ? normalizedMedicationName : medicationMatch;
  }

  if (activeIngredientMatch) {
    return preserveMatchedInput ? normalizedMedicationName : activeIngredientMatch;
  }

  if (therapeuticClassMatch) {
    return preserveMatchedInput ? normalizedMedicationName : therapeuticClassMatch;
  }

  if (aliasMatch) {
    return preserveMatchedInput ? normalizedMedicationName : aliasMatch;
  }

  throw new Error(
    "Alergia não encontrada no catálogo. Busque por medicamento, princípio ativo ou classe terapêutica."
  );
}

async function findProfessionalIdByLogin(client: PoolClient, login: string): Promise<number> {
  const normalizedLogin = login.trim().toLowerCase();
  const result = await client.query(
    `
      SELECT id
      FROM professionals
      WHERE login = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  if (result.rows.length === 0) {
    throw new Error("Profissional responsável não encontrado para o login atual.");
  }

  return toNumber((result.rows[0] as DbRow).id);
}

async function backfillLegacyInterventionProfessionalMetadata(
  client: PoolClient,
  login: string,
  patientId?: number | null
): Promise<void> {
  const professionalId = await findProfessionalIdByLogin(client, login);
  const values: unknown[] = [professionalId];
  const patientFilter =
    Number.isInteger(patientId) && Number(patientId) > 0
      ? `AND mp.patient_id = $${values.push(Number(patientId))}`
      : "";

  await client.query(
    `
      UPDATE medical_prescriptions mp
      SET
        intervention_professional_id = $1,
        intervention_recorded_at = COALESCE(mp.intervention_recorded_at, mp.created_at)
      WHERE
        mp.intervention_professional_id IS NULL
        AND (
          COALESCE(BTRIM(mp.intervention_notes), '') <> ''
          OR COALESCE(BTRIM(mp.intervention_error_type), '') <> ''
          OR COALESCE(BTRIM(mp.intervention_contact_status), '') <> ''
          OR mp.intervention_requested_to_prescriber IS NOT NULL
          OR COALESCE(BTRIM(mp.intervention_response), '') <> ''
        )
        ${patientFilter}
    `,
    values
  );
}

async function backfillLegacyStockValidationProfessionalMetadata(
  client: PoolClient,
  login: string,
  patientId?: number | null
): Promise<void> {
  const professionalId = await findProfessionalIdByLogin(client, login);
  const values: unknown[] = [professionalId];
  const patientFilter =
    Number.isInteger(patientId) && Number(patientId) > 0
      ? `AND mp.patient_id = $${values.push(Number(patientId))}`
      : "";

  await client.query(
    `
      UPDATE medical_prescriptions mp
      SET
        stock_validation_professional_id = $1,
        stock_validation_recorded_at = COALESCE(
          mp.stock_validation_recorded_at,
          mp.validation_start_at,
          mp.validation_end_at,
          mp.created_at
        )
      WHERE
        mp.stock_validation_professional_id IS NULL
        AND (
          mp.quantity_tablets IS NOT NULL
          OR COALESCE(BTRIM(mp.lot_number), '') <> ''
          OR mp.expiration_date IS NOT NULL
          OR COALESCE(BTRIM(mp.manufacturer), '') <> ''
          OR mp.patient_did_not_bring = TRUE
          OR COALESCE(BTRIM(mp.stock_validation_note), '') <> ''
        )
        ${patientFilter}
    `,
    values
  );
}

export async function saveInpatientWorkflowSnapshot(
  input: SaveInpatientWorkflowSnapshotInput
): Promise<InpatientWorkflowStoragePayload> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const professionalId = await findProfessionalIdByLogin(client, input.login);

    await client.query(
      `
        INSERT INTO inpatient_workflow_snapshots (
          professional_id,
          workflow_by_key,
          tracked_entries,
          priority_team_ids,
          updated_at
        )
        VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, NOW())
        ON CONFLICT (professional_id) DO UPDATE
        SET
          workflow_by_key = EXCLUDED.workflow_by_key,
          tracked_entries = EXCLUDED.tracked_entries,
          priority_team_ids = EXCLUDED.priority_team_ids,
          updated_at = NOW()
      `,
      [
        professionalId,
        JSON.stringify(input.workflowByKey),
        JSON.stringify(input.trackedEntries),
        JSON.stringify(input.priorityTeamIds)
      ]
    );

    const result = await client.query(
      `
        SELECT workflow_by_key, tracked_entries, priority_team_ids
        FROM inpatient_workflow_snapshots
        WHERE professional_id = $1
        LIMIT 1
      `,
      [professionalId]
    );

    await client.query("COMMIT");
    return mapInpatientWorkflowSnapshot(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPatient(input: CreatePatientInput): Promise<PatientRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const responsibleProfessionalId = await findProfessionalIdByLogin(client, input.responsibleLogin);
    const normalizedBirthDate = input.birthDate?.trim() ? input.birthDate.trim() : null;
    const normalizedSex = normalizePatientSex(input.sex);

    const inserted = await client.query(
      `
        INSERT INTO patients (
          full_name,
          chart_number,
          responsible_professional_id,
          birth_date,
          sex
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (chart_number) DO UPDATE
        SET
          full_name = EXCLUDED.full_name,
          responsible_professional_id = EXCLUDED.responsible_professional_id,
          birth_date = COALESCE(EXCLUDED.birth_date, patients.birth_date),
          sex = COALESCE(EXCLUDED.sex, patients.sex)
        RETURNING id
      `,
      [
        input.fullName.trim(),
        input.chartNumber.trim(),
        responsibleProfessionalId,
        normalizedBirthDate,
        normalizedSex
      ]
    );

    const patientId = toNumber((inserted.rows[0] as DbRow).id);

    const normalizedAllergies = input.allergies
      .map((allergy) => allergy.trim())
      .filter((allergy) => allergy.length > 0);

    if (normalizedAllergies.length > 0) {
      const uniqueAllergies = Array.from(
        new Map(normalizedAllergies.map((allergy) => [allergy.toLocaleLowerCase(), allergy])).values()
      );

      for (const allergy of uniqueAllergies) {
        const catalogMedicationName = await resolveMedicationNameFromCatalog(client, allergy);
        await client.query(
          `
            INSERT INTO patient_allergies (patient_id, allergy_name)
            VALUES ($1, $2)
            ON CONFLICT (patient_id, allergy_name) DO NOTHING
          `,
          [patientId, catalogMedicationName]
        );
      }
    }

    await client.query("COMMIT");
    const patientList = await listPatients();
    const createdPatient = patientList.find((patient) => patient.id === patientId);
    if (!createdPatient) {
      throw new Error("Paciente criado, mas não foi possível carregar os dados.");
    }
    return createdPatient;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdmission(input: CreateAdmissionInput): Promise<AdmissionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const responsibleProfessionalId = await findProfessionalIdByLogin(client, input.responsibleLogin);
    const hasMeasurements =
      typeof input.weightKg === "number" &&
      input.weightKg > 0 &&
      typeof input.heightCm === "number" &&
      input.heightCm > 0;
    const indexes = hasMeasurements
      ? calculateClinicalIndexes(
          input.weightKg!,
          input.heightCm!,
          input.bmiFormula ?? "quetelet",
          input.bsaFormula ?? "mosteller"
        )
      : null;

    const inserted = await client.query(
      `
        INSERT INTO admissions (
          patient_id,
          admission_date,
          bed,
          admission_reason,
          denies_continuous_medication_use,
          admission_summary,
          round_summary,
          round_summary_date,
          admission_import_excerpt,
          interview_information_quality,
          interview_information_source_type,
          interview_information_source_name,
          interview_information_source_relationship,
          interview_ambulates,
          interview_is_intubated,
          padua_active_cancer,
          padua_previous_vte,
          padua_known_thrombophilia,
          padua_recent_trauma_or_surgery,
          padua_heart_or_respiratory_failure,
          padua_acute_mi_or_ischemic_stroke,
          padua_acute_infection_or_rheumatologic_disorder,
          padua_hormonal_treatment,
          padua_contraindication_to_pharmacologic_prophylaxis,
          padua_notes,
          lamg_critically_ill,
          lamg_shock,
          lamg_coagulopathy,
          lamg_chronic_liver_disease,
          lamg_neurocritical,
          lamg_enteral_nutrition,
          lamg_agent,
          lamg_notes,
          interview_intervention_motive,
          interview_subjective,
          interview_relevant_symptoms,
          interview_pending_issues,
          interview_plan,
          team_id,
          responsible_professional_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
        )
        RETURNING id
      `,
      [
        input.patientId,
        input.admissionDate,
        input.bed.trim(),
        input.admissionReason?.trim() || "Pendente de preenchimento",
        input.deniesContinuousMedicationUse === true,
        input.admissionSummary?.trim() || null,
        input.roundSummary?.trim() || null,
        input.roundSummaryDate?.trim() || null,
        input.admissionImportExcerpt?.trim() || null,
        input.interviewInformationQuality?.trim() || null,
        input.interviewInformationSourceType?.trim() || null,
        input.interviewInformationSourceName?.trim() || null,
        input.interviewInformationSourceRelationship?.trim() || null,
        input.interviewAmbulates ?? null,
        input.interviewIsIntubated ?? null,
        input.paduaActiveCancer ?? null,
        input.paduaPreviousVte ?? null,
        input.paduaKnownThrombophilia ?? null,
        input.paduaRecentTraumaOrSurgery ?? null,
        input.paduaHeartOrRespiratoryFailure ?? null,
        input.paduaAcuteMiOrIschemicStroke ?? null,
        input.paduaAcuteInfectionOrRheumatologicDisorder ?? null,
        input.paduaHormonalTreatment ?? null,
        input.paduaContraindicationToPharmacologicProphylaxis ?? null,
        input.paduaNotes?.trim() || null,
        input.lamgCriticallyIll ?? null,
        input.lamgShock ?? null,
        input.lamgCoagulopathy ?? null,
        input.lamgChronicLiverDisease ?? null,
        input.lamgNeurocritical ?? null,
        input.lamgEnteralNutrition ?? null,
        input.lamgAgent?.trim() || null,
        input.lamgNotes?.trim() || null,
        input.interviewInterventionMotive?.trim() || null,
        input.interviewSubjective?.trim() || null,
        input.interviewRelevantSymptoms?.trim() || null,
        input.interviewPendingIssues?.trim() || null,
        input.interviewPlan?.trim() || null,
        input.teamId ?? null,
        responsibleProfessionalId
      ]
    );

    const admissionId = toNumber((inserted.rows[0] as DbRow).id);

    if (hasMeasurements && indexes) {
      await client.query(
        `
          INSERT INTO patient_measurements (
            patient_id,
            admission_id,
            weight_kg,
            height_cm,
            bmi,
            bmi_formula,
            body_surface_area,
            bsa_formula
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          input.patientId,
          admissionId,
          input.weightKg,
          input.heightCm,
          indexes.bmi,
          input.bmiFormula ?? "quetelet",
          indexes.bodySurfaceArea,
          input.bsaFormula ?? "mosteller"
        ]
      );
    }

    await client.query("COMMIT");
    const createdAdmission = await getAdmissionById(admissionId);
    if (!createdAdmission) {
      throw new Error("Internação criada, mas não foi possível carregar os dados.");
    }
    return createdAdmission;
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou equipe inválidos para a internação.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdmission(input: UpdateAdmissionInput): Promise<AdmissionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await findProfessionalIdByLogin(client, input.responsibleLogin);

    const updated = await client.query(
      `
        UPDATE admissions
        SET
          admission_date = $2,
          bed = $3,
          admission_reason = $4,
          denies_continuous_medication_use = $5,
          admission_summary = $6,
          round_summary = $7,
          round_summary_date = $8,
          admission_import_excerpt = $9,
          interview_information_quality = $10,
          interview_information_source_type = $11,
          interview_information_source_name = $12,
          interview_information_source_relationship = $13,
          interview_ambulates = $14,
          interview_is_intubated = $15,
          padua_active_cancer = $16,
          padua_previous_vte = $17,
          padua_known_thrombophilia = $18,
          padua_recent_trauma_or_surgery = $19,
          padua_heart_or_respiratory_failure = $20,
          padua_acute_mi_or_ischemic_stroke = $21,
          padua_acute_infection_or_rheumatologic_disorder = $22,
          padua_hormonal_treatment = $23,
          padua_contraindication_to_pharmacologic_prophylaxis = $24,
          padua_notes = $25,
          lamg_critically_ill = $26,
          lamg_shock = $27,
          lamg_coagulopathy = $28,
          lamg_chronic_liver_disease = $29,
          lamg_neurocritical = $30,
          lamg_enteral_nutrition = $31,
          lamg_agent = $32,
          lamg_notes = $33,
          interview_intervention_motive = $34,
          interview_subjective = $35,
          interview_relevant_symptoms = $36,
          interview_pending_issues = $37,
          interview_plan = $38,
          team_id = $39
        WHERE id = $1
        RETURNING id, patient_id
      `,
      [
        input.admissionId,
        input.admissionDate,
        input.bed.trim(),
        input.admissionReason?.trim() || "Pendente de preenchimento",
        input.deniesContinuousMedicationUse === true,
        input.admissionSummary?.trim() || null,
        input.roundSummary?.trim() || null,
        input.roundSummaryDate?.trim() || null,
        input.admissionImportExcerpt?.trim() || null,
        input.interviewInformationQuality?.trim() || null,
        input.interviewInformationSourceType?.trim() || null,
        input.interviewInformationSourceName?.trim() || null,
        input.interviewInformationSourceRelationship?.trim() || null,
        input.interviewAmbulates ?? null,
        input.interviewIsIntubated ?? null,
        input.paduaActiveCancer ?? null,
        input.paduaPreviousVte ?? null,
        input.paduaKnownThrombophilia ?? null,
        input.paduaRecentTraumaOrSurgery ?? null,
        input.paduaHeartOrRespiratoryFailure ?? null,
        input.paduaAcuteMiOrIschemicStroke ?? null,
        input.paduaAcuteInfectionOrRheumatologicDisorder ?? null,
        input.paduaHormonalTreatment ?? null,
        input.paduaContraindicationToPharmacologicProphylaxis ?? null,
        input.paduaNotes?.trim() || null,
        input.lamgCriticallyIll ?? null,
        input.lamgShock ?? null,
        input.lamgCoagulopathy ?? null,
        input.lamgChronicLiverDisease ?? null,
        input.lamgNeurocritical ?? null,
        input.lamgEnteralNutrition ?? null,
        input.lamgAgent?.trim() || null,
        input.lamgNotes?.trim() || null,
        input.interviewInterventionMotive?.trim() || null,
        input.interviewSubjective?.trim() || null,
        input.interviewRelevantSymptoms?.trim() || null,
        input.interviewPendingIssues?.trim() || null,
        input.interviewPlan?.trim() || null,
        input.teamId ?? null
      ]
    );

    if (updated.rows.length === 0) {
      throw new Error("Internação não encontrada para atualização.");
    }

    const admissionRow = updated.rows[0] as DbRow;
    const patientId = toNumber(admissionRow.patient_id);
    const hasMeasurements =
      typeof input.weightKg === "number" &&
      input.weightKg > 0 &&
      typeof input.heightCm === "number" &&
      input.heightCm > 0;

    if (hasMeasurements) {
      const latestMeasurementResult = await client.query(
        `
          SELECT
            weight_kg::float8 AS weight_kg,
            height_cm::float8 AS height_cm,
            bmi_formula,
            bsa_formula
          FROM patient_measurements
          WHERE admission_id = $1
          ORDER BY recorded_at DESC, id DESC
          LIMIT 1
        `,
        [input.admissionId]
      );

      const latestMeasurementRow = latestMeasurementResult.rows[0] as DbRow | undefined;
      const measurementChanged =
        !latestMeasurementRow ||
        Math.abs(toNumber(latestMeasurementRow.weight_kg) - input.weightKg!) > 0.005 ||
        Math.abs(toNumber(latestMeasurementRow.height_cm) - input.heightCm!) > 0.005 ||
        String(latestMeasurementRow.bmi_formula ?? "") !== (input.bmiFormula ?? "quetelet") ||
        String(latestMeasurementRow.bsa_formula ?? "") !== (input.bsaFormula ?? "mosteller");

      if (measurementChanged) {
        const indexes = calculateClinicalIndexes(
          input.weightKg!,
          input.heightCm!,
          input.bmiFormula ?? "quetelet",
          input.bsaFormula ?? "mosteller"
        );

        await client.query(
          `
            INSERT INTO patient_measurements (
              patient_id,
              admission_id,
              weight_kg,
              height_cm,
              bmi,
              bmi_formula,
              body_surface_area,
              bsa_formula
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            patientId,
            input.admissionId,
            input.weightKg,
            input.heightCm,
            indexes.bmi,
            input.bmiFormula ?? "quetelet",
            indexes.bodySurfaceArea,
            input.bsaFormula ?? "mosteller"
          ]
        );
      }
    }

    await client.query("COMMIT");
    const updatedAdmission = await getAdmissionById(input.admissionId);
    if (!updatedAdmission) {
      throw new Error("Internação atualizada, mas não foi possível carregar os dados.");
    }

    return updatedAdmission;
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou equipe inválidos para a internação.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addPatientAllergy(
  input: AddPatientAllergyInput
): Promise<SavePatientAllergyResult> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const normalizedAllergy = await resolveMedicationNameFromCatalog(
      client,
      input.allergyName,
      true
    );
    let learnedMedication: MedicationRecord | null = null;
    const matchedMedication = await findMedicationCatalogBySearchText(client, normalizedAllergy);
    if (matchedMedication) {
      learnedMedication = await learnMedicationCorrection(client, input.allergyName, normalizedAllergy);
    }
    const inserted = await client.query(
      `
        INSERT INTO patient_allergies (patient_id, allergy_name, reaction_description)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        input.patientId,
        normalizedAllergy,
        input.reactionDescription?.trim() ? input.reactionDescription.trim() : null
      ]
    );

    const allergyId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          pa.id,
          pa.patient_id,
          p.full_name AS patient_name,
          pa.allergy_name,
          pa.reaction_description,
          pa.created_at
        FROM patient_allergies pa
        INNER JOIN patients p ON p.id = pa.patient_id
        WHERE pa.id = $1
        LIMIT 1
      `,
      [allergyId]
    );

    await client.query("COMMIT");
    return {
      allergy: mapPatientAllergy(result.rows[0] as DbRow),
      learnedMedication
    };
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      throw new Error("Alergia já cadastrada para este paciente.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function removePatientAllergy(input: RemovePatientAllergyInput): Promise<void> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const deleted = await client.query(
      `
        DELETE FROM patient_allergies
        WHERE id = $1 AND patient_id = $2
        RETURNING id
      `,
      [input.allergyId, input.patientId]
    );

    if (deleted.rowCount === 0) {
      throw new Error("Alergia não encontrada para este paciente.");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePatientAllergy(
  input: UpdatePatientAllergyInput
): Promise<SavePatientAllergyResult> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const currentAllergyResult = await client.query(
      `
        SELECT allergy_name, reaction_description
        FROM patient_allergies
        WHERE id = $1 AND patient_id = $2
        LIMIT 1
      `,
      [input.allergyId, input.patientId]
    );

    if (currentAllergyResult.rows.length === 0) {
      throw new Error("Alergia não encontrada para este paciente.");
    }

    const currentAllergyRow = currentAllergyResult.rows[0] as DbRow;
    const previousAllergyName = String(currentAllergyRow.allergy_name ?? "").trim();
    const nextAllergyNameInput = input.allergyName?.trim() ?? previousAllergyName;
    const nextAllergyName = nextAllergyNameInput
      ? await resolveMedicationNameFromCatalog(client, nextAllergyNameInput, true)
      : previousAllergyName;

    const updated = await client.query(
      `
        UPDATE patient_allergies
        SET
          allergy_name = $3,
          reaction_description = $4
        WHERE id = $1 AND patient_id = $2
        RETURNING id
      `,
      [
        input.allergyId,
        input.patientId,
        nextAllergyName,
        input.reactionDescription?.trim() ? input.reactionDescription.trim() : null
      ]
    );

    if (updated.rowCount === 0) {
      throw new Error("Alergia não encontrada para este paciente.");
    }

    let learnedMedication: MedicationRecord | null = null;
    if (
      previousAllergyName &&
      normalizeClinicalSearchValue(previousAllergyName) !== normalizeClinicalSearchValue(nextAllergyName)
    ) {
      learnedMedication = await learnMedicationCorrection(
        client,
        previousAllergyName,
        nextAllergyName
      );
    }

    const result = await client.query(
      `
        SELECT
          pa.id,
          pa.patient_id,
          p.full_name AS patient_name,
          pa.allergy_name,
          pa.reaction_description,
          pa.created_at
        FROM patient_allergies pa
        INNER JOIN patients p ON p.id = pa.patient_id
        WHERE pa.id = $1
        LIMIT 1
      `,
      [input.allergyId]
    );

    await client.query("COMMIT");
    return {
      allergy: mapPatientAllergy(result.rows[0] as DbRow),
      learnedMedication
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addAdmissionRoundNote(
  input: CreateAdmissionRoundNoteInput
): Promise<AdmissionRoundNoteRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { patientId } = await ensureAdmissionExists(client, input.admissionId);
    const responsibleProfessionalId = await findProfessionalIdByLogin(client, input.responsibleLogin);

    const inserted = await client.query(
      `
        INSERT INTO admission_round_notes (
          admission_id,
          patient_id,
          responsible_professional_id,
          round_date,
          note
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        input.admissionId,
        patientId,
        responsibleProfessionalId,
        input.roundDate,
        input.note.trim()
      ]
    );

    const roundNoteId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          arn.id,
          arn.patient_id,
          p.full_name AS patient_name,
          arn.admission_id,
          arn.round_date::text AS round_date,
          arn.note,
          arn.responsible_professional_id,
          prof.full_name AS responsible_professional_name,
          arn.created_at
        FROM admission_round_notes arn
        INNER JOIN patients p ON p.id = arn.patient_id
        INNER JOIN professionals prof ON prof.id = arn.responsible_professional_id
        WHERE arn.id = $1
        LIMIT 1
      `,
      [roundNoteId]
    );

    await client.query("COMMIT");
    return mapAdmissionRoundNote(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addPriorMedication(
  input: AddPriorMedicationInput
): Promise<PriorMedicationRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);
    const medicationData = await resolvePriorMedicationData(
      client,
      input.medicationId,
      input.medicationName,
      input.preserveTypedName === true
    );

    const inserted = await client.query(
      `
        INSERT INTO patient_prior_medications (
          patient_id,
          medication_id,
          medication_name,
          dose,
          dose_unit,
          frequency,
          shifts,
          quantity_tablets,
          lot_number,
          expiration_date,
          manufacturer,
          reconciliation_manual_status,
          reconciliation_intentional_status,
          reconciliation_prescription_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, NULL)
        RETURNING id
      `,
      [
        input.patientId,
        medicationData.medicationId,
        medicationData.medicationName,
        input.dose !== null && Number.isFinite(input.dose) && input.dose > 0 ? input.dose : 0,
        input.doseUnit.trim(),
        input.frequency.trim(),
        input.shifts.trim(),
        input.quantityTablets ?? null,
        input.lotNumber?.trim() ? input.lotNumber.trim() : null,
        input.expirationDate?.trim() ? input.expirationDate.trim() : null,
        input.manufacturer?.trim() ? input.manufacturer.trim() : null
      ]
    );

    const priorMedicationId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          pm.id,
          pm.patient_id,
          p.full_name AS patient_name,
          pm.medication_id,
          pm.medication_name,
          pm.dose::float8 AS dose,
          pm.dose_unit,
          pm.frequency,
          pm.shifts,
          pm.quantity_tablets,
          pm.lot_number,
          pm.expiration_date::text AS expiration_date,
          pm.manufacturer,
          pm.reconciliation_manual_status,
          pm.reconciliation_intentional_status,
          pm.reconciliation_prescription_id,
          linked_mp.medication_name AS reconciliation_prescription_medication_name,
          pm.created_at
        FROM patient_prior_medications pm
        INNER JOIN patients p ON p.id = pm.patient_id
        LEFT JOIN medical_prescriptions linked_mp ON linked_mp.id = pm.reconciliation_prescription_id
        WHERE pm.id = $1
        LIMIT 1
      `,
      [priorMedicationId]
    );

    await client.query("COMMIT");
    return mapPriorMedication(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou medicamento inválido.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function removePriorMedication(input: RemovePriorMedicationInput): Promise<void> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const deleted = await client.query(
      `
        DELETE FROM patient_prior_medications
        WHERE id = $1 AND patient_id = $2
        RETURNING id
      `,
      [input.priorMedicationId, input.patientId]
    );

    if (deleted.rowCount === 0) {
      throw new Error("Medicamento prévio não encontrado para este paciente.");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePriorMedication(
  input: UpdatePriorMedicationInput
): Promise<UpdatePriorMedicationResult> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const currentPriorMedicationResult = await client.query(
      `
        SELECT medication_id, medication_name
        FROM patient_prior_medications
        WHERE id = $1 AND patient_id = $2
        LIMIT 1
      `,
      [input.priorMedicationId, input.patientId]
    );

    if (currentPriorMedicationResult.rows.length === 0) {
      throw new Error("Medicamento prévio não encontrado para este paciente.");
    }

    const currentPriorMedicationRow = currentPriorMedicationResult.rows[0] as DbRow;
    const previousMedicationId =
      currentPriorMedicationRow.medication_id === null
        ? null
        : toNumber(currentPriorMedicationRow.medication_id);
    const previousMedicationName = String(currentPriorMedicationRow.medication_name ?? "").trim();
    const requestedMedicationName = input.medicationName?.trim() ?? previousMedicationName;
    const medicationNameChanged =
      input.medicationName !== undefined &&
      normalizeClinicalSearchValue(requestedMedicationName) !==
        normalizeClinicalSearchValue(previousMedicationName);
    const medicationData = medicationNameChanged
      ? await resolvePriorMedicationData(
          client,
          input.medicationId,
          requestedMedicationName,
          input.preserveTypedName === true
        )
      : {
          medicationId: previousMedicationId,
          medicationName: previousMedicationName
        };

    let linkedPrescriptionMedicationId: number | null = null;
    let linkedPrescriptionMedicationName = "";
    if (
      input.reconciliationPrescriptionId !== undefined &&
      input.reconciliationPrescriptionId !== null
    ) {
      const linkedPrescription = await client.query(
        `
          SELECT id, medication_id, medication_name
          FROM medical_prescriptions
          WHERE id = $1 AND patient_id = $2
          LIMIT 1
        `,
        [input.reconciliationPrescriptionId, input.patientId]
      );

      if (linkedPrescription.rows.length === 0) {
        throw new Error("Medicamento da prescrição inválido para este paciente.");
      }

      linkedPrescriptionMedicationId =
        (linkedPrescription.rows[0] as DbRow).medication_id === null
          ? null
          : toNumber((linkedPrescription.rows[0] as DbRow).medication_id);
      linkedPrescriptionMedicationName = String(
        (linkedPrescription.rows[0] as DbRow).medication_name ?? ""
      ).trim();
    }

    const updated = await client.query(
      `
        UPDATE patient_prior_medications
        SET
          medication_id = $1,
          medication_name = $2,
          dose = $3,
          dose_unit = $4,
          frequency = $5,
          shifts = $6,
          reconciliation_manual_status = $7,
          reconciliation_intentional_status = $8,
          reconciliation_prescription_id = $9
        WHERE id = $10 AND patient_id = $11
        RETURNING id
      `,
      [
        medicationData.medicationId,
        medicationData.medicationName,
        input.dose !== null && Number.isFinite(input.dose) && input.dose > 0 ? input.dose : 0,
        input.doseUnit.trim(),
        input.frequency.trim(),
        input.shifts.trim(),
        input.reconciliationManualStatus ?? null,
        input.reconciliationIntentionalStatus ?? null,
        input.reconciliationPrescriptionId ?? null,
        input.priorMedicationId,
        input.patientId
      ]
    );

    if (updated.rowCount === 0) {
      throw new Error("Medicamento prévio não encontrado para este paciente.");
    }

    let learnedMedication: MedicationRecord | null = null;
    if (medicationNameChanged && previousMedicationName) {
      if (medicationData.medicationId !== null) {
        learnedMedication = await appendMedicationCatalogAlias(
          client,
          medicationData.medicationId,
          previousMedicationName
        );
      }

      await upsertPriorMedicationNameCorrection(
        client,
        previousMedicationName,
        medicationData.medicationId,
        medicationData.medicationName
      );
    }

    if (
      input.reconciliationManualStatus === true &&
      (linkedPrescriptionMedicationId !== null || linkedPrescriptionMedicationName)
    ) {
      const priorMedicationAlias = await client.query(
        `
          SELECT medication_name
          FROM patient_prior_medications
          WHERE id = $1 AND patient_id = $2
          LIMIT 1
        `,
        [input.priorMedicationId, input.patientId]
      );

      const aliasName = String((priorMedicationAlias.rows[0] as DbRow | undefined)?.medication_name ?? "").trim();
      if (aliasName) {
        if (linkedPrescriptionMedicationId === null && linkedPrescriptionMedicationName) {
          linkedPrescriptionMedicationId =
            (await findMedicationCatalogBySearchText(client, linkedPrescriptionMedicationName))?.id ?? null;
        }

        if (linkedPrescriptionMedicationId !== null) {
          learnedMedication =
            (await appendMedicationCatalogAlias(client, linkedPrescriptionMedicationId, aliasName)) ??
            learnedMedication;
          await upsertPriorMedicationNameCorrection(
            client,
            aliasName,
            linkedPrescriptionMedicationId,
            linkedPrescriptionMedicationName || learnedMedication?.name || aliasName
          );
        }
      }
    }

    const result = await client.query(
      `
        SELECT
          pm.id,
          pm.patient_id,
          p.full_name AS patient_name,
          pm.medication_id,
          pm.medication_name,
          pm.dose::float8 AS dose,
          pm.dose_unit,
          pm.frequency,
          pm.shifts,
          pm.quantity_tablets,
          pm.lot_number,
          pm.expiration_date::text AS expiration_date,
          pm.manufacturer,
          pm.reconciliation_manual_status,
          pm.reconciliation_intentional_status,
          pm.reconciliation_prescription_id,
          linked_mp.medication_name AS reconciliation_prescription_medication_name,
          pm.created_at
        FROM patient_prior_medications pm
        INNER JOIN patients p ON p.id = pm.patient_id
        LEFT JOIN medical_prescriptions linked_mp ON linked_mp.id = pm.reconciliation_prescription_id
        WHERE pm.id = $1
        LIMIT 1
      `,
      [input.priorMedicationId]
    );

    await client.query("COMMIT");
    return {
      priorMedication: mapPriorMedication(result.rows[0] as DbRow),
      learnedMedication
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addPatientExamImport(
  input: AddPatientExamImportInput
): Promise<PatientExamImportRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const importedByProfessionalId = await findProfessionalIdByLogin(client, input.importedByLogin);
    const normalizedFileName = input.fileName.trim();
    const normalizedRawText = input.rawText.trim();
    const normalizedRecords = normalizeExamImportRecords(input.records);

    if (!normalizedFileName) {
      throw new Error("Informe o nome do arquivo processado.");
    }

    if (!Number.isInteger(input.pageCount) || input.pageCount <= 0) {
      throw new Error("Quantidade de páginas inválida.");
    }

    if (!normalizedRawText) {
      throw new Error("Nenhum texto foi extraído do PDF informado.");
    }

    const inserted = await client.query(
      `
        INSERT INTO patient_exam_imports (
          patient_id,
          imported_by_professional_id,
          file_name,
          page_count,
          raw_text,
          extracted_records
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id
      `,
      [
        input.patientId,
        importedByProfessionalId,
        normalizedFileName,
        input.pageCount,
        normalizedRawText,
        JSON.stringify(normalizedRecords)
      ]
    );

    const examImportId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          pei.id,
          pei.patient_id,
          p.full_name AS patient_name,
          pei.imported_by_professional_id,
          prof.full_name AS imported_by_professional_name,
          pei.file_name,
          pei.page_count,
          pei.raw_text,
          pei.extracted_records,
          pei.created_at
        FROM patient_exam_imports pei
        INNER JOIN patients p ON p.id = pei.patient_id
        INNER JOIN professionals prof ON prof.id = pei.imported_by_professional_id
        WHERE pei.id = $1
        LIMIT 1
      `,
      [examImportId]
    );

    await client.query("COMMIT");
    return mapPatientExamImport(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente ou profissional inválido para salvar a importação dos exames.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function removePatientExamImport(input: RemovePatientExamImportInput): Promise<void> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const deleted = await client.query(
      `
        DELETE FROM patient_exam_imports
        WHERE id = $1 AND patient_id = $2
        RETURNING id
      `,
      [input.examImportId, input.patientId]
    );

    if (deleted.rowCount === 0) {
      throw new Error("Importação de exames não encontrada para este paciente.");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removePatientExamRecord(
  input: RemovePatientExamRecordInput
): Promise<PatientExamImportRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const normalizedRecordKey = input.recordKey.trim();
    if (!normalizedRecordKey) {
      throw new Error("Resultado de exame inválido.");
    }

    const currentExamImportResult = await client.query(
      `
        SELECT
          pei.id,
          pei.patient_id,
          p.full_name AS patient_name,
          pei.imported_by_professional_id,
          prof.full_name AS imported_by_professional_name,
          pei.file_name,
          pei.page_count,
          pei.raw_text,
          pei.extracted_records,
          pei.created_at
        FROM patient_exam_imports pei
        INNER JOIN patients p ON p.id = pei.patient_id
        INNER JOIN professionals prof ON prof.id = pei.imported_by_professional_id
        WHERE pei.id = $1 AND pei.patient_id = $2
        LIMIT 1
      `,
      [input.examImportId, input.patientId]
    );

    if (currentExamImportResult.rowCount === 0) {
      throw new Error("Importação de exames não encontrada para este paciente.");
    }

    const currentExamImport = mapPatientExamImport(currentExamImportResult.rows[0] as DbRow);
    const nextRecords = currentExamImport.records.filter((record) => record.key !== normalizedRecordKey);

    if (nextRecords.length === currentExamImport.records.length) {
      throw new Error("Resultado de exame não encontrado nesta importação.");
    }

    const normalizedRecords = normalizeExamImportRecords(nextRecords);

    await client.query(
      `
        UPDATE patient_exam_imports
        SET extracted_records = $3::jsonb
        WHERE id = $1 AND patient_id = $2
      `,
      [input.examImportId, input.patientId, JSON.stringify(normalizedRecords)]
    );

    const updatedExamImportResult = await client.query(
      `
        SELECT
          pei.id,
          pei.patient_id,
          p.full_name AS patient_name,
          pei.imported_by_professional_id,
          prof.full_name AS imported_by_professional_name,
          pei.file_name,
          pei.page_count,
          pei.raw_text,
          pei.extracted_records,
          pei.created_at
        FROM patient_exam_imports pei
        INNER JOIN patients p ON p.id = pei.patient_id
        INNER JOIN professionals prof ON prof.id = pei.imported_by_professional_id
        WHERE pei.id = $1 AND pei.patient_id = $2
        LIMIT 1
      `,
      [input.examImportId, input.patientId]
    );

    await client.query("COMMIT");
    return mapPatientExamImport(updatedExamImportResult.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addMedicalPrescription(
  input: AddMedicalPrescriptionInput
): Promise<MedicalPrescriptionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const medicationData = await resolveMedicationData(client, input.medicationId, input.medicationName);
    const typedMedicationName = input.medicationName.trim();
    const storedMedicationName = typedMedicationName || medicationData.medicationName;
    let safeAdmissionId: number | null = null;
    if (input.admissionId && Number.isInteger(input.admissionId) && input.admissionId > 0) {
      const admissionResult = await client.query(
        `
          SELECT id
          FROM admissions
          WHERE id = $1 AND patient_id = $2
          LIMIT 1
        `,
        [input.admissionId, input.patientId]
      );
      if (admissionResult.rows.length > 0) {
        safeAdmissionId = input.admissionId;
      } else {
        safeAdmissionId = await findLatestAdmissionIdByPatient(client, input.patientId);
      }
    } else {
      safeAdmissionId = await findLatestAdmissionIdByPatient(client, input.patientId);
    }

    const inserted = await client.query(
      `
        INSERT INTO medical_prescriptions (
          patient_id,
          admission_id,
          medication_id,
          medication_name,
          dose,
          dose_unit,
          administration_route,
          frequency,
          shifts,
          notes,
          validation_start_at,
          validation_end_at,
          validation_status,
          external_validation_candidate,
          quantity_tablets,
          lot_number,
          expiration_date,
          manufacturer,
          patient_did_not_bring,
          stock_validation_note,
          stock_validation_recorded_at,
          stock_validation_professional_id,
          intervention_notes,
          intervention_error_type,
          intervention_contact_status,
          intervention_requested_to_prescriber,
          intervention_response,
          intervention_recorded_at,
          intervention_professional_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          NULL, NULL, NULL, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
        )
        RETURNING id
      `,
      [
        input.patientId,
        safeAdmissionId,
        medicationData.medicationId,
        storedMedicationName,
        input.dose,
        input.doseUnit.trim(),
        input.administrationRoute?.trim() ? input.administrationRoute.trim() : null,
        input.frequency.trim(),
        input.shifts?.trim() ? input.shifts.trim() : "-",
        input.notes?.trim() ? input.notes.trim() : null,
        input.validationStartAt ?? null,
        input.validationEndAt ?? null,
        input.validationStatus?.trim() ? input.validationStatus.trim() : null,
        input.externalValidationCandidate ?? false
      ]
    );

    const prescriptionId = toNumber((inserted.rows[0] as DbRow).id);
    const result = await client.query(
      `
        SELECT
          mp.id,
          mp.patient_id,
          p.full_name AS patient_name,
          p.chart_number,
          COALESCE(mp.admission_id, latest_admission.id) AS admission_id,
          COALESCE(a.admission_date::text, latest_admission.admission_date::text) AS admission_date,
          COALESCE(a.bed, latest_admission.bed) AS bed,
          COALESCE(t.name, latest_admission.team_name) AS team_name,
          mp.medication_id,
          mp.medication_name,
          mp.dose::float8 AS dose,
          mp.dose_unit,
          mp.administration_route,
          mp.frequency,
          mp.shifts,
          mp.notes,
          mp.validation_start_at,
          mp.validation_end_at,
          mp.validation_status,
          mp.external_validation_candidate,
          mp.quantity_tablets,
          mp.lot_number,
          mp.expiration_date::text AS expiration_date,
          mp.manufacturer,
          mp.patient_did_not_bring,
          mp.stock_validation_note,
          mp.stock_validation_recorded_at,
          mp.stock_validation_professional_id,
          stock_prof.full_name AS stock_validation_professional_name,
          mp.intervention_notes,
          mp.intervention_error_type,
          mp.intervention_contact_status,
          mp.intervention_requested_to_prescriber,
          mp.intervention_response,
          mp.intervention_recorded_at,
          mp.intervention_professional_id,
          prof.full_name AS intervention_professional_name,
          mp.created_at
        FROM medical_prescriptions mp
        INNER JOIN patients p ON p.id = mp.patient_id
        LEFT JOIN admissions a ON a.id = mp.admission_id
        LEFT JOIN teams t ON t.id = a.team_id
        LEFT JOIN LATERAL (
          SELECT
            a2.id,
            a2.admission_date,
            a2.bed,
            t2.name AS team_name
          FROM admissions a2
          LEFT JOIN teams t2 ON t2.id = a2.team_id
          WHERE a2.patient_id = mp.patient_id
          ORDER BY a2.admission_date DESC, a2.created_at DESC, a2.id DESC
          LIMIT 1
        ) latest_admission ON TRUE
        LEFT JOIN professionals stock_prof ON stock_prof.id = mp.stock_validation_professional_id
        LEFT JOIN professionals prof ON prof.id = mp.intervention_professional_id
        WHERE mp.id = $1
        LIMIT 1
      `,
      [prescriptionId]
    );

    await client.query("COMMIT");
    return mapMedicalPrescription(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    const postgresError = error as { code?: string };
    if (postgresError.code === "23503") {
      throw new Error("Paciente, internação ou medicamento inválido.");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function removeMedicalPrescriptionSet(
  input: RemoveMedicalPrescriptionSetInput
): Promise<number[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const prescriptionIds = Array.from(
      new Set(
        input.prescriptionIds.filter(
          (value): value is number => Number.isInteger(value) && value > 0
        )
      )
    );

    if (prescriptionIds.length === 0) {
      throw new Error("Nenhuma linha válida foi informada para apagar a prescrição.");
    }

    const existingResult = await client.query(
      `
        SELECT id
        FROM medical_prescriptions
        WHERE patient_id = $1 AND id = ANY($2::int[])
      `,
      [input.patientId, prescriptionIds]
    );

    if (existingResult.rows.length !== prescriptionIds.length) {
      throw new Error("Algumas linhas da prescrição não pertencem a este paciente.");
    }

    const deletedResult = await client.query(
      `
        DELETE FROM medical_prescriptions
        WHERE patient_id = $1 AND id = ANY($2::int[])
        RETURNING id
      `,
      [input.patientId, prescriptionIds]
    );

    if (deletedResult.rowCount === 0) {
      throw new Error("Nenhuma linha da prescrição foi encontrada para exclusão.");
    }

    await client.query("COMMIT");
    return deletedResult.rows.map((row) => toNumber((row as DbRow).id));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMedicalPrescriptionValidation(
  input: UpdateMedicalPrescriptionValidationInput
): Promise<MedicalPrescriptionRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensurePatientExists(client, input.patientId);

    const assignments: string[] = [];
    const values: unknown[] = [];
    const hasStockValidationField =
      "quantityTablets" in input ||
      "lotNumber" in input ||
      "expirationDate" in input ||
      "manufacturer" in input ||
      "patientDidNotBring" in input ||
      "stockValidationNote" in input;
    const hasInterventionField =
      "interventionNotes" in input ||
      "interventionErrorType" in input ||
      "interventionContactStatus" in input ||
      "interventionRequestedToPrescriber" in input ||
      "interventionResponse" in input;
    const normalizedInterventionNotes = input.interventionNotes?.trim()
      ? input.interventionNotes.trim()
      : null;
    const normalizedInterventionErrorType = input.interventionErrorType?.trim()
      ? input.interventionErrorType.trim()
      : null;
    const normalizedInterventionContactStatus = input.interventionContactStatus?.trim()
      ? input.interventionContactStatus.trim()
      : null;

    if ("quantityTablets" in input) {
      assignments.push(`quantity_tablets = $${values.push(input.quantityTablets ?? null)}`);
    }

    if ("lotNumber" in input) {
      assignments.push(`lot_number = $${values.push(input.lotNumber?.trim() ? input.lotNumber.trim() : null)}`);
    }

    if ("expirationDate" in input) {
      assignments.push(
        `expiration_date = $${values.push(input.expirationDate?.trim() ? input.expirationDate.trim() : null)}`
      );
    }

    if ("manufacturer" in input) {
      assignments.push(
        `manufacturer = $${values.push(input.manufacturer?.trim() ? input.manufacturer.trim() : null)}`
      );
    }

    if ("patientDidNotBring" in input) {
      assignments.push(`patient_did_not_bring = $${values.push(Boolean(input.patientDidNotBring))}`);
    }

    if ("stockValidationNote" in input) {
      assignments.push(
        `stock_validation_note = $${values.push(
          input.stockValidationNote?.trim() ? input.stockValidationNote.trim() : null
        )}`
      );
    }

    if (hasStockValidationField) {
      const hasPersistedStockValidation =
        input.quantityTablets !== null &&
        input.quantityTablets !== undefined ||
        Boolean(input.lotNumber?.trim()) ||
        Boolean(input.expirationDate?.trim()) ||
        Boolean(input.manufacturer?.trim()) ||
        Boolean(input.patientDidNotBring) ||
        Boolean(input.stockValidationNote?.trim());
      const stockValidationProfessionalId =
        hasPersistedStockValidation && input.responsibleLogin?.trim()
          ? await findProfessionalIdByLogin(client, input.responsibleLogin)
          : null;

      assignments.push(
        `stock_validation_recorded_at = $${values.push(
          hasPersistedStockValidation ? new Date().toISOString() : null
        )}`
      );
      assignments.push(
        `stock_validation_professional_id = $${values.push(stockValidationProfessionalId)}`
      );
    }

    if ("interventionNotes" in input) {
      assignments.push(
        `intervention_notes = $${values.push(normalizedInterventionNotes)}`
      );
    }

    if ("interventionErrorType" in input) {
      assignments.push(
        `intervention_error_type = $${values.push(normalizedInterventionErrorType)}`
      );
    }

    if ("interventionContactStatus" in input) {
      assignments.push(
        `intervention_contact_status = $${values.push(normalizedInterventionContactStatus)}`
      );
    }

    if ("interventionRequestedToPrescriber" in input) {
      assignments.push(
        `intervention_requested_to_prescriber = $${values.push(
          input.interventionRequestedToPrescriber ?? null
        )}`
      );
    }

    if ("interventionResponse" in input) {
      assignments.push(
        `intervention_response = $${values.push(input.interventionResponse ?? null)}`
      );
    }

    if (hasInterventionField) {
      const hasPersistedIntervention =
        Boolean(normalizedInterventionNotes) ||
        Boolean(normalizedInterventionErrorType) ||
        Boolean(normalizedInterventionContactStatus) ||
        input.interventionRequestedToPrescriber !== null &&
          input.interventionRequestedToPrescriber !== undefined ||
        Boolean(input.interventionResponse);
      const interventionProfessionalId =
        hasPersistedIntervention && input.responsibleLogin?.trim()
          ? await findProfessionalIdByLogin(client, input.responsibleLogin)
          : null;

      assignments.push(
        `intervention_recorded_at = $${values.push(
          hasPersistedIntervention ? new Date().toISOString() : null
        )}`
      );
      assignments.push(
        `intervention_professional_id = $${values.push(interventionProfessionalId)}`
      );
    }

    if (assignments.length === 0) {
      throw new Error("Nenhuma alteração informada para a prescrição.");
    }

    const updated = await client.query(
      `
        UPDATE medical_prescriptions
        SET
          ${assignments.join(", ")}
        WHERE id = $${values.length + 1} AND patient_id = $${values.length + 2}
        RETURNING id
      `,
      [...values, input.prescriptionId, input.patientId]
    );

    if (updated.rowCount === 0) {
      throw new Error("Prescrição não encontrada para este paciente.");
    }

    const result = await client.query(
      `
        SELECT
          mp.id,
          mp.patient_id,
          p.full_name AS patient_name,
          p.chart_number,
          COALESCE(mp.admission_id, latest_admission.id) AS admission_id,
          COALESCE(a.admission_date::text, latest_admission.admission_date::text) AS admission_date,
          COALESCE(a.bed, latest_admission.bed) AS bed,
          COALESCE(t.name, latest_admission.team_name) AS team_name,
          mp.medication_id,
          mp.medication_name,
          mp.dose::float8 AS dose,
          mp.dose_unit,
          mp.administration_route,
          mp.frequency,
          mp.shifts,
          mp.notes,
          mp.validation_start_at,
          mp.validation_end_at,
          mp.validation_status,
          mp.external_validation_candidate,
          mp.quantity_tablets,
          mp.lot_number,
          mp.expiration_date::text AS expiration_date,
          mp.manufacturer,
          mp.patient_did_not_bring,
          mp.stock_validation_note,
          mp.stock_validation_recorded_at,
          mp.stock_validation_professional_id,
          stock_prof.full_name AS stock_validation_professional_name,
          mp.intervention_notes,
          mp.intervention_error_type,
          mp.intervention_contact_status,
          mp.intervention_requested_to_prescriber,
          mp.intervention_response,
          mp.intervention_recorded_at,
          mp.intervention_professional_id,
          prof.full_name AS intervention_professional_name,
          mp.created_at
        FROM medical_prescriptions mp
        INNER JOIN patients p ON p.id = mp.patient_id
        LEFT JOIN admissions a ON a.id = mp.admission_id
        LEFT JOIN teams t ON t.id = a.team_id
        LEFT JOIN LATERAL (
          SELECT
            a2.id,
            a2.admission_date,
            a2.bed,
            t2.name AS team_name
          FROM admissions a2
          LEFT JOIN teams t2 ON t2.id = a2.team_id
          WHERE a2.patient_id = mp.patient_id
          ORDER BY a2.admission_date DESC, a2.created_at DESC, a2.id DESC
          LIMIT 1
        ) latest_admission ON TRUE
        LEFT JOIN professionals stock_prof ON stock_prof.id = mp.stock_validation_professional_id
        LEFT JOIN professionals prof ON prof.id = mp.intervention_professional_id
        WHERE mp.id = $1
        LIMIT 1
      `,
      [input.prescriptionId]
    );

    await client.query("COMMIT");
    return mapMedicalPrescription(result.rows[0] as DbRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addPatientMeasurement(
  patientId: number,
  weightKg: number,
  heightCm: number,
  bmiFormula: BmiFormulaId = "quetelet",
  bsaFormula: BsaFormulaId = "mosteller",
  admissionId?: number
): Promise<MeasurementHistoryRecord> {
  await ensureDatabaseReady();
  const pool = getPool();
  const indexes = calculateClinicalIndexes(weightKg, heightCm, bmiFormula, bsaFormula);

  const inserted = await pool.query(
    `
      INSERT INTO patient_measurements (
        patient_id,
        admission_id,
        weight_kg,
        height_cm,
        bmi,
        bmi_formula,
        body_surface_area,
        bsa_formula
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, patient_id, weight_kg::float8 AS weight_kg, height_cm::float8 AS height_cm, bmi::float8 AS bmi, bmi_formula, body_surface_area::float8 AS body_surface_area, bsa_formula, recorded_at
    `,
    [
      patientId,
      admissionId ?? null,
      weightKg,
      heightCm,
      indexes.bmi,
      bmiFormula,
      indexes.bodySurfaceArea,
      bsaFormula
    ]
  );

  const patientResult = await pool.query(
    `
      SELECT full_name
      FROM patients
      WHERE id = $1
      LIMIT 1
    `,
    [patientId]
  );

  if (patientResult.rows.length === 0) {
    throw new Error("Paciente não encontrado.");
  }

  return mapMeasurement({
    ...(inserted.rows[0] as DbRow),
    patient_name: String((patientResult.rows[0] as DbRow).full_name ?? "")
  });
}

export async function listPatients(
  patientId?: number | null,
  options?: {
    includeLatestDetails?: boolean;
  }
): Promise<PatientRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;
  const includeLatestDetails = options?.includeLatestDetails ?? true;

  const latestAdmissionSelect = includeLatestDetails
    ? `
      la.id AS latest_admission_id,
      la.admission_date::text AS latest_admission_date,
      la.bed AS latest_admission_bed,
      la.admission_reason AS latest_admission_reason,
      la.denies_continuous_medication_use AS latest_admission_denies_continuous_medication_use,
      la.admission_summary AS latest_admission_summary,
      la.round_summary AS latest_admission_round_summary,
      la.round_summary_date::text AS latest_admission_round_summary_date,
      la.admission_import_excerpt AS latest_admission_import_excerpt,
      la.interview_information_quality AS latest_admission_interview_information_quality,
      la.interview_information_source_type AS latest_admission_interview_information_source_type,
      la.interview_information_source_name AS latest_admission_interview_information_source_name,
      la.interview_information_source_relationship AS latest_admission_interview_information_source_relationship,
      la.interview_ambulates AS latest_admission_interview_ambulates,
      la.interview_is_intubated AS latest_admission_interview_is_intubated,
      la.padua_active_cancer AS latest_admission_padua_active_cancer,
      la.padua_previous_vte AS latest_admission_padua_previous_vte,
      la.padua_known_thrombophilia AS latest_admission_padua_known_thrombophilia,
      la.padua_recent_trauma_or_surgery AS latest_admission_padua_recent_trauma_or_surgery,
      la.padua_heart_or_respiratory_failure AS latest_admission_padua_heart_or_respiratory_failure,
      la.padua_acute_mi_or_ischemic_stroke AS latest_admission_padua_acute_mi_or_ischemic_stroke,
      la.padua_acute_infection_or_rheumatologic_disorder AS latest_admission_padua_acute_infection_or_rheumatologic_disorder,
      la.padua_hormonal_treatment AS latest_admission_padua_hormonal_treatment,
      la.padua_contraindication_to_pharmacologic_prophylaxis AS latest_admission_padua_contraindication_to_pharmacologic_prophylaxis,
      la.padua_notes AS latest_admission_padua_notes,
      la.lamg_critically_ill AS latest_admission_lamg_critically_ill,
      la.lamg_shock AS latest_admission_lamg_shock,
      la.lamg_coagulopathy AS latest_admission_lamg_coagulopathy,
      la.lamg_chronic_liver_disease AS latest_admission_lamg_chronic_liver_disease,
      la.lamg_neurocritical AS latest_admission_lamg_neurocritical,
      la.lamg_enteral_nutrition AS latest_admission_lamg_enteral_nutrition,
      la.lamg_agent AS latest_admission_lamg_agent,
      la.lamg_notes AS latest_admission_lamg_notes,
      la.interview_intervention_motive AS latest_admission_interview_intervention_motive,
      la.interview_subjective AS latest_admission_interview_subjective,
      la.interview_relevant_symptoms AS latest_admission_interview_relevant_symptoms,
      la.interview_pending_issues AS latest_admission_interview_pending_issues,
      la.interview_plan AS latest_admission_interview_plan,
      la.team_id AS latest_admission_team_id,
      t.name AS latest_admission_team_name,
      la.responsible_professional_id AS latest_admission_responsible_professional_id,
      larp.full_name AS latest_admission_responsible_professional_name,
      la.created_at AS latest_admission_created_at,
      latest_m.weight_kg::float8 AS weight_kg,
      latest_m.height_cm::float8 AS height_cm,
      latest_m.bmi::float8 AS bmi,
      latest_m.bmi_formula,
      latest_m.body_surface_area::float8 AS body_surface_area,
      latest_m.bsa_formula,
      latest_m.recorded_at
    `
    : `
      NULL::integer AS latest_admission_id,
      NULL::text AS latest_admission_date,
      NULL::text AS latest_admission_bed,
      NULL::text AS latest_admission_reason,
      NULL::boolean AS latest_admission_denies_continuous_medication_use,
      NULL::text AS latest_admission_summary,
      NULL::text AS latest_admission_round_summary,
      NULL::text AS latest_admission_round_summary_date,
      NULL::text AS latest_admission_import_excerpt,
      NULL::text AS latest_admission_interview_information_quality,
      NULL::text AS latest_admission_interview_information_source_type,
      NULL::text AS latest_admission_interview_information_source_name,
      NULL::text AS latest_admission_interview_information_source_relationship,
      NULL::boolean AS latest_admission_interview_ambulates,
      NULL::boolean AS latest_admission_interview_is_intubated,
      NULL::boolean AS latest_admission_padua_active_cancer,
      NULL::boolean AS latest_admission_padua_previous_vte,
      NULL::boolean AS latest_admission_padua_known_thrombophilia,
      NULL::boolean AS latest_admission_padua_recent_trauma_or_surgery,
      NULL::boolean AS latest_admission_padua_heart_or_respiratory_failure,
      NULL::boolean AS latest_admission_padua_acute_mi_or_ischemic_stroke,
      NULL::boolean AS latest_admission_padua_acute_infection_or_rheumatologic_disorder,
      NULL::boolean AS latest_admission_padua_hormonal_treatment,
      NULL::boolean AS latest_admission_padua_contraindication_to_pharmacologic_prophylaxis,
      NULL::text AS latest_admission_padua_notes,
      NULL::boolean AS latest_admission_lamg_critically_ill,
      NULL::boolean AS latest_admission_lamg_shock,
      NULL::boolean AS latest_admission_lamg_coagulopathy,
      NULL::boolean AS latest_admission_lamg_chronic_liver_disease,
      NULL::boolean AS latest_admission_lamg_neurocritical,
      NULL::boolean AS latest_admission_lamg_enteral_nutrition,
      NULL::text AS latest_admission_lamg_agent,
      NULL::text AS latest_admission_lamg_notes,
      NULL::text AS latest_admission_interview_intervention_motive,
      NULL::text AS latest_admission_interview_subjective,
      NULL::text AS latest_admission_interview_relevant_symptoms,
      NULL::text AS latest_admission_interview_pending_issues,
      NULL::text AS latest_admission_interview_plan,
      NULL::integer AS latest_admission_team_id,
      NULL::text AS latest_admission_team_name,
      NULL::integer AS latest_admission_responsible_professional_id,
      NULL::text AS latest_admission_responsible_professional_name,
      NULL::timestamptz AS latest_admission_created_at,
      NULL::float8 AS weight_kg,
      NULL::float8 AS height_cm,
      NULL::float8 AS bmi,
      NULL::text AS bmi_formula,
      NULL::float8 AS body_surface_area,
      NULL::text AS bsa_formula,
      NULL::timestamptz AS recorded_at
    `;

  const latestAdmissionJoin = includeLatestDetails
    ? `
    LEFT JOIN LATERAL (
      SELECT
        a.id,
        a.admission_date,
        a.bed,
        a.admission_reason,
        a.denies_continuous_medication_use,
        a.admission_summary,
        a.round_summary,
        a.round_summary_date,
        a.admission_import_excerpt,
        a.interview_information_quality,
        a.interview_information_source_type,
        a.interview_information_source_name,
        a.interview_information_source_relationship,
        a.interview_ambulates,
        a.interview_is_intubated,
        a.padua_active_cancer,
        a.padua_previous_vte,
        a.padua_known_thrombophilia,
        a.padua_recent_trauma_or_surgery,
        a.padua_heart_or_respiratory_failure,
        a.padua_acute_mi_or_ischemic_stroke,
        a.padua_acute_infection_or_rheumatologic_disorder,
        a.padua_hormonal_treatment,
        a.padua_contraindication_to_pharmacologic_prophylaxis,
        a.padua_notes,
        a.lamg_critically_ill,
        a.lamg_shock,
        a.lamg_coagulopathy,
        a.lamg_chronic_liver_disease,
        a.lamg_neurocritical,
        a.lamg_enteral_nutrition,
        a.lamg_agent,
        a.lamg_notes,
        a.interview_intervention_motive,
        a.interview_subjective,
        a.interview_relevant_symptoms,
        a.interview_pending_issues,
        a.interview_plan,
        a.team_id,
        a.responsible_professional_id,
        a.created_at
      FROM admissions a
      WHERE a.patient_id = p.id
      ORDER BY a.admission_date DESC, a.created_at DESC, a.id DESC
      LIMIT 1
    ) la ON TRUE
    LEFT JOIN teams t ON t.id = la.team_id
    LEFT JOIN professionals larp ON larp.id = la.responsible_professional_id
    LEFT JOIN LATERAL (
      SELECT
        m.weight_kg,
        m.height_cm,
        m.bmi,
        m.bmi_formula,
        m.body_surface_area,
        m.bsa_formula,
        m.recorded_at
      FROM patient_measurements m
      WHERE m.patient_id = p.id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT 1
    ) latest_m ON TRUE
    `
    : "";

  const result = await pool.query(
    `
    SELECT
      p.id,
      p.full_name,
      p.chart_number,
      p.birth_date::text AS birth_date,
      p.sex,
      CASE
        WHEN p.birth_date IS NULL THEN NULL
        ELSE DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int
      END AS age_years,
      p.responsible_professional_id,
      rp.full_name AS responsible_professional_name,
      rp.login AS responsible_professional_login,
      ${latestAdmissionSelect}
    FROM patients p
    INNER JOIN professionals rp ON rp.id = p.responsible_professional_id
    ${latestAdmissionJoin}
    ${shouldFilterByPatientId ? "WHERE p.id = $1" : ""}
    ORDER BY p.created_at DESC, p.id DESC
  `,
    shouldFilterByPatientId ? [Number(patientId)] : []
  );

  return result.rows.map((row) => mapPatient(row as DbRow));
}

export async function listInpatientOverviewEntries(): Promise<InpatientEntry[]> {
  await ensureDatabaseReady();
  const pool = getPool();

  const result = await pool.query(
    `
      SELECT
        latest_admission.patient_id,
        p.full_name AS patient_name,
        p.chart_number,
        CASE
          WHEN p.birth_date IS NULL THEN NULL
          ELSE DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int
        END AS reported_age_years,
        latest_admission.admission_date::text AS admission_date,
        latest_admission.bed,
        latest_admission.team_id,
        t.name AS team_name,
        latest_admission.created_at
      FROM (
        SELECT DISTINCT ON (a.patient_id)
          a.patient_id,
          a.admission_date,
          a.bed,
          a.team_id,
          a.created_at,
          a.id
        FROM admissions a
        ORDER BY a.patient_id, a.admission_date DESC, a.created_at DESC, a.id DESC
      ) latest_admission
      INNER JOIN patients p ON p.id = latest_admission.patient_id
      LEFT JOIN teams t ON t.id = latest_admission.team_id
      ORDER BY latest_admission.admission_date DESC, latest_admission.created_at DESC, latest_admission.patient_id DESC
    `
  );

  return result.rows.map((row) => mapInpatientOverviewEntry(row as DbRow));
}

export async function listRecentAdmissions(
  limit = 40,
  patientId?: number | null
): Promise<AdmissionRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.floor(limit))) : 40;
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.patient_id,
        p.full_name AS patient_name,
        p.chart_number,
        a.admission_date::text AS admission_date,
        a.bed,
        a.admission_reason,
        a.denies_continuous_medication_use,
        a.admission_summary,
        a.round_summary,
        a.round_summary_date::text AS round_summary_date,
        a.admission_import_excerpt,
        a.interview_information_quality,
        a.interview_information_source_type,
        a.interview_information_source_name,
        a.interview_information_source_relationship,
        a.interview_ambulates,
        a.interview_is_intubated,
        a.padua_active_cancer,
        a.padua_previous_vte,
        a.padua_known_thrombophilia,
        a.padua_recent_trauma_or_surgery,
        a.padua_heart_or_respiratory_failure,
        a.padua_acute_mi_or_ischemic_stroke,
        a.padua_acute_infection_or_rheumatologic_disorder,
        a.padua_hormonal_treatment,
        a.padua_contraindication_to_pharmacologic_prophylaxis,
        a.padua_notes,
        a.lamg_critically_ill,
        a.lamg_shock,
        a.lamg_coagulopathy,
        a.lamg_chronic_liver_disease,
        a.lamg_neurocritical,
        a.lamg_enteral_nutrition,
        a.lamg_agent,
        a.lamg_notes,
        a.interview_intervention_motive,
        a.interview_subjective,
        a.interview_relevant_symptoms,
        a.interview_pending_issues,
        a.interview_plan,
        a.team_id,
        t.name AS team_name,
        a.responsible_professional_id,
        rp.full_name AS responsible_professional_name,
        am.weight_kg::float8 AS weight_kg,
        am.height_cm::float8 AS height_cm,
        am.bmi::float8 AS bmi,
        am.bmi_formula,
        am.body_surface_area::float8 AS body_surface_area,
        am.bsa_formula,
        a.created_at
      FROM admissions a
      INNER JOIN patients p ON p.id = a.patient_id
      INNER JOIN professionals rp ON rp.id = a.responsible_professional_id
      LEFT JOIN teams t ON t.id = a.team_id
      LEFT JOIN LATERAL (
      SELECT
        m.weight_kg,
        m.height_cm,
        m.bmi,
        m.bmi_formula,
        m.body_surface_area,
        m.bsa_formula
        FROM patient_measurements m
        WHERE m.admission_id = a.id
        ORDER BY m.recorded_at DESC, m.id DESC
        LIMIT 1
      ) am ON TRUE
      ${shouldFilterByPatientId ? "WHERE a.patient_id = $2" : ""}
      ORDER BY a.admission_date DESC, a.created_at DESC, a.id DESC
      LIMIT $1
    `,
    shouldFilterByPatientId ? [safeLimit, Number(patientId)] : [safeLimit]
  );

  return result.rows.map((row) => mapAdmission(row as DbRow));
}

async function getAdmissionById(admissionId: number): Promise<AdmissionRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.patient_id,
        p.full_name AS patient_name,
        p.chart_number,
        a.admission_date::text AS admission_date,
        a.bed,
        a.admission_reason,
        a.denies_continuous_medication_use,
        a.admission_summary,
        a.round_summary,
        a.round_summary_date::text AS round_summary_date,
        a.admission_import_excerpt,
        a.interview_information_quality,
        a.interview_information_source_type,
        a.interview_information_source_name,
        a.interview_information_source_relationship,
        a.interview_ambulates,
        a.interview_is_intubated,
        a.padua_active_cancer,
        a.padua_previous_vte,
        a.padua_known_thrombophilia,
        a.padua_recent_trauma_or_surgery,
        a.padua_heart_or_respiratory_failure,
        a.padua_acute_mi_or_ischemic_stroke,
        a.padua_acute_infection_or_rheumatologic_disorder,
        a.padua_hormonal_treatment,
        a.padua_contraindication_to_pharmacologic_prophylaxis,
        a.padua_notes,
        a.lamg_critically_ill,
        a.lamg_shock,
        a.lamg_coagulopathy,
        a.lamg_chronic_liver_disease,
        a.lamg_neurocritical,
        a.lamg_enteral_nutrition,
        a.lamg_agent,
        a.lamg_notes,
        a.interview_intervention_motive,
        a.interview_subjective,
        a.interview_relevant_symptoms,
        a.interview_pending_issues,
        a.interview_plan,
        a.team_id,
        t.name AS team_name,
        a.responsible_professional_id,
        rp.full_name AS responsible_professional_name,
        am.weight_kg::float8 AS weight_kg,
        am.height_cm::float8 AS height_cm,
        am.bmi::float8 AS bmi,
        am.bmi_formula,
        am.body_surface_area::float8 AS body_surface_area,
        am.bsa_formula,
        a.created_at
      FROM admissions a
      INNER JOIN patients p ON p.id = a.patient_id
      INNER JOIN professionals rp ON rp.id = a.responsible_professional_id
      LEFT JOIN teams t ON t.id = a.team_id
      LEFT JOIN LATERAL (
        SELECT
          m.weight_kg,
          m.height_cm,
          m.bmi,
          m.bmi_formula,
          m.body_surface_area,
          m.bsa_formula
        FROM patient_measurements m
        WHERE m.admission_id = a.id
        ORDER BY m.recorded_at DESC, m.id DESC
        LIMIT 1
      ) am ON TRUE
      WHERE a.id = $1
      LIMIT 1
    `,
    [admissionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAdmission(result.rows[0] as DbRow);
}

export async function listRecentMeasurements(limit = 30): Promise<MeasurementHistoryRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.floor(limit))) : 30;

  const result = await pool.query(
    `
      SELECT
        m.id,
        m.patient_id,
        p.full_name AS patient_name,
        m.weight_kg::float8 AS weight_kg,
        m.height_cm::float8 AS height_cm,
        m.bmi::float8 AS bmi,
        m.bmi_formula,
        m.body_surface_area::float8 AS body_surface_area,
        m.bsa_formula,
        m.recorded_at
      FROM patient_measurements m
      INNER JOIN patients p ON p.id = m.patient_id
      ORDER BY m.recorded_at DESC, m.id DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map((row) => mapMeasurement(row as DbRow));
}

export async function listPatientAllergies(patientId?: number | null): Promise<PatientAllergyRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;
  const result = await pool.query(
    `
      SELECT
        pa.id,
        pa.patient_id,
        p.full_name AS patient_name,
        pa.allergy_name,
        pa.reaction_description,
        pa.created_at
      FROM patient_allergies pa
    INNER JOIN patients p ON p.id = pa.patient_id
    ${shouldFilterByPatientId ? "WHERE pa.patient_id = $1" : ""}
    ORDER BY pa.created_at DESC, pa.id DESC
  `,
    shouldFilterByPatientId ? [Number(patientId)] : []
  );

  return result.rows.map((row) => mapPatientAllergy(row as DbRow));
}

export async function listAdmissionRoundNotes(
  patientId?: number | null,
  options?: {
    admissionId?: number | null;
  }
): Promise<AdmissionRoundNoteRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const filterValues: number[] = [];
  const whereClauses: string[] = [];

  if (Number.isInteger(patientId) && Number(patientId) > 0) {
    filterValues.push(Number(patientId));
    whereClauses.push(`arn.patient_id = $${filterValues.length}`);
  }

  if (Number.isInteger(options?.admissionId) && Number(options?.admissionId) > 0) {
    filterValues.push(Number(options?.admissionId));
    whereClauses.push(`arn.admission_id = $${filterValues.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        arn.id,
        arn.patient_id,
        p.full_name AS patient_name,
        arn.admission_id,
        arn.round_date::text AS round_date,
        arn.note,
        arn.responsible_professional_id,
        prof.full_name AS responsible_professional_name,
        arn.created_at
      FROM admission_round_notes arn
      INNER JOIN patients p ON p.id = arn.patient_id
      INNER JOIN professionals prof ON prof.id = arn.responsible_professional_id
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
      ORDER BY arn.round_date DESC, arn.created_at DESC, arn.id DESC
    `,
    filterValues
  );

  return result.rows.map((row) => mapAdmissionRoundNote(row as DbRow));
}

export async function listPriorMedications(patientId?: number | null): Promise<PriorMedicationRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;
  const result = await pool.query(
    `
    SELECT
      pm.id,
      pm.patient_id,
      p.full_name AS patient_name,
      pm.medication_id,
      pm.medication_name,
      pm.dose::float8 AS dose,
      pm.dose_unit,
      pm.frequency,
      pm.shifts,
      pm.quantity_tablets,
      pm.lot_number,
      pm.expiration_date::text AS expiration_date,
      pm.manufacturer,
      pm.reconciliation_manual_status,
      pm.reconciliation_prescription_id,
      linked_mp.medication_name AS reconciliation_prescription_medication_name,
      pm.created_at
    FROM patient_prior_medications pm
    INNER JOIN patients p ON p.id = pm.patient_id
    LEFT JOIN medical_prescriptions linked_mp ON linked_mp.id = pm.reconciliation_prescription_id
    ${shouldFilterByPatientId ? "WHERE pm.patient_id = $1" : ""}
    ORDER BY pm.created_at DESC, pm.id DESC
  `,
    shouldFilterByPatientId ? [Number(patientId)] : []
  );

  return result.rows.map((row) => mapPriorMedication(row as DbRow));
}

export async function listPatientExamImports(
  patientId?: number | null,
  options?: {
    includeRawText?: "all" | "latest" | "none";
  }
): Promise<PatientExamImportRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;
  const includeRawText = options?.includeRawText ?? "all";
  const rawTextSelect =
    includeRawText === "all"
      ? "pei.raw_text"
      : includeRawText === "latest"
        ? "CASE WHEN row_number() OVER (PARTITION BY pei.patient_id ORDER BY pei.created_at DESC, pei.id DESC) = 1 THEN pei.raw_text ELSE NULL END AS raw_text"
        : "NULL::text AS raw_text";
  const result = await pool.query(
    `
    SELECT
      pei.id,
      pei.patient_id,
      p.full_name AS patient_name,
      pei.imported_by_professional_id,
      prof.full_name AS imported_by_professional_name,
      pei.file_name,
      pei.page_count,
      ${rawTextSelect},
      pei.extracted_records,
      pei.created_at
    FROM patient_exam_imports pei
    INNER JOIN patients p ON p.id = pei.patient_id
    INNER JOIN professionals prof ON prof.id = pei.imported_by_professional_id
    ${shouldFilterByPatientId ? "WHERE pei.patient_id = $1" : ""}
    ORDER BY pei.created_at DESC, pei.id DESC
  `,
    shouldFilterByPatientId ? [Number(patientId)] : []
  );

  return result.rows.map((row) => mapPatientExamImport(row as DbRow));
}

export async function getPatientExamImportById(
  patientId: number,
  examImportId: number
): Promise<PatientExamImportRecord | null> {
  await ensureDatabaseReady();
  const pool = getPool();
  const result = await pool.query(
    `
    SELECT
      pei.id,
      pei.patient_id,
      p.full_name AS patient_name,
      pei.imported_by_professional_id,
      prof.full_name AS imported_by_professional_name,
      pei.file_name,
      pei.page_count,
      pei.raw_text,
      pei.extracted_records,
      pei.created_at
    FROM patient_exam_imports pei
    INNER JOIN patients p ON p.id = pei.patient_id
    INNER JOIN professionals prof ON prof.id = pei.imported_by_professional_id
    WHERE pei.patient_id = $1 AND pei.id = $2
    LIMIT 1
  `,
    [patientId, examImportId]
  );

  return result.rows[0] ? mapPatientExamImport(result.rows[0] as DbRow) : null;
}

export async function listMedicalPrescriptions(
  patientId?: number | null,
  options?: {
    backfillInterventionProfessionalLogin?: string | null;
    backfillValidationProfessionalLogin?: string | null;
  }
): Promise<MedicalPrescriptionRecord[]> {
  await ensureDatabaseReady();
  const pool = getPool();
  const shouldFilterByPatientId = Number.isInteger(patientId) && Number(patientId) > 0;
  const client = await pool.connect();

  try {
    if (options?.backfillInterventionProfessionalLogin?.trim()) {
      await backfillLegacyInterventionProfessionalMetadata(
        client,
        options.backfillInterventionProfessionalLogin,
        shouldFilterByPatientId ? Number(patientId) : null
      );
    }

    if (options?.backfillValidationProfessionalLogin?.trim()) {
      await backfillLegacyStockValidationProfessionalMetadata(
        client,
        options.backfillValidationProfessionalLogin,
        shouldFilterByPatientId ? Number(patientId) : null
      );
    }

    const result = await client.query(
      `
      SELECT
        mp.id,
        mp.patient_id,
        p.full_name AS patient_name,
        p.chart_number,
        COALESCE(mp.admission_id, latest_admission.id) AS admission_id,
        COALESCE(a.admission_date::text, latest_admission.admission_date::text) AS admission_date,
        COALESCE(a.bed, latest_admission.bed) AS bed,
        COALESCE(t.name, latest_admission.team_name) AS team_name,
        mp.medication_id,
        mp.medication_name,
        mp.dose::float8 AS dose,
        mp.dose_unit,
        mp.administration_route,
        mp.frequency,
        mp.shifts,
        mp.notes,
        mp.validation_start_at,
        mp.validation_end_at,
        mp.validation_status,
        mp.external_validation_candidate,
        mp.quantity_tablets,
        mp.lot_number,
        mp.expiration_date::text AS expiration_date,
        mp.manufacturer,
        mp.patient_did_not_bring,
        mp.stock_validation_note,
        mp.stock_validation_recorded_at,
        mp.stock_validation_professional_id,
        stock_prof.full_name AS stock_validation_professional_name,
        mp.intervention_notes,
        mp.intervention_error_type,
        mp.intervention_contact_status,
        mp.intervention_requested_to_prescriber,
        mp.intervention_response,
        mp.intervention_recorded_at,
        mp.intervention_professional_id,
        prof.full_name AS intervention_professional_name,
        mp.created_at
      FROM medical_prescriptions mp
      INNER JOIN patients p ON p.id = mp.patient_id
      LEFT JOIN admissions a ON a.id = mp.admission_id
      LEFT JOIN teams t ON t.id = a.team_id
      LEFT JOIN LATERAL (
        SELECT
          a2.id,
          a2.admission_date,
          a2.bed,
          t2.name AS team_name
        FROM admissions a2
        LEFT JOIN teams t2 ON t2.id = a2.team_id
        WHERE a2.patient_id = mp.patient_id
        ORDER BY a2.admission_date DESC, a2.created_at DESC, a2.id DESC
        LIMIT 1
      ) latest_admission ON TRUE
      LEFT JOIN professionals stock_prof ON stock_prof.id = mp.stock_validation_professional_id
      LEFT JOIN professionals prof ON prof.id = mp.intervention_professional_id
      ${shouldFilterByPatientId ? "WHERE mp.patient_id = $1" : ""}
      ORDER BY mp.created_at DESC, mp.id DESC
    `,
      shouldFilterByPatientId ? [Number(patientId)] : []
    );

    return result.rows.map((row) => mapMedicalPrescription(row as DbRow));
  } finally {
    client.release();
  }
}

function normalizeDashboardSection(
  section?: string | null
): "professional" | "team" | "patient" | "medication" | "interventions" | "validated-medications" | "inpatients" {
  switch (section) {
    case "team":
    case "patient":
    case "medication":
    case "interventions":
    case "validated-medications":
    case "inpatients":
      return section;
    default:
      return "professional";
  }
}

function normalizeDashboardInpatientMode(
  inpatientMode?: string | null
): "all" | "team" | "mandatory" | "trainees" | "discharged" {
  switch (inpatientMode) {
    case "team":
    case "mandatory":
    case "trainees":
    case "discharged":
      return inpatientMode;
    default:
      return "all";
  }
}

export async function getDashboardData(
  currentLogin: string,
  options?: {
    selectedPatientId?: number | null;
    section?: string | null;
    patientView?: string | null;
    inpatientMode?: string | null;
  }
): Promise<DashboardData> {
  await ensureDatabaseReady();
  const selectedPatientId =
    Number.isInteger(options?.selectedPatientId) && Number(options?.selectedPatientId) > 0
      ? Number(options?.selectedPatientId)
      : null;
  const section = normalizeDashboardSection(options?.section);
  const isPatientDetailsPage = section === "inpatients" && selectedPatientId !== null;
  const shouldLoadProfessionals = section === "professional" || section === "inpatients";
  const shouldLoadTeams = section === "team" || section === "patient" || section === "inpatients";
  const shouldLoadPatients = section === "patient" || section === "inpatients";
  const shouldLoadInpatientOverviewEntries = section === "inpatients";
  const shouldLoadRecentAdmissions = isPatientDetailsPage;
  const shouldLoadMedications =
    section === "medication" || section === "patient" || isPatientDetailsPage;
  const shouldLoadPatientAllergies = isPatientDetailsPage;
  const shouldLoadPriorMedications = isPatientDetailsPage;
  const shouldLoadExamImports = isPatientDetailsPage;
  const shouldLoadRoundNotes = isPatientDetailsPage;
  const shouldLoadWorkflow = section === "inpatients";
  const shouldLoadPrescriptions =
    isPatientDetailsPage || section === "interventions" || section === "validated-medications";

  const [
    currentProfessional,
    professionals,
    teams,
    patients,
    inpatientOverviewEntries,
    recentAdmissions,
    medications,
    patientAllergies,
    priorMedications,
    examImports,
    roundNotes,
    inpatientWorkflowSnapshot,
    prescriptions
  ] = await Promise.all([
    findProfessionalByLogin(currentLogin),
    shouldLoadProfessionals ? listProfessionals() : Promise.resolve([]),
    shouldLoadTeams ? listTeams() : Promise.resolve([]),
    shouldLoadPatients
      ? listPatients(isPatientDetailsPage ? selectedPatientId : null, {
          includeLatestDetails: section === "patient" || isPatientDetailsPage || section === "inpatients"
        })
      : Promise.resolve([]),
    shouldLoadInpatientOverviewEntries ? listInpatientOverviewEntries() : Promise.resolve([]),
    shouldLoadRecentAdmissions
      ? listRecentAdmissions(isPatientDetailsPage ? 200 : 80, isPatientDetailsPage ? selectedPatientId : null)
      : Promise.resolve([]),
    shouldLoadMedications ? listMedicationCatalog() : Promise.resolve([]),
    shouldLoadPatientAllergies ? listPatientAllergies(selectedPatientId) : Promise.resolve([]),
    shouldLoadPriorMedications ? listPriorMedications(selectedPatientId) : Promise.resolve([]),
    shouldLoadExamImports
      ? listPatientExamImports(selectedPatientId, { includeRawText: "latest" })
      : Promise.resolve([]),
    shouldLoadRoundNotes ? listAdmissionRoundNotes(selectedPatientId) : Promise.resolve([]),
    shouldLoadWorkflow ? getInpatientWorkflowSnapshotByLogin(currentLogin) : Promise.resolve(null),
    shouldLoadPrescriptions
      ? listMedicalPrescriptions(isPatientDetailsPage ? selectedPatientId : null, {
          backfillInterventionProfessionalLogin: currentLogin,
          backfillValidationProfessionalLogin: currentLogin
        })
      : Promise.resolve([])
  ]);

  const loadedPatient = isPatientDetailsPage ? (patients[0] ?? null) : null;
  if (loadedPatient && selectedPatientId !== null) {
    await recordAuditLogSafely({
      actorLogin: currentLogin,
      action: "patient_dashboard_viewed",
      resourceType: "patient_dashboard",
      resourceId: selectedPatientId,
      patientId: selectedPatientId,
      patientNameSnapshot: loadedPatient.fullName,
      metadata: {
        source: "dashboard_page",
        section,
        patientView: options?.patientView ?? null,
        inpatientMode: options?.inpatientMode ?? null
      }
    });
  }

  return {
    currentProfessional,
    professionals,
    teams,
    patients,
    inpatientOverviewEntries,
    recentAdmissions,
    medications,
    patientAllergies,
    priorMedications,
    examImports,
    roundNotes,
    inpatientWorkflowSnapshot,
    prescriptions,
    loadedPatientDetailsId: isPatientDetailsPage ? selectedPatientId : null
  };
}
