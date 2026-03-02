export const PROFESSION_OPTIONS = [
  "Farmacêutico",
  "Medicina",
  "Enfermagem",
  "Nutrição",
  "Fisioterapia"
] as const;

export const COUNCIL_OPTIONS = ["CRF", "CRM", "COREN", "CRN", "CREFITO"] as const;

export type ProfessionOption = (typeof PROFESSION_OPTIONS)[number];
export type CouncilOption = (typeof COUNCIL_OPTIONS)[number];

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
  bodySurfaceArea: number;
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
  createdAt: string;
};

export type MeasurementHistoryRecord = {
  id: number;
  patientId: number;
  patientName: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bodySurfaceArea: number;
  recordedAt: string;
};

export type DashboardData = {
  currentProfessional: ProfessionalRecord | null;
  professionals: ProfessionalRecord[];
  teams: TeamRecord[];
  patients: PatientRecord[];
  recentAdmissions: AdmissionRecord[];
  recentMeasurements: MeasurementHistoryRecord[];
};
