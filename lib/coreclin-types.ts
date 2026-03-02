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

export type ProfessionOption = (typeof PROFESSION_OPTIONS)[number];
export type CouncilOption = (typeof COUNCIL_OPTIONS)[number];
export type BmiFormulaId = (typeof BMI_FORMULA_OPTIONS)[number]["id"];
export type BsaFormulaId = (typeof BSA_FORMULA_OPTIONS)[number]["id"];

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
  birthDate: string;
  ageYears: number;
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
  createdAt: string;
};

export type PatientAllergyRecord = {
  id: number;
  patientId: number;
  patientName: string;
  allergyName: string;
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
  createdAt: string;
};

export type MedicalPrescriptionRecord = {
  id: number;
  patientId: number;
  patientName: string;
  admissionId: number | null;
  admissionDate: string | null;
  bed: string | null;
  medicationId: number | null;
  medicationName: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  shifts: string;
  notes: string | null;
  createdAt: string;
};

export type DashboardData = {
  currentProfessional: ProfessionalRecord | null;
  professionals: ProfessionalRecord[];
  teams: TeamRecord[];
  patients: PatientRecord[];
  recentAdmissions: AdmissionRecord[];
  recentMeasurements: MeasurementHistoryRecord[];
  medications: MedicationRecord[];
  patientAllergies: PatientAllergyRecord[];
  priorMedications: PriorMedicationRecord[];
  prescriptions: MedicalPrescriptionRecord[];
};
