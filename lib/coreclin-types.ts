export const PROFESSION_OPTIONS = [
  "Farmacêutico",
  "Medicina",
  "Enfermagem",
  "Nutrição",
  "Fisioterapia"
] as const;

export const COUNCIL_OPTIONS = ["CRF", "CRM", "COREN", "CRN", "CREFITO"] as const;

export const BMI_FORMULA_OPTIONS = [
  {
    id: "quetelet",
    label: "Quetelet (Padrão OMS)",
    equation: "IMC = peso(kg) / altura(m)^2"
  },
  {
    id: "trefethen",
    label: "Trefethen",
    equation: "IMC = 1.3 × peso(kg) / altura(m)^2.5"
  }
] as const;

export const BSA_FORMULA_OPTIONS = [
  {
    id: "mosteller",
    label: "Mosteller",
    equation: "SC = √((peso × altura(cm)) / 3600)"
  },
  {
    id: "dubois",
    label: "DuBois & DuBois",
    equation: "SC = 0.007184 × peso^0.425 × altura(cm)^0.725"
  },
  {
    id: "haycock",
    label: "Haycock",
    equation: "SC = 0.024265 × peso^0.5378 × altura(cm)^0.3964"
  }
] as const;

export const MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS = [
  "Aceita",
  "Não aceita",
  "Não se aplica",
  "Não informado"
] as const;
export const PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS = [
  "Realizado",
  "Não realizado",
  "Prescritor não localizado",
  "Contato realizado anteriormente"
] as const;
export const PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS = [
  "Dose incorreta",
  "Forma farmacêutica",
  "Posologia",
  "Aprazamento",
  "Via incorreta",
  "Diluição",
  "Reconstituição",
  "Incompatibilidade",
  "Interações",
  "Legibilidade",
  "Abreviaturas",
  "Duplicidade",
  "Reação alérgica ao medicamento (FC)",
  "Reação adversa ao medicamento (FC)",
  "Medicamento de uso prévio (FC)",
  "Inclusão de medicamento na prescrição (FC)",
  "Medicamento substituído (FC)",
  "Descalonamento de antimicrobiano (FC)",
  "Exclusão de item da prescrição",
  "Escalonamento de antimicrobiano",
  "Outros"
] as const;
export const INTERVIEW_INFORMATION_QUALITY_OPTIONS = ["baixa", "media", "alta"] as const;
export const INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS = ["patient", "informant"] as const;
export const PATIENT_SEX_OPTIONS = ["female", "male"] as const;

export type ProfessionOption = (typeof PROFESSION_OPTIONS)[number];
export type CouncilOption = (typeof COUNCIL_OPTIONS)[number];
export type BmiFormulaId = (typeof BMI_FORMULA_OPTIONS)[number]["id"];
export type BsaFormulaId = (typeof BSA_FORMULA_OPTIONS)[number]["id"];
export type MedicalPrescriptionInterventionResponse =
  (typeof MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS)[number];
export type PrescriptionInterventionContactStatus =
  (typeof PRESCRIPTION_INTERVENTION_CONTACT_OPTIONS)[number];
export type PrescriptionInterventionErrorType =
  (typeof PRESCRIPTION_INTERVENTION_ERROR_TYPE_OPTIONS)[number];
export type InterviewInformationQuality =
  (typeof INTERVIEW_INFORMATION_QUALITY_OPTIONS)[number];
export type InterviewInformationSourceType =
  (typeof INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS)[number];
export type PatientSex = (typeof PATIENT_SEX_OPTIONS)[number];

export type ProfessionalRecord = {
  id: number;
  fullName: string;
  profession: ProfessionOption;
  councilType: CouncilOption;
  councilNumber: string;
  stateUf: string;
  login: string;
  institution: string;
  createdAt: string;
};

export type TeamRecord = {
  id: number;
  name: string;
  createdAt: string;
};

export type InpatientWorkflowStatus = "Visitado" | "Pendente" | "Ausente" | "Alta" | "Concluído";

export type InpatientWorkflowState = {
  status: InpatientWorkflowStatus;
  assignedTeamId: number | null;
  mandatory: boolean;
  firstVisitCompletedAt: string | null;
  evolutionGeneratedAt: string | null;
  updatedByProfessionalName?: string | null;
  updatedByProfessionalLogin?: string | null;
  updatedAt: string;
};

export type InpatientEntrySource = "active" | "manual";

export type InpatientEntry = {
  key: string;
  patientId: number | null;
  patientName: string;
  chartNumber: string;
  reportedAgeYears: number | null;
  admissionDate: string;
  bed: string;
  teamName: string | null;
  teamId: number | null;
  source: InpatientEntrySource;
  createdAt: string;
};

export type InpatientWorkflowStoragePayload = {
  workflowByKey: Record<string, InpatientWorkflowState>;
  trackedEntries: InpatientEntry[];
  priorityTeamIds: number[];
};

export type LatestMeasurement = {
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiFormula: BmiFormulaId;
  bodySurfaceArea: number;
  bsaFormula: BsaFormulaId;
  recordedAt: string;
};

export type PatientRecord = {
  id: number;
  fullName: string;
  chartNumber: string;
  birthDate: string | null;
  ageYears: number | null;
  sex: PatientSex | null;
  responsibleProfessionalId: number;
  responsibleProfessionalName: string;
  responsibleProfessionalLogin: string;
  latestAdmission: AdmissionRecord | null;
  latestMeasurement: LatestMeasurement | null;
};

export type AdmissionRecord = {
  id: number;
  patientId: number;
  patientName: string;
  chartNumber: string;
  admissionDate: string;
  bed: string;
  admissionReason: string;
  admissionSummary: string | null;
  roundSummary: string | null;
  roundSummaryDate: string | null;
  admissionImportExcerpt: string | null;
  interviewInformationQuality: InterviewInformationQuality | null;
  interviewInformationSourceType: InterviewInformationSourceType | null;
  interviewInformationSourceName: string | null;
  interviewInformationSourceRelationship: string | null;
  interviewInterventionMotive: string | null;
  interviewSubjective: string | null;
  interviewRelevantSymptoms: string | null;
  interviewPendingIssues: string | null;
  interviewPlan: string | null;
  teamId: number | null;
  teamName: string | null;
  responsibleProfessionalId: number;
  responsibleProfessionalName: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bmiFormula: BmiFormulaId | null;
  bodySurfaceArea: number | null;
  bsaFormula: BsaFormulaId | null;
  createdAt: string;
};

export type MeasurementHistoryRecord = {
  id: number;
  patientId: number;
  patientName: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiFormula: BmiFormulaId;
  bodySurfaceArea: number;
  bsaFormula: BsaFormulaId;
  recordedAt: string;
};

export type MedicationRecord = {
  id: number;
  name: string;
  defaultUnit: string;
  activeIngredients: string | null;
  therapeuticClass: string | null;
  searchAliases: string | null;
  createdAt: string;
};

export type PatientAllergyRecord = {
  id: number;
  patientId: number;
  patientName: string;
  allergyName: string;
  reactionDescription: string | null;
  createdAt: string;
};

export type PriorMedicationRecord = {
  id: number;
  patientId: number;
  patientName: string;
  medicationId: number | null;
  medicationName: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  shifts: string;
  quantityTablets: number | null;
  lotNumber: string | null;
  expirationDate: string | null;
  manufacturer: string | null;
  reconciliationManualStatus: boolean | null;
  reconciliationPrescriptionId: number | null;
  reconciliationPrescriptionMedicationName: string | null;
  createdAt: string;
};

export type PatientExamResultRecord = {
  key: string;
  examName: string;
  result: string;
  unit: string;
  referenceRange: string;
  pageNumber: number;
  examDate: string | null;
};

export type PatientExamImportRecord = {
  id: number;
  patientId: number;
  patientName: string;
  importedByProfessionalId: number;
  importedByProfessionalName: string;
  fileName: string;
  pageCount: number;
  rawText: string;
  records: PatientExamResultRecord[];
  createdAt: string;
};

export type AdmissionRoundNoteRecord = {
  id: number;
  patientId: number;
  patientName: string;
  admissionId: number;
  roundDate: string;
  note: string;
  responsibleProfessionalId: number;
  responsibleProfessionalName: string;
  createdAt: string;
};

export type MedicalPrescriptionRecord = {
  id: number;
  patientId: number;
  patientName: string;
  chartNumber: string;
  admissionId: number | null;
  admissionDate: string | null;
  bed: string | null;
  teamName: string | null;
  medicationId: number | null;
  medicationName: string;
  dose: number;
  doseUnit: string;
  administrationRoute: string | null;
  frequency: string;
  shifts: string;
  notes: string | null;
  validationStartAt: string | null;
  validationEndAt: string | null;
  validationStatus: string | null;
  externalValidationCandidate: boolean;
  quantityTablets: number | null;
  lotNumber: string | null;
  expirationDate: string | null;
  manufacturer: string | null;
  patientDidNotBring: boolean;
  stockValidationNote: string | null;
  stockValidationRecordedAt: string | null;
  stockValidationProfessionalId: number | null;
  stockValidationProfessionalName: string | null;
  interventionNotes: string | null;
  interventionErrorType: PrescriptionInterventionErrorType | null;
  interventionContactStatus: PrescriptionInterventionContactStatus | null;
  interventionRequestedToPrescriber: boolean | null;
  interventionResponse: MedicalPrescriptionInterventionResponse | null;
  interventionRecordedAt: string | null;
  interventionProfessionalId: number | null;
  interventionProfessionalName: string | null;
  createdAt: string;
};

export type DashboardData = {
  currentProfessional: ProfessionalRecord | null;
  professionals: ProfessionalRecord[];
  teams: TeamRecord[];
  patients: PatientRecord[];
  inpatientOverviewEntries: InpatientEntry[];
  recentAdmissions: AdmissionRecord[];
  medications: MedicationRecord[];
  patientAllergies: PatientAllergyRecord[];
  priorMedications: PriorMedicationRecord[];
  examImports: PatientExamImportRecord[];
  roundNotes: AdmissionRoundNoteRecord[];
  inpatientWorkflowSnapshot: InpatientWorkflowStoragePayload | null;
  prescriptions: MedicalPrescriptionRecord[];
  loadedPatientDetailsId: number | null;
};

export type PatientDashboardDetails = {
  patient: PatientRecord;
  admissions: AdmissionRecord[];
  allergies: PatientAllergyRecord[];
  priorMedications: PriorMedicationRecord[];
  examImports: PatientExamImportRecord[];
  roundNotes: AdmissionRoundNoteRecord[];
  prescriptions: MedicalPrescriptionRecord[];
};
