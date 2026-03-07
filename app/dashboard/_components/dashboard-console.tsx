"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId,
  type CouncilOption,
  type DashboardData,
  type ProfessionOption
} from "@/lib/coreclin-types";

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
  { id: "inpatients", label: "Pacientes internados" }
] as const;

const DASHBOARD_NAV_GROUPS = [
  { label: "Profissionais", items: [{ id: "professional", label: "Cadastrar profissional" }] },
  { label: "Equipe", items: [{ id: "team", label: "Cadastrar equipe" }] },
  { label: "Paciente", items: [{ id: "patient", label: "Cadastrar pacientes" }] },
  { label: "Medicamentos", items: [{ id: "medication", label: "Cadastrar medicamentos" }] }
] as const;

const DASHBOARD_NAV_STANDALONE_ITEMS = [
  { id: "inpatients", label: "Pacientes internados" }
] as const;

const PATIENT_VIEW_ITEMS = [
  { id: "allergies", label: "Alergias" },
  { id: "admission-info", label: "Informações da internação" },
  { id: "prior-use", label: "Medicamentos de uso prévio" },
  { id: "prescriptions", label: "Prescrição médica" }
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

const INPATIENT_STATUS_OPTIONS = ["Pendente", "Concluído", "Alta"] as const;
const INPATIENT_OVERVIEW_ITEMS = [
  { id: "team", label: "Por equipe" },
  { id: "mandatory", label: "Atendimentos obrigatórios" },
  { id: "discharged", label: "Pacientes de alta" }
] as const;
const INPATIENT_WORKFLOW_STORAGE_KEY = "coreclin.inpatient-workflow.v1";
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
  "mg",
  "g",
  "ml",
  "ui",
  "ev",
  "vo",
  "im",
  "iv"
]);
const THERAPEUTIC_CLASS_RELATION_RULES = [
  { allergyToken: "penicilin", classTokens: ["betalactam"] },
  { allergyToken: "cefalospor", classTokens: ["betalactam"] },
  { allergyToken: "carbapen", classTokens: ["betalactam"] },
  { allergyToken: "monobact", classTokens: ["betalactam"] },
  {
    allergyToken: "betalactam",
    classTokens: ["betalactam", "penicilin", "cefalospor", "carbapen", "monobact"]
  }
] as const;

type DashboardSectionId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
type PatientViewId = (typeof PATIENT_VIEW_ITEMS)[number]["id"];
type PrescriptionMode = "view" | "create" | "raw";
type InpatientOverviewMode = "team" | "mandatory" | "discharged";
type InpatientWorkflowStatus = (typeof INPATIENT_STATUS_OPTIONS)[number];
type FeedbackType = "success" | "error";

type InpatientWorkflowState = {
  status: InpatientWorkflowStatus;
  assignedTeamId: number | null;
  mandatory: boolean;
  updatedAt: string;
};

type InpatientEntrySource = "active" | "manual";

type InpatientEntry = {
  key: string;
  patientId: number | null;
  patientName: string;
  chartNumber: string;
  admissionDate: string;
  bed: string;
  teamName: string | null;
  teamId: number | null;
  source: InpatientEntrySource;
  createdAt: string;
};

type InpatientWorkflowStoragePayload = {
  workflowByKey: Record<string, InpatientWorkflowState>;
  trackedEntries: InpatientEntry[];
  priorityTeamIds: number[];
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
  isValid: boolean;
  validationMessage: string;
};

type DashboardConsoleProps = {
  currentLogin: string;
  data: DashboardData | null;
  dbError: string | null;
};

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

function normalizeMedicationName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function normalizeSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
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

  return hasTokenBoundaryMatch(first, second) || hasTokenBoundaryMatch(second, first);
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
  const normalized = normalizeMedicationName(input);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !CONCEPT_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
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

  const directParsed = new Date(trimmed);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.toISOString();
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!brMatch) {
    return null;
  }

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

function isWithinPrescriptionValidity(startAt: string | null, endAt: string | null): boolean {
  if (!startAt || !endAt) {
    return false;
  }

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  return now >= start && now <= end;
}

function areInpatientEntriesEquivalent(first: InpatientEntry, second: InpatientEntry): boolean {
  return (
    first.key === second.key &&
    first.patientId === second.patientId &&
    first.patientName === second.patientName &&
    first.chartNumber === second.chartNumber &&
    first.admissionDate === second.admissionDate &&
    first.bed === second.bed &&
    first.teamName === second.teamName &&
    first.teamId === second.teamId &&
    first.source === second.source
  );
}

export default function DashboardConsole({
  currentLogin,
  data,
  dbError
}: DashboardConsoleProps) {
  const router = useRouter();

  const professionals = data?.professionals ?? [];
  const teams = data?.teams ?? [];
  const patients = data?.patients ?? [];
  const recentAdmissions = data?.recentAdmissions ?? [];
  const medications = data?.medications ?? [];
  const patientAllergies = data?.patientAllergies ?? [];
  const priorMedications = data?.priorMedications ?? [];
  const prescriptions = data?.prescriptions ?? [];
  const currentProfessional = data?.currentProfessional ?? null;

  const [activeSection, setActiveSection] = useState<DashboardSectionId>("professional");
  const [listVisibility, setListVisibility] = useState<Record<DashboardSectionId, boolean>>({
    professional: false,
    team: false,
    patient: false,
    inpatients: true,
    medication: false
  });

  const [professionalForm, setProfessionalForm] = useState({
    fullName: "",
    profession: "Farmacêutico" as ProfessionOption,
    councilType: "CRF" as CouncilOption,
    councilNumber: "",
    stateUf: "RS",
    login: "",
    password: "",
    institution: ""
  });
  const [professionalFeedback, setProfessionalFeedback] = useState<FeedbackState>(null);
  const [professionalLoading, setProfessionalLoading] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [teamFeedback, setTeamFeedback] = useState<FeedbackState>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const [patientForm, setPatientForm] = useState({
    fullName: "",
    chartNumber: "",
    birthDate: "",
    allergies: [] as string[]
  });
  const [patientFeedback, setPatientFeedback] = useState<FeedbackState>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const [patientInitialAllergyForm, setPatientInitialAllergyForm] = useState({
    medicationId: medications[0] ? String(medications[0].id) : ""
  });

  const [admissionForm, setAdmissionForm] = useState({
    admissionDate: "",
    bed: "",
    admissionReason: "",
    teamId: teams[0] ? String(teams[0].id) : "",
    weightKg: "",
    heightCm: "",
    bmiFormula: "quetelet" as BmiFormulaId,
    bsaFormula: "mosteller" as BsaFormulaId
  });
  const [admissionFeedback, setAdmissionFeedback] = useState<FeedbackState>(null);
  const [admissionLoading, setAdmissionLoading] = useState(false);

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
    patients[0] ? String(patients[0].id) : ""
  );
  const [inpatientSearch, setInpatientSearch] = useState("");
  const [inpatientOverviewMode, setInpatientOverviewMode] = useState<InpatientOverviewMode>("team");
  const [inpatientTeamFilter, setInpatientTeamFilter] = useState("all");
  const [mandatoryRawInput, setMandatoryRawInput] = useState("");
  const [mandatoryFeedback, setMandatoryFeedback] = useState<FeedbackState>(null);
  const [workflowByInpatientKey, setWorkflowByInpatientKey] = useState<
    Record<string, InpatientWorkflowState>
  >({});
  const [trackedInpatientEntries, setTrackedInpatientEntries] = useState<InpatientEntry[]>([]);
  const [priorityTeamIds, setPriorityTeamIds] = useState<number[]>([]);
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);
  const [patientView, setPatientView] = useState<PatientViewId>("allergies");
  const [prescriptionMode, setPrescriptionMode] = useState<PrescriptionMode>("view");

  const [allergyForm, setAllergyForm] = useState({
    medicationId: medications[0] ? String(medications[0].id) : ""
  });
  const [allergyFeedback, setAllergyFeedback] = useState<FeedbackState>(null);
  const [allergyLoading, setAllergyLoading] = useState(false);

  const [priorMedicationForm, setPriorMedicationForm] = useState({
    medicationId: "",
    medicationName: "",
    dose: "",
    doseUnit: medications[0]?.defaultUnit ?? "mg",
    frequency: "",
    shifts: ""
  });
  const [manualPriorMedicationOptions, setManualPriorMedicationOptions] = useState<string[]>([]);
  const [priorMedicationFeedback, setPriorMedicationFeedback] = useState<FeedbackState>(null);
  const [priorMedicationLoading, setPriorMedicationLoading] = useState(false);

  const [prescriptionForm, setPrescriptionForm] = useState({
    admissionId: "",
    medicationId: medications[0] ? String(medications[0].id) : "",
    medicationName: "",
    dose: "",
    doseUnit: medications[0]?.defaultUnit ?? "mg",
    administrationRoute: "",
    frequency: "",
    shifts: "",
    notes: ""
  });
  const [prescriptionSetForm, setPrescriptionSetForm] = useState({
    startAt: "",
    endAt: "",
    status: "Validado"
  });
  const [prescriptionFeedback, setPrescriptionFeedback] = useState<FeedbackState>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [rawPrescriptionInput, setRawPrescriptionInput] = useState("");
  const [rawPrescriptionAdmissionId, setRawPrescriptionAdmissionId] = useState("");
  const [rawPrescriptionDrafts, setRawPrescriptionDrafts] = useState<RawPrescriptionDraft[]>([]);
  const [rawPrescriptionFeedback, setRawPrescriptionFeedback] = useState<FeedbackState>(null);
  const [rawPrescriptionLoading, setRawPrescriptionLoading] = useState(false);

  useEffect(() => {
    if (patients.length === 0) {
      setSelectedPatientId("");
      return;
    }

    const hasSelectedPatient = patients.some((patient) => String(patient.id) === selectedPatientId);
    if (!hasSelectedPatient) {
      setSelectedPatientId(String(patients[0].id));
    }
  }, [patients, selectedPatientId]);

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

  useEffect(() => {
    if (medications.length === 0) {
      setAllergyForm({ medicationId: "" });
      return;
    }

    const hasMedication = medications.some(
      (medication) => String(medication.id) === allergyForm.medicationId
    );
    if (!hasMedication) {
      setAllergyForm({ medicationId: String(medications[0].id) });
    }
  }, [medications, allergyForm.medicationId]);

  const agePreview = useMemo(() => calculateAge(patientForm.birthDate), [patientForm.birthDate]);
  const responsibleProfessionalName = currentProfessional?.fullName ?? currentLogin;

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
  const selectedPatient =
    Number.isInteger(selectedPatientNumericId) && selectedPatientNumericId > 0
      ? patients.find((patient) => patient.id === selectedPatientNumericId) ?? null
      : null;

  const inpatients = useMemo<InpatientEntry[]>(() => {
    const uniquePatients = new Map<number, InpatientEntry>();

    for (const admission of recentAdmissions) {
      if (!uniquePatients.has(admission.patientId)) {
        uniquePatients.set(admission.patientId, {
          key: `patient-${admission.patientId}`,
          patientId: admission.patientId,
          patientName: admission.patientName,
          chartNumber: admission.chartNumber,
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
  }, [recentAdmissions]);

  const filteredInpatients = useMemo(() => {
    const searchTerm = normalizeSearchValue(inpatientSearch);
    if (!searchTerm) {
      return inpatients;
    }

    return inpatients.filter((inpatient) =>
      normalizeSearchValue(
        `${inpatient.patientName} ${inpatient.chartNumber} ${inpatient.admissionDate} ${inpatient.bed} ${
          inpatient.teamName ?? ""
        }`
      ).includes(searchTerm)
    );
  }, [inpatients, inpatientSearch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawPayload = window.localStorage.getItem(INPATIENT_WORKFLOW_STORAGE_KEY);
      if (!rawPayload) {
        return;
      }

      const parsedPayload = JSON.parse(rawPayload) as Partial<InpatientWorkflowStoragePayload>;

      if (parsedPayload.workflowByKey && typeof parsedPayload.workflowByKey === "object") {
        setWorkflowByInpatientKey(parsedPayload.workflowByKey as Record<string, InpatientWorkflowState>);
      }

      if (Array.isArray(parsedPayload.trackedEntries)) {
        const validEntries = parsedPayload.trackedEntries
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
              (entry.patientId === null || typeof entry.patientId === "number") &&
              (entry.teamId === null || typeof entry.teamId === "number") &&
              (entry.teamName === null || typeof entry.teamName === "string") &&
              (entry.source === "active" || entry.source === "manual")
            );
          })
          .map((entry) => ({
            ...entry,
            createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString()
          }));

        setTrackedInpatientEntries(validEntries);
      }

      if (Array.isArray(parsedPayload.priorityTeamIds)) {
        setPriorityTeamIds(
          parsedPayload.priorityTeamIds.filter((teamId): teamId is number => typeof teamId === "number")
        );
      }
    } catch {
      // ignore persisted workflow errors and keep default behavior
    }
  }, []);

  useEffect(() => {
    if (inpatients.length === 0) {
      return;
    }

    setTrackedInpatientEntries((current) => {
      const nextByKey = new Map(current.map((entry) => [entry.key, entry]));
      let hasChanges = false;

      for (const inpatient of inpatients) {
        const currentEntry = nextByKey.get(inpatient.key);
        if (!currentEntry || !areInpatientEntriesEquivalent(currentEntry, inpatient)) {
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
          next[inpatient.key] = {
            status: "Pendente",
            assignedTeamId: inpatient.teamId ?? null,
            mandatory: true,
            updatedAt: new Date().toISOString()
          };
          hasChanges = true;
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
    if (typeof window === "undefined") {
      return;
    }

    const payload: InpatientWorkflowStoragePayload = {
      workflowByKey: workflowByInpatientKey,
      trackedEntries: trackedInpatientEntries,
      priorityTeamIds
    };
    window.localStorage.setItem(INPATIENT_WORKFLOW_STORAGE_KEY, JSON.stringify(payload));
  }, [workflowByInpatientKey, trackedInpatientEntries, priorityTeamIds]);

  useEffect(() => {
    if (inpatients.length === 0) {
      return;
    }

    const hasSelectedInpatient = inpatients.some(
      (inpatient) => String(inpatient.patientId) === selectedPatientId
    );
    if (!hasSelectedInpatient) {
      setSelectedPatientId(String(inpatients[0].patientId ?? ""));
      setPatientDetailsOpen(false);
    }
  }, [inpatients, selectedPatientId]);

  const teamNameById = useMemo(() => {
    const lookup = new Map<number, string>();
    for (const team of teams) {
      lookup.set(team.id, team.name);
    }
    return lookup;
  }, [teams]);

  function resolveInpatientWorkflow(entry: InpatientEntry): InpatientWorkflowState {
    return (
      workflowByInpatientKey[entry.key] ?? {
        status: "Pendente",
        assignedTeamId: entry.teamId ?? null,
        mandatory: true,
        updatedAt: entry.createdAt
      }
    );
  }

  const inpatientEntries = useMemo(() => {
    const entriesByKey = new Map<string, InpatientEntry>();
    for (const entry of trackedInpatientEntries) {
      entriesByKey.set(entry.key, entry);
    }
    for (const entry of inpatients) {
      entriesByKey.set(entry.key, entry);
    }
    return Array.from(entriesByKey.values());
  }, [trackedInpatientEntries, inpatients]);

  const inpatientEntriesWithWorkflow = useMemo(
    () =>
      inpatientEntries.map((entry) => {
        const workflow = resolveInpatientWorkflow(entry);
        const assignedTeamName =
          workflow.assignedTeamId !== null ? teamNameById.get(workflow.assignedTeamId) ?? null : null;
        const isPriorityTeam =
          workflow.assignedTeamId !== null && priorityTeamIds.includes(workflow.assignedTeamId);
        return {
          entry,
          workflow,
          assignedTeamName,
          isPriorityTeam
        };
      }),
    [inpatientEntries, workflowByInpatientKey, teamNameById, priorityTeamIds]
  );

  const teamOverviewRows = useMemo(() => {
    const filtered = inpatientEntriesWithWorkflow
      .filter(({ workflow }) => workflow.status !== "Alta")
      .filter(({ workflow }) => {
        if (inpatientTeamFilter === "all") {
          return true;
        }
        if (inpatientTeamFilter === "without-team") {
          return workflow.assignedTeamId === null;
        }
        const teamId = Number(inpatientTeamFilter);
        if (!Number.isInteger(teamId)) {
          return true;
        }
        return workflow.assignedTeamId === teamId;
      });

    return filtered.sort((first, second) => {
      const firstPriority = first.isPriorityTeam ? 0 : 1;
      const secondPriority = second.isPriorityTeam ? 0 : 1;
      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

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
    () =>
      inpatientEntriesWithWorkflow
        .filter(({ workflow }) => workflow.mandatory && workflow.status === "Pendente")
        .sort((first, second) => first.entry.patientName.localeCompare(second.entry.patientName, "pt-BR")),
    [inpatientEntriesWithWorkflow]
  );

  const dischargedOverviewRows = useMemo(
    () =>
      inpatientEntriesWithWorkflow
        .filter(({ workflow }) => workflow.status === "Alta" || workflow.status === "Concluído")
        .sort((first, second) => {
          const firstUpdated = new Date(first.workflow.updatedAt).getTime();
          const secondUpdated = new Date(second.workflow.updatedAt).getTime();
          return secondUpdated - firstUpdated;
        }),
    [inpatientEntriesWithWorkflow]
  );

  const selectedPatientAdmissions = useMemo(
    () =>
      recentAdmissions.filter(
        (admission) => selectedPatient !== null && admission.patientId === selectedPatient.id
      ),
    [recentAdmissions, selectedPatient]
  );

  const selectedPatientAllergies = useMemo(
    () =>
      patientAllergies.filter(
        (allergy) => selectedPatient !== null && allergy.patientId === selectedPatient.id
      ),
    [patientAllergies, selectedPatient]
  );

  const medicationDescriptors = useMemo(
    () =>
      medications.map((medication) => {
        const activeIngredientTerms = splitCatalogTerms(medication.activeIngredients ?? "");
        const aliasTerms = splitCatalogTerms(medication.searchAliases ?? "");
        const normalizedClass = normalizeMedicationName(medication.therapeuticClass ?? "");

        return {
          medication,
          normalizedName: normalizeMedicationName(medication.name),
          normalizedClass,
          activeIngredientTerms,
          classTerms: splitCatalogTerms((medication.therapeuticClass ?? "").replace(/-/g, ";")),
          aliasTerms
        };
      }),
    [medications]
  );

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

  function hasTherapeuticClassRelation(allergyNormalized: string, classNormalized: string): boolean {
    if (!allergyNormalized || !classNormalized) {
      return false;
    }

    if (hasConceptTermMatch(classNormalized, allergyNormalized)) {
      return true;
    }

    for (const rule of THERAPEUTIC_CLASS_RELATION_RULES) {
      if (!allergyNormalized.includes(rule.allergyToken)) {
        continue;
      }
      if (rule.classTokens.some((classToken) => classNormalized.includes(classToken))) {
        return true;
      }
    }

    return false;
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

      if (isMedicationNameCompatible(medicationName, allergy.allergyName)) {
        return {
          allergyName: allergy.allergyName,
          kind: "direct",
          detail: allergy.allergyName
        };
      }

      for (const descriptor of prescribedDescriptors) {
        const ingredientMatch = descriptor.activeIngredientTerms.find((ingredientTerm) =>
          hasConceptTermMatch(ingredientTerm.normalized, normalizedAllergy)
        );
        if (ingredientMatch) {
          return {
            allergyName: allergy.allergyName,
            kind: "active-ingredient",
            detail: ingredientMatch.raw
          };
        }
      }

      const allergyDescriptors = findMedicationDescriptorsByText(allergy.allergyName);

      for (const prescribedDescriptor of prescribedDescriptors) {
        for (const allergyDescriptor of allergyDescriptors) {
          for (const allergyIngredientTerm of allergyDescriptor.activeIngredientTerms) {
            const ingredientOverlap = prescribedDescriptor.activeIngredientTerms.find(
              (prescribedIngredientTerm) =>
                hasConceptTermMatch(
                  prescribedIngredientTerm.normalized,
                  allergyIngredientTerm.normalized
                )
            );
            if (ingredientOverlap) {
              return {
                allergyName: allergy.allergyName,
                kind: "active-ingredient",
                detail: ingredientOverlap.raw
              };
            }
          }

          if (
            allergyDescriptor.normalizedClass &&
            hasTherapeuticClassRelation(
              allergyDescriptor.normalizedClass,
              prescribedDescriptor.normalizedClass
            )
          ) {
            return {
              allergyName: allergy.allergyName,
              kind: "therapeutic-class",
              detail:
                prescribedDescriptor.medication.therapeuticClass ??
                allergyDescriptor.medication.therapeuticClass ??
                allergy.allergyName
            };
          }
        }

        if (
          prescribedDescriptor.normalizedClass &&
          hasTherapeuticClassRelation(normalizedAllergy, prescribedDescriptor.normalizedClass)
        ) {
          return {
            allergyName: allergy.allergyName,
            kind: "therapeutic-class",
            detail: prescribedDescriptor.medication.therapeuticClass ?? allergy.allergyName
          };
        }

        const classTokenMatch = prescribedDescriptor.classTerms.find((classTerm) =>
          hasConceptTermMatch(classTerm.normalized, normalizedAllergy)
        );
        if (classTokenMatch) {
          return {
            allergyName: allergy.allergyName,
            kind: "therapeutic-class",
            detail: classTokenMatch.raw
          };
        }
      }
    }

    return null;
  }

  const selectedInitialAllergyMedication = useMemo(
    () =>
      medications.find(
        (medication) => String(medication.id) === patientInitialAllergyForm.medicationId
      ) ?? null,
    [medications, patientInitialAllergyForm.medicationId]
  );

  const selectedAllergyMedication = useMemo(
    () =>
      medications.find(
        (medication) => String(medication.id) === allergyForm.medicationId
      ) ?? null,
    [medications, allergyForm.medicationId]
  );

  function findCatalogMedicationMatchByName(medicationName: string) {
    const normalizedName = normalizeMedicationName(medicationName);
    if (!normalizedName) {
      return null;
    }

    const directMatch = medicationDescriptors.find((descriptor) => {
      if (descriptor.normalizedName === normalizedName) {
        return true;
      }

      if (isMedicationNameCompatible(descriptor.medication.name, medicationName)) {
        return true;
      }

      return descriptor.aliasTerms.some((aliasTerm) =>
        hasConceptTermMatch(aliasTerm.normalized, normalizedName)
      );
    });

    if (directMatch) {
      return directMatch.medication;
    }

    const ingredientMatches = medicationDescriptors.filter((descriptor) =>
      descriptor.activeIngredientTerms.some((ingredientTerm) =>
        hasConceptTermMatch(ingredientTerm.normalized, normalizedName)
      )
    );

    if (ingredientMatches.length === 1) {
      return ingredientMatches[0].medication;
    }

    return null;
  }

  const selectedPatientPriorMedications = useMemo(
    () =>
      priorMedications.filter(
        (medication) => selectedPatient !== null && medication.patientId === selectedPatient.id
      ),
    [priorMedications, selectedPatient]
  );

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
      prescriptions.filter(
        (prescription) => selectedPatient !== null && prescription.patientId === selectedPatient.id
      ),
    [prescriptions, selectedPatient]
  );

  const prescriptionMedicationNameForAlert = useMemo(() => {
    if (prescriptionForm.medicationId) {
      const selectedMedication = medications.find(
        (medication) => String(medication.id) === prescriptionForm.medicationId
      );
      if (selectedMedication) {
        return selectedMedication.name;
      }
    }
    return prescriptionForm.medicationName.trim();
  }, [prescriptionForm.medicationId, prescriptionForm.medicationName, medications]);

  const prescriptionAllergyConflict = useMemo(
    () => resolveAllergyConflict(prescriptionMedicationNameForAlert),
    [prescriptionMedicationNameForAlert, selectedPatientAllergies, medicationDescriptors]
  );

  const selectedPatientPrescriptionGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        admissionDate: string | null;
        bed: string | null;
        validationStartAt: string | null;
        validationEndAt: string | null;
        validationStatus: string | null;
        prescriptions: typeof selectedPatientPrescriptions;
      }
    >();

    for (const prescription of selectedPatientPrescriptions) {
      const key = [
        prescription.admissionId ?? "sem-admissao",
        prescription.validationStartAt ?? "sem-inicio",
        prescription.validationEndAt ?? "sem-fim",
        prescription.validationStatus ?? "sem-status"
      ].join("|");

      const currentGroup = groups.get(key);
      if (currentGroup) {
        currentGroup.prescriptions.push(prescription);
        continue;
      }

      groups.set(key, {
        key,
        admissionDate: prescription.admissionDate,
        bed: prescription.bed,
        validationStartAt: prescription.validationStartAt,
        validationEndAt: prescription.validationEndAt,
        validationStatus: prescription.validationStatus,
        prescriptions: [prescription]
      });
    }

    return Array.from(groups.values()).sort((firstGroup, secondGroup) => {
      const firstTime = firstGroup.validationStartAt
        ? new Date(firstGroup.validationStartAt).getTime()
      : 0;
      const secondTime = secondGroup.validationStartAt
        ? new Date(secondGroup.validationStartAt).getTime()
      : 0;
      return secondTime - firstTime;
    });
  }, [selectedPatientPrescriptions]);

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
        isMedicationNameCompatible(prescription.medicationName, medicationName)
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

  const priorMedicationRows = useMemo(
    () =>
      selectedPatientPriorMedications.map((priorMedication) => {
        const history = selectedPatientPrescriptionGroups.map((group) => {
          const prescriptionDate =
            group.validationStartAt ?? group.validationEndAt ?? group.prescriptions[0]?.createdAt ?? null;
          const reconciled = group.prescriptions.some((prescription) =>
            isMedicationNameCompatible(prescription.medicationName, priorMedication.medicationName)
          );
          return {
            key: group.key,
            prescriptionDate,
            reconciled
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

  useEffect(() => {
    if (!rawPrescriptionAdmissionId) {
      return;
    }

    const hasAdmission = selectedPatientAdmissions.some(
      (admission) => String(admission.id) === rawPrescriptionAdmissionId
    );
    if (!hasAdmission) {
      setRawPrescriptionAdmissionId("");
    }
  }, [rawPrescriptionAdmissionId, selectedPatientAdmissions]);

  const prescriptionSetStartAt = normalizeHospitalDateTime(prescriptionSetForm.startAt);
  const prescriptionSetEndAt = normalizeHospitalDateTime(prescriptionSetForm.endAt);
  const prescriptionSetStatus = prescriptionSetForm.status.trim() || "Validado";

  function toggleList(sectionId: DashboardSectionId): void {
    setListVisibility((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  function openPatientDetails(patientId: number, targetView: PatientViewId = "admission-info"): void {
    setActiveSection("inpatients");
    setListVisibility((current) => ({ ...current, inpatients: true }));
    setSelectedPatientId(String(patientId));
    setPatientView(targetView);
    setPatientDetailsOpen(true);
  }

  function buildRawPrescriptionDrafts(
    rawInput: string,
    sharedSet: { startAt: string; endAt: string; status: string }
  ): RawPrescriptionDraft[] {
    const lines = rawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line, index) => {
      const tabParts = line.split("\t").map((part) => part.trim()).filter((part) => part.length > 0);
      const prescriptionContent = tabParts[0] ?? line;
      const hasInlineSet = tabParts.length >= 4;
      const validationStartRaw = hasInlineSet ? (tabParts[1] ?? "") : sharedSet.startAt;
      const validationEndRaw = hasInlineSet ? (tabParts[2] ?? "") : sharedSet.endAt;
      const validationStatus = (hasInlineSet ? tabParts[3] : sharedSet.status).trim() || "Validado";
      const validationStartAt = normalizeHospitalDateTime(validationStartRaw);
      const validationEndAt = normalizeHospitalDateTime(validationEndRaw);

      let medicationName = "";
      let parsedDose = { dose: null as number | null, doseUnit: "" };
      let administrationRoute = "";
      let frequency = "";
      let shifts = "";
      let notes = "";

      const hospitalPattern = prescriptionContent.match(/^(.*?)\s+-\s+Administrar\s+(.+)$/i);
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
        const splitParts = prescriptionContent.includes(";")
          ? prescriptionContent.split(";")
          : prescriptionContent.includes("|")
            ? prescriptionContent.split("|")
            : prescriptionContent.split(/\s+-\s+/);
        const parts = splitParts.map((part) => part.trim()).filter((part) => part.length > 0);
        medicationName = (parts[0] ?? "").replace(/^\([^)]*\)\s*/, "").trim();
        parsedDose = parseDosePart(parts[1] ?? "");
        administrationRoute = parts[2] ?? "";
        frequency = parts[3] ?? "";
        shifts = parts[4] ?? "";
        notes = parts[5] ?? "";
      }

      const matchedMedication = findCatalogMedicationMatchByName(medicationName);
      const allergyConflict = resolveAllergyConflict(medicationName);

      const fallbackUnit = matchedMedication?.defaultUnit ?? "";
      const doseUnit = parsedDose.doseUnit || fallbackUnit;

      let validationMessage = "";
      if (!medicationName) {
        validationMessage = "Nome do medicamento ausente.";
      } else if (!parsedDose.dose || parsedDose.dose <= 0) {
        validationMessage = "Dose inválida.";
      } else if (!doseUnit) {
        validationMessage = "Unidade da dose ausente.";
      } else if (!administrationRoute) {
        validationMessage = "Via de administração ausente.";
      } else if (!frequency) {
        validationMessage = "Frequência ausente.";
      } else if (!validationStartRaw || !validationEndRaw) {
        validationMessage = "Defina data de início e data de fim da vigência da prescrição.";
      } else if (!validationStartAt || !validationEndAt) {
        validationMessage = "Formato de data inválido. Use dd/mm/aaaa hh:mm.";
      }

      return {
        lineNumber: index + 1,
        rawLine: line,
        medicationId: matchedMedication?.id ?? null,
        medicationName,
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
        isValid: validationMessage.length === 0,
        validationMessage: validationMessage || "Linha pronta para importação."
      };
    });
  }

  function handleProcessRawPrescription(): void {
    setRawPrescriptionFeedback(null);
    const drafts = buildRawPrescriptionDrafts(rawPrescriptionInput, prescriptionSetForm);

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

  async function handleProfessionalSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setProfessionalFeedback(null);
    setProfessionalLoading(true);

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(professionalForm)
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setProfessionalFeedback({
          type: "error",
          message: result.message ?? "Não foi possível cadastrar o profissional."
        });
        return;
      }

      setProfessionalFeedback({ type: "success", message: "Profissional cadastrado com sucesso." });
      setProfessionalForm({
        fullName: "",
        profession: "Farmacêutico",
        councilType: "CRF",
        councilNumber: "",
        stateUf: "RS",
        login: "",
        password: "",
        institution: ""
      });
      router.refresh();
    } catch {
      setProfessionalFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar profissional."
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

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setTeamFeedback({ type: "error", message: result.message ?? "Falha ao cadastrar equipe." });
        return;
      }

      setTeamFeedback({ type: "success", message: "Equipe cadastrada com sucesso." });
      setTeamName("");
      router.refresh();
    } catch {
      setTeamFeedback({ type: "error", message: "Erro de conexão ao cadastrar equipe." });
    } finally {
      setTeamLoading(false);
    }
  }

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPatientFeedback(null);
    setPatientLoading(true);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientForm)
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
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
        allergies: []
      });
      setPatientInitialAllergyForm({
        medicationId: medications[0] ? String(medications[0].id) : ""
      });
      router.refresh();
    } catch {
      setPatientFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar paciente."
      });
    } finally {
      setPatientLoading(false);
    }
  }

  async function handleAdmissionSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAdmissionFeedback(null);

    if (!selectedPatient) {
      setAdmissionFeedback({
        type: "error",
        message: "Selecione um paciente internado para cadastrar a internação."
      });
      return;
    }

    setAdmissionLoading(true);

    try {
      const response = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...admissionForm,
          patientId: selectedPatient.id,
          teamId: Number(admissionForm.teamId),
          weightKg: Number(admissionForm.weightKg),
          heightCm: Number(admissionForm.heightCm)
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAdmissionFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar internação."
        });
        return;
      }

      setAdmissionFeedback({ type: "success", message: "Internação cadastrada com sucesso." });
      setAdmissionForm({
        admissionDate: "",
        bed: "",
        admissionReason: "",
        teamId: teams[0] ? String(teams[0].id) : "",
        weightKg: "",
        heightCm: "",
        bmiFormula: "quetelet",
        bsaFormula: "mosteller"
      });
      router.refresh();
    } catch {
      setAdmissionFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar internação."
      });
    } finally {
      setAdmissionLoading(false);
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

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
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
      router.refresh();
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
      router.refresh();
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

    const allergyName = selectedAllergyMedication?.name ?? "";

    if (!allergyName) {
      setAllergyFeedback({
        type: "error",
        message: "Selecione um medicamento cadastrado para registrar a alergia."
      });
      return;
    }

    setAllergyLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/allergies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergyName })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAllergyFeedback({ type: "error", message: result.message ?? "Falha ao cadastrar alergia." });
        return;
      }

      setAllergyFeedback({ type: "success", message: "Alergia cadastrada com sucesso." });
      setAllergyForm({ medicationId: medications[0] ? String(medications[0].id) : "" });
      router.refresh();
    } catch {
      setAllergyFeedback({ type: "error", message: "Erro de conexão ao cadastrar alergia." });
    } finally {
      setAllergyLoading(false);
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

    setPriorMedicationLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prior-medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: medicationIdToSave,
          medicationName: medicationNameToSave,
          dose: Number(priorMedicationForm.dose),
          doseUnit: priorMedicationForm.doseUnit,
          frequency: priorMedicationForm.frequency,
          shifts: priorMedicationForm.shifts
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
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
        shifts: ""
      }));
      router.refresh();
    } catch {
      setPriorMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar medicamento de uso prévio."
      });
    } finally {
      setPriorMedicationLoading(false);
    }
  }

  async function handlePrescriptionSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPrescriptionFeedback(null);

    if (!selectedPatient) {
      setPrescriptionFeedback({ type: "error", message: "Selecione um paciente para cadastrar prescrição." });
      return;
    }

    if (!prescriptionSetStartAt || !prescriptionSetEndAt) {
      setPrescriptionFeedback({
        type: "error",
        message: "Defina a data de início e a data de fim da vigência do conjunto da prescrição."
      });
      return;
    }

    setPrescriptionLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionId: prescriptionForm.admissionId,
          medicationId: prescriptionForm.medicationId,
          medicationName: prescriptionForm.medicationName,
          dose: Number(prescriptionForm.dose),
          doseUnit: prescriptionForm.doseUnit,
          administrationRoute: prescriptionForm.administrationRoute,
          frequency: prescriptionForm.frequency,
          shifts: prescriptionForm.shifts,
          notes: prescriptionForm.notes,
          validationStartAt: prescriptionSetStartAt,
          validationEndAt: prescriptionSetEndAt,
          validationStatus: prescriptionSetStatus
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPrescriptionFeedback({
          type: "error",
          message: result.message ?? "Falha ao cadastrar prescrição médica."
        });
        return;
      }

      setPrescriptionFeedback({ type: "success", message: "Prescrição médica cadastrada com sucesso." });
      setPrescriptionForm((current) => ({
        ...current,
        medicationName: "",
        dose: "",
        frequency: "",
        shifts: "",
        notes: "",
        administrationRoute: ""
      }));
      setPrescriptionMode("view");
      router.refresh();
    } catch {
      setPrescriptionFeedback({
        type: "error",
        message: "Erro de conexão ao cadastrar prescrição médica."
      });
    } finally {
      setPrescriptionLoading(false);
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
      const failedLines: number[] = [];
      for (const draft of validDrafts) {
        const response = await fetch(`/api/patients/${selectedPatient.id}/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admissionId: rawPrescriptionAdmissionId || undefined,
            medicationId: draft.medicationId ?? undefined,
            medicationName: draft.medicationName,
            dose: draft.dose,
            doseUnit: draft.doseUnit,
            administrationRoute: draft.administrationRoute,
            frequency: draft.frequency,
            shifts: draft.shifts,
            notes: draft.notes,
            validationStartAt: draft.validationStartAt ?? prescriptionSetStartAt ?? undefined,
            validationEndAt: draft.validationEndAt ?? prescriptionSetEndAt ?? undefined,
            validationStatus: draft.validationStatus || prescriptionSetStatus
          })
        });

        if (!response.ok) {
          failedLines.push(draft.lineNumber);
        }
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
        router.refresh();
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

  function handlePrescriptionCatalogChange(nextMedicationId: string): void {
    const selectedCatalogMedication = medications.find(
      (medication) => String(medication.id) === nextMedicationId
    );

    setPrescriptionForm((current) => ({
      ...current,
      medicationId: nextMedicationId,
      medicationName: selectedCatalogMedication ? selectedCatalogMedication.name : current.medicationName,
      doseUnit: selectedCatalogMedication ? selectedCatalogMedication.defaultUnit : current.doseUnit
    }));
  }

  function handleInpatientStatusChange(
    inpatientKey: string,
    nextStatus: InpatientWorkflowStatus
  ): void {
    setWorkflowByInpatientKey((current) => {
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: null,
        mandatory: true,
        updatedAt: new Date().toISOString()
      };
      const currentWorkflow = current[inpatientKey] ?? fallbackWorkflow;
      const nextWorkflow: InpatientWorkflowState = {
        ...currentWorkflow,
        status: nextStatus,
        mandatory: nextStatus === "Pendente",
        updatedAt: new Date().toISOString()
      };

      if (
        currentWorkflow.status === nextWorkflow.status &&
        currentWorkflow.mandatory === nextWorkflow.mandatory &&
        currentWorkflow.assignedTeamId === nextWorkflow.assignedTeamId
      ) {
        return current;
      }

      return {
        ...current,
        [inpatientKey]: nextWorkflow
      };
    });
  }

  function handleInpatientTeamChange(inpatientKey: string, nextTeamValue: string): void {
    const parsedTeamId = Number(nextTeamValue);
    const nextTeamId = Number.isInteger(parsedTeamId) && parsedTeamId > 0 ? parsedTeamId : null;

    setWorkflowByInpatientKey((current) => {
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: null,
        mandatory: true,
        updatedAt: new Date().toISOString()
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
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function togglePriorityTeam(teamId: number): void {
    setPriorityTeamIds((current) =>
      current.includes(teamId) ? current.filter((existingId) => existingId !== teamId) : [...current, teamId]
    );
  }

  function handleMandatoryRawImport(): void {
    setMandatoryFeedback(null);

    const rawLines = mandatoryRawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) {
      setMandatoryFeedback({
        type: "error",
        message: "Cole ao menos uma linha para tratar os atendimentos obrigatórios."
      });
      return;
    }

    const currentEntries = new Map(inpatientEntries.map((entry) => [entry.key, entry]));
    const entriesByChart = new Map<string, InpatientEntry>();
    const entriesByName = new Map<string, InpatientEntry>();
    for (const entry of inpatientEntries) {
      const normalizedChart = normalizeSearchValue(entry.chartNumber);
      const normalizedName = normalizeSearchValue(entry.patientName);
      if (normalizedChart && !entriesByChart.has(normalizedChart)) {
        entriesByChart.set(normalizedChart, entry);
      }
      if (normalizedName && !entriesByName.has(normalizedName)) {
        entriesByName.set(normalizedName, entry);
      }
    }

    const nextManualEntries: InpatientEntry[] = [];
    const entriesToPending = new Map<string, number | null>();
    let linkedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (const [index, rawLine] of rawLines.entries()) {
      const parts = rawLine
        .split(/\t|;|\|/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const patientName = parts[0] ?? "";
      const chartNumber = parts[1] ?? "";
      const bed = parts[2] ?? "";
      const teamNameRaw = parts[3] ?? "";

      if (!patientName) {
        skippedCount += 1;
        continue;
      }

      const normalizedChart = normalizeSearchValue(chartNumber);
      const normalizedName = normalizeSearchValue(patientName);

      const existingEntry =
        (normalizedChart ? entriesByChart.get(normalizedChart) : null) ??
        (normalizedName ? entriesByName.get(normalizedName) : null) ??
        null;

      const matchedTeam = teams.find((team) => {
        const normalizedTeamName = normalizeSearchValue(team.name);
        const normalizedRawTeamName = normalizeSearchValue(teamNameRaw);
        return (
          normalizedRawTeamName.length > 0 &&
          (normalizedTeamName === normalizedRawTeamName ||
            normalizedTeamName.includes(normalizedRawTeamName) ||
            normalizedRawTeamName.includes(normalizedTeamName))
        );
      });
      const parsedTeamId = matchedTeam?.id ?? null;

      if (existingEntry) {
        entriesToPending.set(
          existingEntry.key,
          parsedTeamId ?? resolveInpatientWorkflow(existingEntry).assignedTeamId
        );
        linkedCount += 1;
        continue;
      }

      const keyBase = normalizeMedicationName(`${patientName} ${chartNumber || index + 1}`) || `item-${index + 1}`;
      let nextKey = `manual-${keyBase}`;
      let iteration = 1;
      while (currentEntries.has(nextKey) || nextManualEntries.some((entry) => entry.key === nextKey)) {
        iteration += 1;
        nextKey = `manual-${keyBase}-${iteration}`;
      }

      nextManualEntries.push({
        key: nextKey,
        patientId: null,
        patientName,
        chartNumber,
        admissionDate: new Date().toISOString().slice(0, 10),
        bed,
        teamName: matchedTeam?.name ?? (teamNameRaw || null),
        teamId: parsedTeamId,
        source: "manual",
        createdAt: new Date().toISOString()
      });
      entriesToPending.set(nextKey, parsedTeamId);
      createdCount += 1;
    }

    if (createdCount === 0 && linkedCount === 0) {
      setMandatoryFeedback({
        type: "error",
        message: "Nenhuma linha válida encontrada. Use: Nome;Prontuário;Leito;Equipe."
      });
      return;
    }

    if (nextManualEntries.length > 0) {
      setTrackedInpatientEntries((current) => {
        const nextByKey = new Map(current.map((entry) => [entry.key, entry]));
        for (const manualEntry of nextManualEntries) {
          nextByKey.set(manualEntry.key, manualEntry);
        }
        return Array.from(nextByKey.values());
      });
    }

    setWorkflowByInpatientKey((current) => {
      const next = { ...current };
      let hasChanges = false;
      for (const [entryKey, assignedTeamId] of entriesToPending.entries()) {
        const currentWorkflow = next[entryKey];
        const fallbackWorkflow: InpatientWorkflowState = {
          status: "Pendente",
          assignedTeamId: null,
          mandatory: true,
          updatedAt: new Date().toISOString()
        };
        const baseWorkflow = currentWorkflow ?? fallbackWorkflow;
        const updatedWorkflow: InpatientWorkflowState = {
          ...baseWorkflow,
          status: "Pendente",
          mandatory: true,
          assignedTeamId: assignedTeamId ?? baseWorkflow.assignedTeamId,
          updatedAt: new Date().toISOString()
        };
        if (
          !currentWorkflow ||
          currentWorkflow.status !== updatedWorkflow.status ||
          currentWorkflow.mandatory !== updatedWorkflow.mandatory ||
          currentWorkflow.assignedTeamId !== updatedWorkflow.assignedTeamId
        ) {
          next[entryKey] = updatedWorkflow;
          hasChanges = true;
        }
      }
      return hasChanges ? next : current;
    });

    setMandatoryRawInput("");
    setMandatoryFeedback({
      type: "success",
      message: `${createdCount} paciente(s) novo(s) adicionado(s), ${linkedCount} já existente(s) mantido(s) como obrigatório(s).${skippedCount > 0 ? ` ${skippedCount} linha(s) ignorada(s).` : ""}`
    });
  }

  return (
    <section className="dashboard-panel">
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
          <section className="dashboard-card dashboard-highlight">
            <h2>Profissional logado</h2>
            <p>
              <strong>{responsibleProfessionalName}</strong> é o farmacêutico responsável padrão para novos
              registros.
            </p>
          </section>

          <div className="dashboard-layout">
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
                        onClick={() => setActiveSection(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </section>
                ))}

                <div className="dashboard-sidebar-separator" />

                {DASHBOARD_NAV_STANDALONE_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dashboard-sidebar-link ${activeSection === item.id ? "is-active" : ""}`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="dashboard-content">
              {activeSection === "professional" ? (
                <section className="dashboard-card">
                  <h2>Cadastrar Profissional</h2>
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
                    </div>

                    <div className="dashboard-two-columns">
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
                      <select
                        value={professionalForm.stateUf}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({ ...current, stateUf: event.target.value }))
                        }
                      >
                        {UF_OPTIONS.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>

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
                        placeholder="Senha"
                        value={professionalForm.password}
                        onChange={(event) =>
                          setProfessionalForm((current) => ({ ...current, password: event.target.value }))
                        }
                        required
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

                    <button type="submit" disabled={professionalLoading}>
                      {professionalLoading ? "Salvando..." : "Salvar profissional"}
                    </button>
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
                                <th>Profissão</th>
                                <th>Conselho</th>
                                <th>Login</th>
                                <th>Instituição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {professionals.map((professional) => (
                                <tr key={professional.id}>
                                  <td>{professional.fullName}</td>
                                  <td>{professional.profession}</td>
                                  <td>
                                    {professional.councilType}/{professional.stateUf}: {professional.councilNumber}
                                  </td>
                                  <td>{professional.login}</td>
                                  <td>{professional.institution}</td>
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
                          {teams.map((team) => (
                            <li key={team.id}>{team.name}</li>
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
                        type="date"
                        value={patientForm.birthDate}
                        onChange={(event) =>
                          setPatientForm((current) => ({ ...current, birthDate: event.target.value }))
                        }
                        required
                      />
                      <input value={agePreview === null ? "Idade" : `${agePreview} anos`} disabled />
                    </div>

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
                                  <td>{patient.ageYears} anos</td>
                                  <td>{patient.responsibleProfessionalName}</td>
                                  <td>{patient.latestAdmission ? patient.latestAdmission.admissionDate : "-"}</td>
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
                      <h2>Pacientes Internados</h2>
                      <div className="dashboard-list-box">
                        <button
                          type="button"
                          className="dashboard-list-toggle"
                          onClick={() => toggleList("inpatients")}
                        >
                          {listVisibility.inpatients
                            ? "Ocultar pacientes internados"
                            : "Ver pacientes internados"}
                        </button>
                        {listVisibility.inpatients ? (
                          inpatients.length === 0 ? (
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
                                          <td>{inpatient.admissionDate}</td>
                                          <td>{inpatient.bed}</td>
                                          <td>{inpatient.teamName ?? "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          )
                        ) : null}
                      </div>

                      <section className="dashboard-subsection">
                        <h3>Gestão de internados</h3>
                        <div className="dashboard-inline-actions">
                          {INPATIENT_OVERVIEW_ITEMS.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`dashboard-mini-button ${
                                inpatientOverviewMode === item.id ? "is-active" : ""
                              }`}
                              onClick={() => setInpatientOverviewMode(item.id)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {inpatientOverviewMode === "team" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Pacientes por equipe</h3>
                            <p className="dashboard-muted">
                              Defina equipe, status e equipes prioritárias. O paciente permanece em equipe até
                              status Alta.
                            </p>

                            <div className="dashboard-two-columns">
                              <select
                                value={inpatientTeamFilter}
                                onChange={(event) => setInpatientTeamFilter(event.target.value)}
                              >
                                <option value="all">Todas as equipes</option>
                                <option value="without-team">Sem equipe</option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={`Equipes prioritárias: ${priorityTeamIds.length}`}
                                disabled
                                aria-label="Quantidade de equipes prioritárias"
                              />
                            </div>

                            <div className="dashboard-inline-actions">
                              {teams.length === 0 ? (
                                <p className="dashboard-muted">Cadastre equipes para definir prioridades.</p>
                              ) : (
                                teams.map((team) => (
                                  <button
                                    key={team.id}
                                    type="button"
                                    className={`dashboard-mini-button ${
                                      priorityTeamIds.includes(team.id) ? "is-active" : ""
                                    }`}
                                    onClick={() => togglePriorityTeam(team.id)}
                                  >
                                    {priorityTeamIds.includes(team.id) ? "Prioritária: " : ""}
                                    {team.name}
                                  </button>
                                ))
                              )}
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
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={6}>Nenhum paciente encontrado para este filtro.</td>
                                    </tr>
                                  ) : (
                                    teamOverviewRows.map(({ entry, workflow, isPriorityTeam }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{entry.bed || "-"}</td>
                                        <td>
                                          <select
                                            className="dashboard-table-select"
                                            value={workflow.assignedTeamId ?? ""}
                                            onChange={(event) =>
                                              handleInpatientTeamChange(entry.key, event.target.value)
                                            }
                                          >
                                            <option value="">Sem equipe</option>
                                            {teams.map((team) => (
                                              <option key={team.id} value={team.id}>
                                                {team.name}
                                              </option>
                                            ))}
                                          </select>
                                          {isPriorityTeam ? (
                                            <span className="dashboard-status-pill is-valid">Prioritária</span>
                                          ) : null}
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
                        ) : null}

                        {inpatientOverviewMode === "mandatory" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Atendimentos obrigatórios</h3>
                            <p className="dashboard-muted">
                              Somente sai desta lista quando o status for Concluído ou Alta.
                            </p>

                            <div className="dashboard-form">
                              <textarea
                                placeholder="Cole várias linhas (Nome;Prontuário;Leito;Equipe)"
                                value={mandatoryRawInput}
                                onChange={(event) => setMandatoryRawInput(event.target.value)}
                              />
                              <button type="button" onClick={handleMandatoryRawImport}>
                                Tratar dados brutos e adicionar
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
                                    <th>Leito</th>
                                    <th>Equipe</th>
                                    <th>Status</th>
                                    <th>Origem</th>
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mandatoryOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={7}>Nenhum atendimento obrigatório pendente.</td>
                                    </tr>
                                  ) : (
                                    mandatoryOverviewRows.map(({ entry, workflow, assignedTeamName }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{entry.bed || "-"}</td>
                                        <td>{assignedTeamName ?? entry.teamName ?? "-"}</td>
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
                                        <td>{entry.source === "active" ? "Internado ativo" : "Dados brutos"}</td>
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
                        ) : null}

                        {inpatientOverviewMode === "discharged" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Pacientes de alta</h3>
                            <p className="dashboard-muted">
                              Histórico de pacientes com status Alta ou Concluído.
                            </p>
                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Paciente</th>
                                    <th>Prontuário</th>
                                    <th>Equipe</th>
                                    <th>Status</th>
                                    <th>Atualização</th>
                                    <th>Detalhes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dischargedOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={6}>Nenhum paciente de alta ou concluído.</td>
                                    </tr>
                                  ) : (
                                    dischargedOverviewRows.map(({ entry, workflow, assignedTeamName }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{assignedTeamName ?? entry.teamName ?? "-"}</td>
                                        <td>{workflow.status}</td>
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
                        ) : null}
                      </section>

                      <section className="dashboard-subsection">
                        <h3>Detalhes do paciente internado</h3>
                        {selectedPatient && patientDetailsOpen ? (
                          <p className="dashboard-muted">
                            Paciente selecionado: {selectedPatient.fullName} ({selectedPatient.chartNumber})
                          </p>
                        ) : null}

                    {selectedPatient && patientDetailsOpen ? (
                      <>
                        <div className="dashboard-inline-actions">
                          <button
                            type="button"
                            className="dashboard-mini-button"
                            onClick={() => setPatientDetailsOpen(false)}
                          >
                            Fechar detalhes
                          </button>
                        </div>

                        <div className="dashboard-inline-actions">
                          {PATIENT_VIEW_ITEMS.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`dashboard-mini-button ${patientView === item.id ? "is-active" : ""}`}
                              onClick={() => setPatientView(item.id)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {patientView === "allergies" ? (
                          <div className="dashboard-subsection-block">
                            <h3>Alergias</h3>
                            <form className="dashboard-form" onSubmit={handleAllergySubmit}>
                              <select
                                value={allergyForm.medicationId}
                                onChange={(event) => setAllergyForm({ medicationId: event.target.value })}
                                disabled={medications.length === 0}
                              >
                                <option value="">Selecione medicamento cadastrado</option>
                                {medications.map((medication) => (
                                  <option key={medication.id} value={medication.id}>
                                    {medication.name}
                                  </option>
                                ))}
                              </select>
                              <p className="dashboard-muted">
                                Somente medicamentos cadastrados podem ser registrados como alergia.
                              </p>

                              {allergyFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${allergyFeedback.type}`}>
                                  {allergyFeedback.message}
                                </p>
                              ) : null}

                              <button
                                type="submit"
                                disabled={allergyLoading || !selectedAllergyMedication}
                              >
                                {allergyLoading ? "Salvando..." : "Salvar alergia"}
                              </button>
                            </form>

                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead>
                                  <tr>
                                    <th>Alergia</th>
                                    <th>Registro</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedPatientAllergies.length === 0 ? (
                                    <tr>
                                      <td colSpan={2}>Nenhuma alergia cadastrada.</td>
                                    </tr>
                                  ) : (
                                    selectedPatientAllergies.map((allergy) => (
                                      <tr key={allergy.id}>
                                        <td>{allergy.allergyName}</td>
                                        <td>{formatTimestamp(allergy.createdAt)}</td>
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

                              <div className="dashboard-calculation-box">
                                <h3>Alergias replicadas do cadastro do paciente</h3>
                                {selectedPatientAllergies.length === 0 ? (
                                  <p>Nenhuma alergia cadastrada para este paciente.</p>
                                ) : (
                                  <ul className="dashboard-chip-list">
                                    {selectedPatientAllergies.map((allergy) => (
                                      <li key={allergy.id}>{allergy.allergyName}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="dashboard-two-columns">
                                <input
                                  type="date"
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

                              <textarea
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
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
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
                                  required
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
                                  required
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
                                <p>
                                  {selectedBmiFormula?.label}: <span>{selectedBmiFormula?.equation ?? "-"}</span>
                                </p>
                                <p>
                                  {selectedBsaFormula?.label}: <span>{selectedBsaFormula?.equation ?? "-"}</span>
                                </p>
                                <div className="dashboard-two-columns">
                                  <input
                                    value={admissionPreview ? formatNumber(admissionPreview.bmi) : "IMC calculado"}
                                    disabled
                                  />
                                  <input
                                    value={
                                      admissionPreview
                                        ? formatNumber(admissionPreview.bodySurfaceArea)
                                        : "Superfície corporal calculada"
                                    }
                                    disabled
                                  />
                                </div>
                              </div>

                              {admissionFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${admissionFeedback.type}`}>
                                  {admissionFeedback.message}
                                </p>
                              ) : null}

                              <button type="submit" disabled={admissionLoading}>
                                {admissionLoading ? "Salvando..." : "Salvar internação"}
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
                                    <th>Peso/Altura</th>
                                    <th>IMC</th>
                                    <th>SC</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedPatientAdmissions.length === 0 ? (
                                    <tr>
                                      <td colSpan={7}>Sem internações cadastradas para este paciente.</td>
                                    </tr>
                                  ) : (
                                    selectedPatientAdmissions.map((admission) => (
                                      <tr key={admission.id}>
                                        <td>{admission.admissionDate}</td>
                                        <td>{admission.bed}</td>
                                        <td>{admission.teamName ?? "-"}</td>
                                        <td>{admission.admissionReason}</td>
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
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Dose"
                                  value={priorMedicationForm.dose}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      dose: event.target.value
                                    }))
                                  }
                                  required
                                />
                                <input
                                  placeholder="Unidade da dose"
                                  value={priorMedicationForm.doseUnit}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      doseUnit: event.target.value
                                    }))
                                  }
                                  required
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
                                  required
                                >
                                  <option value="">Selecione a frequência</option>
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
                                  required
                                />
                              </div>

                              <p className="dashboard-muted">
                                Para esquema semanal (ex.: 3 vezes por semana), selecione a frequência e informe a
                                quantidade por horário no padrão da tomada (ex.: 1-1-1).
                              </p>

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
                                    <th>Histórico</th>
                                    <th>Registro</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {priorMedicationRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={9}>Nenhum medicamento prévio cadastrado.</td>
                                    </tr>
                                  ) : (
                                    priorMedicationRows.map((row) => (
                                      <tr
                                        key={row.priorMedication.id}
                                        className={row.latestReconciled ? "" : "dashboard-row-missing"}
                                      >
                                        <td>{row.priorMedication.medicationName}</td>
                                        <td>
                                          {formatNumber(row.priorMedication.dose)} {row.priorMedication.doseUnit}
                                        </td>
                                        <td>{row.priorMedication.frequency}</td>
                                        <td>{row.priorMedication.shifts}</td>
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
                                                </p>
                                              ))}
                                            </details>
                                          )}
                                        </td>
                                        <td>{formatTimestamp(row.priorMedication.createdAt)}</td>
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
                                  prescriptionMode === "create" ? "is-active" : ""
                                }`}
                                onClick={() => setPrescriptionMode("create")}
                              >
                                Cadastrar prescrição
                              </button>
                              <button
                                type="button"
                                className={`dashboard-mini-button ${
                                  prescriptionMode === "raw" ? "is-active" : ""
                                }`}
                                onClick={() => setPrescriptionMode("raw")}
                              >
                                Tratar dados brutos
                              </button>
                            </div>

                            <div className="dashboard-calculation-box">
                              <h3>Vigência do conjunto da prescrição</h3>
                              <div className="dashboard-two-columns">
                                <input
                                  type="datetime-local"
                                  aria-label="Data início da vigência do conjunto"
                                  value={prescriptionSetForm.startAt}
                                  onChange={(event) =>
                                    setPrescriptionSetForm((current) => ({
                                      ...current,
                                      startAt: event.target.value
                                    }))
                                  }
                                />
                                <input
                                  type="datetime-local"
                                  aria-label="Data fim da vigência do conjunto"
                                  value={prescriptionSetForm.endAt}
                                  onChange={(event) =>
                                    setPrescriptionSetForm((current) => ({
                                      ...current,
                                      endAt: event.target.value
                                    }))
                                  }
                                />
                              </div>
                              <input
                                placeholder="Status da vigência (ex.: Validado)"
                                value={prescriptionSetForm.status}
                                onChange={(event) =>
                                  setPrescriptionSetForm((current) => ({
                                    ...current,
                                    status: event.target.value
                                  }))
                                }
                              />
                              <p>
                                Esta vigência vale para o conjunto atual de medicamentos, sem repetir por item.
                              </p>
                            </div>

                            {prescriptionMode === "create" ? (
                              <form className="dashboard-form" onSubmit={handlePrescriptionSubmit}>
                                <select
                                  value={prescriptionForm.admissionId}
                                  onChange={(event) =>
                                    setPrescriptionForm((current) => ({
                                      ...current,
                                      admissionId: event.target.value
                                    }))
                                  }
                                >
                                  <option value="">Sem vínculo com internação</option>
                                  {selectedPatientAdmissions.map((admission) => (
                                    <option key={admission.id} value={admission.id}>
                                      {admission.admissionDate} | Leito {admission.bed} | {admission.teamName ?? "-"}
                                    </option>
                                  ))}
                                </select>

                                <div className="dashboard-two-columns">
                                  <select
                                    value={prescriptionForm.medicationId}
                                    onChange={(event) => handlePrescriptionCatalogChange(event.target.value)}
                                  >
                                    <option value="">Sem vínculo com cadastro</option>
                                    {medications.map((medication) => (
                                      <option key={medication.id} value={medication.id}>
                                        {medication.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    placeholder="Nome do medicamento"
                                    value={prescriptionForm.medicationName}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        medicationName: event.target.value
                                      }))
                                    }
                                  />
                                </div>

                                {prescriptionAllergyConflict ? (
                                  <p className="dashboard-feedback dashboard-feedback-error">
                                    Flag de alergia: {prescriptionAllergyConflict.allergyName} (
                                    {buildAllergyConflictBadge(prescriptionAllergyConflict)}).
                                  </p>
                                ) : null}

                                <div className="dashboard-two-columns">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Dose"
                                    value={prescriptionForm.dose}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        dose: event.target.value
                                      }))
                                    }
                                    required
                                  />
                                  <input
                                    placeholder="Unidade da dose"
                                    value={prescriptionForm.doseUnit}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        doseUnit: event.target.value
                                      }))
                                    }
                                    required
                                  />
                                </div>

                                <div className="dashboard-two-columns">
                                  <input
                                    placeholder="Via (ex.: EV, VO, IM)"
                                    value={prescriptionForm.administrationRoute}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        administrationRoute: event.target.value
                                      }))
                                    }
                                    required
                                  />
                                  <input
                                    placeholder="Frequência"
                                    value={prescriptionForm.frequency}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        frequency: event.target.value
                                      }))
                                    }
                                    required
                                  />
                                </div>

                                <input
                                  placeholder="Turnos (opcional)"
                                  value={prescriptionForm.shifts}
                                  onChange={(event) =>
                                    setPrescriptionForm((current) => ({
                                      ...current,
                                      shifts: event.target.value
                                    }))
                                  }
                                />

                                <textarea
                                  placeholder="Observações da prescrição (opcional)"
                                  value={prescriptionForm.notes}
                                  onChange={(event) =>
                                    setPrescriptionForm((current) => ({
                                      ...current,
                                      notes: event.target.value
                                    }))
                                  }
                                />

                                {prescriptionFeedback ? (
                                  <p className={`dashboard-feedback dashboard-feedback-${prescriptionFeedback.type}`}>
                                    {prescriptionFeedback.message}
                                  </p>
                                ) : null}

                                <button type="submit" disabled={prescriptionLoading}>
                                  {prescriptionLoading ? "Salvando..." : "Salvar prescrição"}
                                </button>
                              </form>
                            ) : null}

                            {prescriptionMode === "raw" ? (
                              <div className="dashboard-subsection-block">
                                <h3>Entrada de prescrição por dados brutos</h3>
                                <p className="dashboard-muted">
                                  Cole as linhas de medicamentos no padrão hospitalar:
                                  `Medicamento - Administrar Dose Unidade; Via; Frequência; Obs;`.
                                </p>
                                <p className="dashboard-muted">
                                  A vigência do conjunto (início, fim e status) é aplicada uma única vez para todos.
                                </p>
                                <p className="dashboard-muted">
                                  Vigência atual:
                                  {" "}
                                  {prescriptionSetStartAt ? formatTimestamp(prescriptionSetStartAt) : "não definida"}
                                  {" "}
                                  até
                                  {" "}
                                  {prescriptionSetEndAt ? formatTimestamp(prescriptionSetEndAt) : "não definida"}
                                  {" "}
                                  | Status: {prescriptionSetStatus}
                                </p>

                                <select
                                  value={rawPrescriptionAdmissionId}
                                  onChange={(event) => setRawPrescriptionAdmissionId(event.target.value)}
                                >
                                  <option value="">Sem vínculo com internação</option>
                                  {selectedPatientAdmissions.map((admission) => (
                                    <option key={admission.id} value={admission.id}>
                                      {admission.admissionDate} | Leito {admission.bed} | {admission.teamName ?? "-"}
                                    </option>
                                  ))}
                                </select>

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
                                            <td>
                                              {draft.allergyConflict ? (
                                                <span className="dashboard-status-pill is-allergy">
                                                  {buildAllergyConflictBadge(draft.allergyConflict)}
                                                </span>
                                              ) : (
                                                "-"
                                              )}
                                            </td>
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
                              selectedPatientPrescriptionGroups.length === 0 ? (
                                <p className="dashboard-muted">
                                  Nenhuma prescrição cadastrada para este paciente.
                                </p>
                              ) : (
                                <div className="dashboard-list-box">
                                  {selectedPatientPrescriptionGroups.map((group, index) => (
                                    <div key={group.key} className="dashboard-subsection-block">
                                      <h3>Conjunto de prescrição {index + 1}</h3>
                                      <p className="dashboard-muted">
                                        Internação:
                                        {" "}
                                        {group.admissionDate
                                          ? `${group.admissionDate} | Leito ${group.bed ?? "-"}`
                                          : "Sem vínculo"}
                                      </p>
                                      <p className="dashboard-muted">
                                        Vigência:
                                        {" "}
                                        {group.validationStartAt
                                          ? formatTimestamp(group.validationStartAt)
                                          : "não definida"}
                                        {" "}
                                        até
                                        {" "}
                                        {group.validationEndAt
                                          ? formatTimestamp(group.validationEndAt)
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
                                              <th>Registro</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {group.prescriptions.map((prescription) => {
                                              const prescriptionConflict = resolveAllergyConflict(
                                                prescription.medicationName
                                              );

                                              return (
                                                <tr key={prescription.id}>
                                                  <td>{prescription.medicationName}</td>
                                                  <td>{formatNumber(prescription.dose)}</td>
                                                  <td>{prescription.doseUnit}</td>
                                                  <td>{prescription.administrationRoute ?? "-"}</td>
                                                  <td>{prescription.frequency}</td>
                                                  <td>{prescription.notes ?? "-"}</td>
                                                  <td>
                                                    {prescriptionConflict ? (
                                                      <span className="dashboard-status-pill is-allergy">
                                                        {buildAllergyConflictBadge(prescriptionConflict)}
                                                      </span>
                                                    ) : (
                                                      "-"
                                                    )}
                                                  </td>
                                                  <td>{formatTimestamp(prescription.createdAt)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="dashboard-muted">
                        Clique em um paciente internado para abrir os detalhes clínicos.
                      </p>
                    )}
                  </section>
                    </>
                  ) : null}
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
