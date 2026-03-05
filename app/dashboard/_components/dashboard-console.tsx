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

const ALLERGY_OPTIONS = [
  "Penicilina",
  "Dipirona",
  "AINEs",
  "Iodo",
  "Látex",
  "Sulfas",
  "Outra"
] as const;

const DASHBOARD_NAV_ITEMS = [
  { id: "professional", label: "Cadastrar Profissional" },
  { id: "team", label: "Cadastrar Equipe" },
  { id: "patient", label: "Cadastrar Paciente" },
  { id: "admission", label: "Internação" },
  { id: "medication", label: "Cadastro de Medicamentos" }
] as const;

const PATIENT_VIEW_ITEMS = [
  { id: "allergies", label: "Alergias" },
  { id: "admission-info", label: "Informações da internação" },
  { id: "prior-use", label: "Medicamentos de uso prévio" },
  { id: "prescriptions", label: "Prescrição médica" }
] as const;

type DashboardSectionId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
type PatientViewId = (typeof PATIENT_VIEW_ITEMS)[number]["id"];
type PrescriptionMode = "view" | "create" | "raw";
type FeedbackType = "success" | "error";

type FeedbackState = {
  type: FeedbackType;
  message: string;
} | null;

type RawPrescriptionDraft = {
  lineNumber: number;
  rawLine: string;
  medicationId: number | null;
  medicationName: string;
  dose: number | null;
  doseUnit: string;
  frequency: string;
  shifts: string;
  notes: string;
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

function getBmiFormulaLabel(formulaId: BmiFormulaId | null): string {
  if (!formulaId) {
    return "-";
  }
  const found = BMI_FORMULA_OPTIONS.find((item) => item.id === formulaId);
  return found?.label ?? formulaId;
}

function getBsaFormulaLabel(formulaId: BsaFormulaId | null): string {
  if (!formulaId) {
    return "-";
  }
  const found = BSA_FORMULA_OPTIONS.find((item) => item.id === formulaId);
  return found?.label ?? formulaId;
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
    admission: false,
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

  const [patientInitialAllergyForm, setPatientInitialAllergyForm] = useState<{
    allergyName: (typeof ALLERGY_OPTIONS)[number];
    customAllergy: string;
  }>({
    allergyName: ALLERGY_OPTIONS[0],
    customAllergy: ""
  });

  const [admissionForm, setAdmissionForm] = useState({
    patientId: patients[0] ? String(patients[0].id) : "",
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
    defaultUnit: "mg"
  });
  const [medicationFeedback, setMedicationFeedback] = useState<FeedbackState>(null);
  const [medicationLoading, setMedicationLoading] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0] ? String(patients[0].id) : ""
  );
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);
  const [patientView, setPatientView] = useState<PatientViewId>("allergies");
  const [prescriptionMode, setPrescriptionMode] = useState<PrescriptionMode>("view");

  const [allergyForm, setAllergyForm] = useState<{
    allergyName: (typeof ALLERGY_OPTIONS)[number];
    customAllergy: string;
  }>({
    allergyName: ALLERGY_OPTIONS[0],
    customAllergy: ""
  });
  const [allergyFeedback, setAllergyFeedback] = useState<FeedbackState>(null);
  const [allergyLoading, setAllergyLoading] = useState(false);

  const [priorMedicationForm, setPriorMedicationForm] = useState({
    medicationId: medications[0] ? String(medications[0].id) : "",
    medicationName: "",
    dose: "",
    doseUnit: medications[0]?.defaultUnit ?? "mg",
    frequency: "",
    shifts: ""
  });
  const [priorMedicationFeedback, setPriorMedicationFeedback] = useState<FeedbackState>(null);
  const [priorMedicationLoading, setPriorMedicationLoading] = useState(false);

  const [prescriptionForm, setPrescriptionForm] = useState({
    admissionId: "",
    medicationId: medications[0] ? String(medications[0].id) : "",
    medicationName: "",
    dose: "",
    doseUnit: medications[0]?.defaultUnit ?? "mg",
    frequency: "",
    shifts: "",
    notes: ""
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

  const selectedPatientPriorMedications = useMemo(
    () =>
      priorMedications.filter(
        (medication) => selectedPatient !== null && medication.patientId === selectedPatient.id
      ),
    [priorMedications, selectedPatient]
  );

  const selectedPatientPrescriptions = useMemo(
    () =>
      prescriptions.filter(
        (prescription) => selectedPatient !== null && prescription.patientId === selectedPatient.id
      ),
    [prescriptions, selectedPatient]
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

  const selectedAdmissionPatientAllergies = useMemo(() => {
    const patientId = Number(admissionForm.patientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return [];
    }

    return patientAllergies.filter((allergy) => allergy.patientId === patientId);
  }, [patientAllergies, admissionForm.patientId]);

  function toggleList(sectionId: DashboardSectionId): void {
    setListVisibility((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  function openPatientDetails(patientId: number, targetView: PatientViewId = "admission-info"): void {
    setSelectedPatientId(String(patientId));
    setPatientView(targetView);
    setPatientDetailsOpen(true);
  }

  function buildRawPrescriptionDrafts(rawInput: string): RawPrescriptionDraft[] {
    const lines = rawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line, index) => {
      const splitParts = line.includes(";")
        ? line.split(";")
        : line.includes("|")
          ? line.split("|")
          : line.split(/\s+-\s+/);
      const parts = splitParts.map((part) => part.trim()).filter((part) => part.length > 0);

      const medicationName = parts[0] ?? "";
      const parsedDose = parseDosePart(parts[1] ?? "");
      const frequency = parts[2] ?? "";
      const shifts = parts[3] ?? "";
      const notes = parts[4] ?? "";

      const matchedMedication = medications.find(
        (medication) => medication.name.toLocaleLowerCase() === medicationName.toLocaleLowerCase()
      );

      const fallbackUnit = matchedMedication?.defaultUnit ?? "";
      const doseUnit = parsedDose.doseUnit || fallbackUnit;

      let validationMessage = "";
      if (parts.length < 4) {
        validationMessage = "Formato inválido. Use: medicamento; dose unidade; frequência; turnos; observações";
      } else if (!medicationName) {
        validationMessage = "Nome do medicamento ausente.";
      } else if (!parsedDose.dose || parsedDose.dose <= 0) {
        validationMessage = "Dose inválida.";
      } else if (!doseUnit) {
        validationMessage = "Unidade da dose ausente.";
      } else if (!frequency) {
        validationMessage = "Frequência ausente.";
      } else if (!shifts) {
        validationMessage = "Turnos ausentes.";
      }

      return {
        lineNumber: index + 1,
        rawLine: line,
        medicationId: matchedMedication?.id ?? null,
        medicationName,
        dose: parsedDose.dose,
        doseUnit,
        frequency,
        shifts,
        notes,
        isValid: validationMessage.length === 0,
        validationMessage: validationMessage || "Linha pronta para importação."
      };
    });
  }

  function handleProcessRawPrescription(): void {
    setRawPrescriptionFeedback(null);
    const drafts = buildRawPrescriptionDrafts(rawPrescriptionInput);

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

  function resolveDraftInitialAllergy(): string {
    if (patientInitialAllergyForm.allergyName === "Outra") {
      return patientInitialAllergyForm.customAllergy.trim();
    }

    return patientInitialAllergyForm.allergyName;
  }

  function handleAddInitialPatientAllergy(): void {
    const nextAllergy = resolveDraftInitialAllergy();
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
      allergyName: ALLERGY_OPTIONS[0],
      customAllergy: ""
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
        allergyName: ALLERGY_OPTIONS[0],
        customAllergy: ""
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
    setAdmissionLoading(true);

    try {
      const response = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...admissionForm,
          patientId: Number(admissionForm.patientId),
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
        patientId: patients[0] ? String(patients[0].id) : "",
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
      setMedicationForm({ name: "", defaultUnit: "mg" });
      router.refresh();
    } catch {
      setMedicationFeedback({ type: "error", message: "Erro de conexão ao cadastrar medicamento." });
    } finally {
      setMedicationLoading(false);
    }
  }

  async function handleAllergySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAllergyFeedback(null);

    if (!selectedPatient) {
      setAllergyFeedback({ type: "error", message: "Selecione um paciente para cadastrar alergia." });
      return;
    }

    const allergyName =
      allergyForm.allergyName === "Outra" ? allergyForm.customAllergy.trim() : allergyForm.allergyName;

    if (!allergyName) {
      setAllergyFeedback({ type: "error", message: "Informe a alergia antes de salvar." });
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
      setAllergyForm({ allergyName: ALLERGY_OPTIONS[0], customAllergy: "" });
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

    setPriorMedicationLoading(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prior-medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: priorMedicationForm.medicationId,
          medicationName: priorMedicationForm.medicationName,
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
      setPriorMedicationForm((current) => ({
        ...current,
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
          frequency: prescriptionForm.frequency,
          shifts: prescriptionForm.shifts,
          notes: prescriptionForm.notes
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
        notes: ""
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
            frequency: draft.frequency,
            shifts: draft.shifts,
            notes: draft.notes
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

  function handlePriorMedicationCatalogChange(nextMedicationId: string): void {
    const selectedCatalogMedication = medications.find(
      (medication) => String(medication.id) === nextMedicationId
    );

    setPriorMedicationForm((current) => ({
      ...current,
      medicationId: nextMedicationId,
      medicationName: selectedCatalogMedication ? selectedCatalogMedication.name : current.medicationName,
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
                {DASHBOARD_NAV_ITEMS.map((item) => (
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

              {activeSection === "patient" ? (
                <section className="dashboard-card">
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
                          value={patientInitialAllergyForm.allergyName}
                          onChange={(event) =>
                            setPatientInitialAllergyForm((current) => ({
                              ...current,
                              allergyName: event.target.value as (typeof ALLERGY_OPTIONS)[number]
                            }))
                          }
                        >
                          {ALLERGY_OPTIONS.map((allergyOption) => (
                            <option key={allergyOption} value={allergyOption}>
                              {allergyOption}
                            </option>
                          ))}
                        </select>
                        {patientInitialAllergyForm.allergyName === "Outra" ? (
                          <input
                            placeholder="Descreva a alergia"
                            value={patientInitialAllergyForm.customAllergy}
                            onChange={(event) =>
                              setPatientInitialAllergyForm((current) => ({
                                ...current,
                                customAllergy: event.target.value
                              }))
                            }
                          />
                        ) : (
                          <input
                            value={resolveDraftInitialAllergy()}
                            disabled
                            aria-label="Alergia selecionada"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        className="dashboard-mini-button dashboard-mini-button-inline"
                        onClick={handleAddInitialPatientAllergy}
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
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patients.map((patient) => (
                                <tr key={patient.id}>
                                  <td>
                                    <button
                                      type="button"
                                      className="dashboard-link-button"
                                      onClick={() => openPatientDetails(patient.id)}
                                    >
                                      {patient.fullName}
                                    </button>
                                  </td>
                                  <td>{patient.chartNumber}</td>
                                  <td>{patient.ageYears} anos</td>
                                  <td>{patient.responsibleProfessionalName}</td>
                                  <td>{patient.latestAdmission ? patient.latestAdmission.admissionDate : "-"}</td>
                                  <td>{patient.latestAdmission?.bed ?? "-"}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="dashboard-mini-button"
                                      onClick={() => openPatientDetails(patient.id)}
                                    >
                                      Abrir detalhes
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

                  <section className="dashboard-subsection">
                    <h3>Detalhes do paciente</h3>
                    <select
                      value={selectedPatientId}
                      onChange={(event) => {
                        setSelectedPatientId(event.target.value);
                        setPatientDetailsOpen(event.target.value.length > 0);
                      }}
                      disabled={patients.length === 0}
                    >
                      {patients.length === 0 ? <option value="">Nenhum paciente cadastrado</option> : null}
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.fullName} ({patient.chartNumber})
                        </option>
                      ))}
                    </select>

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
                                value={allergyForm.allergyName}
                                onChange={(event) =>
                                  setAllergyForm((current) => ({
                                    ...current,
                                    allergyName: event.target.value as (typeof ALLERGY_OPTIONS)[number]
                                  }))
                                }
                              >
                                {ALLERGY_OPTIONS.map((allergyOption) => (
                                  <option key={allergyOption} value={allergyOption}>
                                    {allergyOption}
                                  </option>
                                ))}
                              </select>

                              {allergyForm.allergyName === "Outra" ? (
                                <input
                                  placeholder="Descreva a alergia"
                                  value={allergyForm.customAllergy}
                                  onChange={(event) =>
                                    setAllergyForm((current) => ({
                                      ...current,
                                      customAllergy: event.target.value
                                    }))
                                  }
                                  required
                                />
                              ) : null}

                              {allergyFeedback ? (
                                <p className={`dashboard-feedback dashboard-feedback-${allergyFeedback.type}`}>
                                  {allergyFeedback.message}
                                </p>
                              ) : null}

                              <button type="submit" disabled={allergyLoading}>
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
                                <select
                                  value={priorMedicationForm.medicationId}
                                  onChange={(event) => handlePriorMedicationCatalogChange(event.target.value)}
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
                                  value={priorMedicationForm.medicationName}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      medicationName: event.target.value
                                    }))
                                  }
                                />
                              </div>

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
                                <input
                                  placeholder="Frequência"
                                  value={priorMedicationForm.frequency}
                                  onChange={(event) =>
                                    setPriorMedicationForm((current) => ({
                                      ...current,
                                      frequency: event.target.value
                                    }))
                                  }
                                  required
                                />
                                <input
                                  placeholder="Turnos de uso"
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
                                    <th>Turnos</th>
                                    <th>Registro</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedPatientPriorMedications.length === 0 ? (
                                    <tr>
                                      <td colSpan={5}>Nenhum medicamento prévio cadastrado.</td>
                                    </tr>
                                  ) : (
                                    selectedPatientPriorMedications.map((medication) => (
                                      <tr key={medication.id}>
                                        <td>{medication.medicationName}</td>
                                        <td>
                                          {formatNumber(medication.dose)} {medication.doseUnit}
                                        </td>
                                        <td>{medication.frequency}</td>
                                        <td>{medication.shifts}</td>
                                        <td>{formatTimestamp(medication.createdAt)}</td>
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
                                  <input
                                    placeholder="Turnos"
                                    value={prescriptionForm.shifts}
                                    onChange={(event) =>
                                      setPrescriptionForm((current) => ({
                                        ...current,
                                        shifts: event.target.value
                                      }))
                                    }
                                    required
                                  />
                                </div>

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
                                  Formato esperado por linha: `medicamento; dose unidade; frequência; turnos;
                                  observações`.
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
                                        <th>Medicamento</th>
                                        <th>Dose</th>
                                        <th>Frequência</th>
                                        <th>Turnos</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rawPrescriptionDrafts.length === 0 ? (
                                        <tr>
                                          <td colSpan={6}>Nenhuma linha tratada ainda.</td>
                                        </tr>
                                      ) : (
                                        rawPrescriptionDrafts.map((draft) => (
                                          <tr key={`${draft.lineNumber}-${draft.rawLine}`}>
                                            <td>{draft.lineNumber}</td>
                                            <td>{draft.medicationName || "-"}</td>
                                            <td>
                                              {draft.dose !== null
                                                ? `${formatNumber(draft.dose)} ${draft.doseUnit || ""}`.trim()
                                                : "-"}
                                            </td>
                                            <td>{draft.frequency || "-"}</td>
                                            <td>{draft.shifts || "-"}</td>
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
                              <div className="dashboard-table-wrap">
                                <table className="dashboard-table">
                                  <thead>
                                    <tr>
                                      <th>Internação</th>
                                      <th>Medicamento</th>
                                      <th>Dose</th>
                                      <th>Frequência</th>
                                      <th>Turnos</th>
                                      <th>Observações</th>
                                      <th>Registro</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedPatientPrescriptions.length === 0 ? (
                                      <tr>
                                        <td colSpan={7}>Nenhuma prescrição cadastrada para este paciente.</td>
                                      </tr>
                                    ) : (
                                      selectedPatientPrescriptions.map((prescription) => (
                                        <tr key={prescription.id}>
                                          <td>
                                            {prescription.admissionDate
                                              ? `${prescription.admissionDate} | Leito ${prescription.bed ?? "-"}`
                                              : "Sem vínculo"}
                                          </td>
                                          <td>{prescription.medicationName}</td>
                                          <td>
                                            {formatNumber(prescription.dose)} {prescription.doseUnit}
                                          </td>
                                          <td>{prescription.frequency}</td>
                                          <td>{prescription.shifts}</td>
                                          <td>{prescription.notes ?? "-"}</td>
                                          <td>{formatTimestamp(prescription.createdAt)}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="dashboard-muted">
                        Clique em um paciente na tabela para abrir os detalhes clínicos.
                      </p>
                    )}
                  </section>
                </section>
              ) : null}

              {activeSection === "admission" ? (
                <section className="dashboard-card">
                  <h2>Internação</h2>
                  <form className="dashboard-form" onSubmit={handleAdmissionSubmit}>
                    <select
                      value={admissionForm.patientId}
                      onChange={(event) =>
                        setAdmissionForm((current) => ({ ...current, patientId: event.target.value }))
                      }
                      required
                    >
                      <option value="">Selecione o paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.fullName} ({patient.chartNumber})
                        </option>
                      ))}
                    </select>

                    <div className="dashboard-calculation-box">
                      <h3>Alergias replicadas do cadastro do paciente</h3>
                      {selectedAdmissionPatientAllergies.length === 0 ? (
                        <p>Nenhuma alergia cadastrada para este paciente.</p>
                      ) : (
                        <ul className="dashboard-chip-list">
                          {selectedAdmissionPatientAllergies.map((allergy) => (
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

                  <div className="dashboard-list-box">
                    <button
                      type="button"
                      className="dashboard-list-toggle"
                      onClick={() => toggleList("admission")}
                    >
                      {listVisibility.admission ? "Ocultar pacientes internados" : "Ver pacientes internados"}
                    </button>
                    {listVisibility.admission ? (
                      recentAdmissions.length === 0 ? (
                        <p className="dashboard-muted">Nenhuma internação cadastrada.</p>
                      ) : (
                        <div className="dashboard-table-wrap">
                          <table className="dashboard-table">
                            <thead>
                              <tr>
                                <th>Paciente</th>
                                <th>Admissão</th>
                                <th>Leito</th>
                                <th>Equipe</th>
                                <th>Peso/Altura</th>
                                <th>IMC</th>
                                <th>Fórmula IMC</th>
                                <th>SC</th>
                                <th>Fórmula SC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentAdmissions.map((admission) => (
                                <tr key={admission.id}>
                                  <td>{admission.patientName}</td>
                                  <td>{admission.admissionDate}</td>
                                  <td>{admission.bed}</td>
                                  <td>{admission.teamName ?? "-"}</td>
                                  <td>
                                    {admission.weightKg !== null && admission.heightCm !== null
                                      ? `${formatNumber(admission.weightKg)} kg / ${formatNumber(admission.heightCm)} cm`
                                      : "-"}
                                  </td>
                                  <td>{admission.bmi !== null ? formatNumber(admission.bmi) : "-"}</td>
                                  <td>{getBmiFormulaLabel(admission.bmiFormula)}</td>
                                  <td>
                                    {admission.bodySurfaceArea !== null
                                      ? formatNumber(admission.bodySurfaceArea)
                                      : "-"}
                                  </td>
                                  <td>{getBsaFormulaLabel(admission.bsaFormula)}</td>
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

              {activeSection === "medication" ? (
                <section className="dashboard-card">
                  <h2>Cadastro de Medicamentos</h2>
                  <form className="dashboard-form" onSubmit={handleMedicationSubmit}>
                    <input
                      placeholder="Nome do medicamento"
                      value={medicationForm.name}
                      onChange={(event) =>
                        setMedicationForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                    <input
                      placeholder="Unidade padrão (ex.: mg, mL, UI)"
                      value={medicationForm.defaultUnit}
                      onChange={(event) =>
                        setMedicationForm((current) => ({ ...current, defaultUnit: event.target.value }))
                      }
                      required
                    />

                    {medicationFeedback ? (
                      <p className={`dashboard-feedback dashboard-feedback-${medicationFeedback.type}`}>
                        {medicationFeedback.message}
                      </p>
                    ) : null}

                    <button type="submit" disabled={medicationLoading}>
                      {medicationLoading ? "Salvando..." : "Salvar medicamento"}
                    </button>
                  </form>

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
                                <th>Unidade padrão</th>
                                <th>Registro</th>
                              </tr>
                            </thead>
                            <tbody>
                              {medications.map((medication) => (
                                <tr key={medication.id}>
                                  <td>{medication.name}</td>
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
