"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import LogoutButton from "@/app/_components/logout-button";
import { calculateClinicalIndexes } from "@/lib/clinical";
import {
  type AdmissionRecord,
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId,
  type CouncilOption,
  type DashboardData,
  type PatientRecord,
  type ProfessionOption
} from "@/lib/coreclin-types";
import {
  HEPATOTOXIC_MEDICATIONS,
  RENAL_ADJUSTMENT_MEDICATIONS
} from "@/lib/medication-safety-flags";

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

const INPATIENT_SIDEBAR_ITEMS = [
  { id: "all", label: "Todos" },
  { id: "team", label: "Por equipe" },
  { id: "mandatory", label: "Obrigatórios" },
  { id: "discharged", label: "Pacientes de alta" }
] as const;

const PATIENT_VIEW_ITEMS = [
  { id: "allergies", label: "Alergias" },
  { id: "admission-info", label: "Informações da internação" },
  { id: "prior-use", label: "Medicamentos de uso prévio" },
  { id: "medication-validation", label: "Validação de medicamentos" },
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
type InpatientOverviewMode = (typeof INPATIENT_SIDEBAR_ITEMS)[number]["id"];
type InpatientWorkflowStatus = (typeof INPATIENT_STATUS_OPTIONS)[number];
type FeedbackType = "success" | "error";

type InpatientWorkflowState = {
  status: InpatientWorkflowStatus;
  assignedTeamId: number | null;
  mandatory: boolean;
  firstVisitCompletedAt: string | null;
  evolutionGeneratedAt: string | null;
  updatedAt: string;
};

type InpatientEntrySource = "active" | "manual";

type InpatientEntry = {
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

type MedicationSafetyFlags = {
  renalAdjustment: boolean;
  hepatotoxic: boolean;
};

type AllergySuggestionItem = {
  key: string;
  label: string;
  value: string;
  source: "medication" | "active-ingredient" | "therapeutic-class";
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

type SummaryMedicationCandidate = {
  medicationId: number;
  medicationName: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  shifts: string;
};

type DashboardConsoleProps = {
  currentLogin: string;
  data: DashboardData | null;
  dbError: string | null;
};

function buildInpatientWorkflowStorageKey(currentLogin: string): string {
  const normalizedLogin = normalizeSearchValue(currentLogin) || "default";
  return `${INPATIENT_WORKFLOW_STORAGE_KEY}:${normalizedLogin}`;
}

const DASHBOARD_SECTION_IDS = new Set<string>(DASHBOARD_NAV_ITEMS.map((item) => item.id));
const INPATIENT_OVERVIEW_IDS = new Set<string>(INPATIENT_SIDEBAR_ITEMS.map((item) => item.id));
const PATIENT_VIEW_IDS = new Set<string>(PATIENT_VIEW_ITEMS.map((item) => item.id));

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

function extractFrequencyFromText(input: string): string {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return "Conforme resumo";
  }

  const patterns = [
    /(\d+\s*\/\s*\d+\s*horas?)/i,
    /(\d+\s*x\s*\/\s*dia)/i,
    /(\d+\s*vez(?:es)?\s+ao\s+dia)/i,
    /(1x\s*\/\s*m[eê]s)/i,
    /(antes\s+das?\s+refei[cç][oõ]es)/i,
    /(se\s+necess[aá]rio)/i
  ];

  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return "Conforme resumo";
}

function extractShiftsFromText(input: string): string {
  const normalizedInput = normalizeMedicationName(input);
  const shifts = [
    normalizedInput.includes("manha") ? "Manhã" : "",
    normalizedInput.includes("tarde") ? "Tarde" : "",
    normalizedInput.includes("noite") ? "Noite" : "",
    normalizedInput.includes("almoco") ? "Almoço" : "",
    normalizedInput.includes("jantar") ? "Jantar" : ""
  ].filter((value) => value.length > 0);

  return shifts.length > 0 ? shifts.join(", ") : "-";
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

function normalizeSearchValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
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
  evolutionGeneratedAt: string | null
): boolean {
  if (status === "Alta") {
    return false;
  }

  return !(status === "Concluído" && evolutionGeneratedAt);
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

function matchesMedicationReferenceList(
  medicationName: string,
  references: readonly string[]
): boolean {
  return references.some((reference) => isMedicationNameCompatible(reference, medicationName));
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

export default function DashboardConsole({
  currentLogin,
  data,
  dbError
}: DashboardConsoleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const professionals = data?.professionals ?? [];
  const teams = data?.teams ?? [];
  const patients = data?.patients ?? [];
  const recentAdmissions = data?.recentAdmissions ?? [];
  const medications = data?.medications ?? [];
  const patientAllergies = data?.patientAllergies ?? [];
  const priorMedications = data?.priorMedications ?? [];
  const prescriptions = data?.prescriptions ?? [];
  const currentProfessional = data?.currentProfessional ?? null;
  const searchPatientId = searchParams.get("patientId");
  const searchPatientView = searchParams.get("patientView");
  const searchSection = searchParams.get("section");
  const searchInpatientMode = searchParams.get("inpatientMode");
  const patientPageMode = typeof searchPatientId === "string" && searchPatientId.trim().length > 0;
  const requestedPatientView = PATIENT_VIEW_IDS.has(searchPatientView ?? "")
    ? (searchPatientView as PatientViewId)
    : "admission-info";
  const requestedSection = DASHBOARD_SECTION_IDS.has(searchSection ?? "")
    ? (searchSection as DashboardSectionId)
    : "professional";
  const requestedInpatientMode = INPATIENT_OVERVIEW_IDS.has(searchInpatientMode ?? "")
    ? (searchInpatientMode as InpatientOverviewMode)
    : "all";

  const [activeSection, setActiveSection] = useState<DashboardSectionId>(
    patientPageMode ? "inpatients" : requestedSection
  );
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
    admissionId: "",
    admissionDate: "",
    bed: "",
    admissionReason: "",
    admissionSummary: "",
    admissionImportExcerpt: "",
    teamId: "",
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
    searchPatientId ?? (patients[0] ? String(patients[0].id) : "")
  );
  const [inpatientSearch, setInpatientSearch] = useState("");
  const [inpatientOverviewMode, setInpatientOverviewMode] =
    useState<InpatientOverviewMode>(requestedInpatientMode);
  const [inpatientTeamFilter, setInpatientTeamFilter] = useState("all");
  const [mandatoryRawInput, setMandatoryRawInput] = useState("");
  const [mandatoryFeedback, setMandatoryFeedback] = useState<FeedbackState>(null);
  const [mandatoryLoading, setMandatoryLoading] = useState(false);
  const [workflowByInpatientKey, setWorkflowByInpatientKey] = useState<
    Record<string, InpatientWorkflowState>
  >({});
  const [trackedInpatientEntries, setTrackedInpatientEntries] = useState<InpatientEntry[]>([]);
  const [priorityTeamIds, setPriorityTeamIds] = useState<number[]>([]);
  const [patientPageOverride, setPatientPageOverride] = useState<boolean | null>(null);
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(patientPageMode);
  const [patientView, setPatientView] = useState<PatientViewId>(
    patientPageMode ? requestedPatientView : "allergies"
  );
  const effectivePatientPageMode = patientPageOverride ?? patientPageMode;
  const [selectedPatientProfileForm, setSelectedPatientProfileForm] = useState({
    birthDate: ""
  });
  const [showAllergyComposer, setShowAllergyComposer] = useState(false);
  const [showAdmissionSummaryComposer, setShowAdmissionSummaryComposer] = useState(false);
  const [showAdmissionSummaryPreview, setShowAdmissionSummaryPreview] = useState(false);
  const [prescriptionMode, setPrescriptionMode] = useState<PrescriptionMode>("view");
  const [selectedPrescriptionGroupKey, setSelectedPrescriptionGroupKey] = useState("");
  const [selectedPrescriptionMedicationHistory, setSelectedPrescriptionMedicationHistory] = useState<{
    medicationId: number | null;
    medicationName: string;
  } | null>(null);

  const [allergyForm, setAllergyForm] = useState({
    query: "",
    selectedValue: ""
  });
  const [allergyFeedback, setAllergyFeedback] = useState<FeedbackState>(null);
  const [allergyLoading, setAllergyLoading] = useState(false);
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
  const [priorMedicationValidationForm, setPriorMedicationValidationForm] = useState<
    Record<
      number,
      {
        quantityTablets: string;
        lotNumber: string;
        expirationDate: string;
        manufacturer: string;
      }
    >
  >({});
  const [medicationValidationUpdatingId, setMedicationValidationUpdatingId] = useState<number | null>(null);
  const [medicationValidationForm, setMedicationValidationForm] = useState<
    Record<
      number,
      {
        quantityTablets: string;
        lotNumber: string;
        expirationDate: string;
        manufacturer: string;
      }
    >
  >({});

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
  const admissionSummaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [admissionSummarySelection, setAdmissionSummarySelection] = useState("");

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
    if (patientPageMode) {
      setActiveSection("inpatients");
      setInpatientOverviewMode(requestedInpatientMode);
      setPatientView(requestedPatientView);
      setPatientDetailsOpen(true);
      if (searchPatientId) {
        setSelectedPatientId(searchPatientId);
      }
      return;
    }

    if (searchParams.has("section")) {
      setActiveSection(requestedSection);
    }

    if (searchParams.has("inpatientMode")) {
      setInpatientOverviewMode(requestedInpatientMode);
    }

    if (searchParams.has("patientView") && PATIENT_VIEW_IDS.has(searchPatientView ?? "")) {
      setPatientView(requestedPatientView);
    }
  }, [
    patientPageMode,
    requestedInpatientMode,
    requestedPatientView,
    requestedSection,
    searchParams,
    searchPatientId,
    searchPatientView
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
  const selectedPatient =
    Number.isInteger(selectedPatientNumericId) && selectedPatientNumericId > 0
      ? patients.find((patient) => patient.id === selectedPatientNumericId) ?? null
      : null;
  const selectedPatientBirthDate = normalizeAdmissionDateValue(selectedPatientProfileForm.birthDate) ?? "";
  const selectedPatientAgePreview = useMemo(
    () => calculateAge(selectedPatientBirthDate),
    [selectedPatientBirthDate]
  );

  const inpatients = useMemo<InpatientEntry[]>(() => {
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
  }, [patients, recentAdmissions]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawPayload = window.localStorage.getItem(inpatientWorkflowStorageKey);
      if (!rawPayload) {
        setWorkflowByInpatientKey({});
        setTrackedInpatientEntries([]);
        setPriorityTeamIds([]);
        return;
      }

      const parsedPayload = JSON.parse(rawPayload) as Partial<InpatientWorkflowStoragePayload>;

      if (parsedPayload.workflowByKey && typeof parsedPayload.workflowByKey === "object") {
        const normalizedWorkflowByKey = Object.fromEntries(
          Object.entries(parsedPayload.workflowByKey).flatMap(([entryKey, workflowValue]) => {
            if (!workflowValue || typeof workflowValue !== "object") {
              return [];
            }

            const workflow = workflowValue as Partial<InpatientWorkflowState>;
            const status =
              workflow.status === "Concluído" || workflow.status === "Alta"
                ? workflow.status
                : "Pendente";
            const evolutionGeneratedAt =
              typeof workflow.evolutionGeneratedAt === "string" ? workflow.evolutionGeneratedAt : null;
            const firstVisitCompletedAt =
              typeof workflow.firstVisitCompletedAt === "string"
                ? workflow.firstVisitCompletedAt
                : status === "Concluído"
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
                  updatedAt:
                    typeof workflow.updatedAt === "string" ? workflow.updatedAt : new Date().toISOString()
                } satisfies InpatientWorkflowState
              ]
            ];
          })
        );

        setWorkflowByInpatientKey(normalizedWorkflowByKey);
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
              (entry.reportedAgeYears === null || typeof entry.reportedAgeYears === "number") &&
              (entry.patientId === null || typeof entry.patientId === "number") &&
              (entry.teamId === null || typeof entry.teamId === "number") &&
              (entry.teamName === null || typeof entry.teamName === "string") &&
              (entry.source === "active" || entry.source === "manual")
            );
          })
          .map((entry) => ({
            ...entry,
            reportedAgeYears:
              typeof entry.reportedAgeYears === "number" ? entry.reportedAgeYears : null,
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
  }, [inpatientWorkflowStorageKey]);

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
    if (typeof window === "undefined") {
      return;
    }

    const payload: InpatientWorkflowStoragePayload = {
      workflowByKey: workflowByInpatientKey,
      trackedEntries: trackedInpatientEntries,
      priorityTeamIds
    };
    window.localStorage.setItem(inpatientWorkflowStorageKey, JSON.stringify(payload));
  }, [workflowByInpatientKey, trackedInpatientEntries, priorityTeamIds, inpatientWorkflowStorageKey]);

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
        firstVisitCompletedAt: null,
        evolutionGeneratedAt: null,
        updatedAt: entry.createdAt
      }
    );
  }

  const inpatientEntries = useMemo(() => {
    const entriesByIdentity = new Map<string, InpatientEntry>();

    for (const entry of [...trackedInpatientEntries, ...inpatients]) {
      const normalizedChart = normalizeSearchValue(entry.chartNumber);
      const normalizedName = normalizeSearchValue(entry.patientName);
      const identity =
        entry.patientId !== null
          ? `patient:${entry.patientId}`
          : normalizedChart
            ? `chart:${normalizedChart}`
            : `name:${normalizedName || entry.key}`;

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
    () => {
      const trackedKeys = new Set(trackedInpatientEntries.map((entry) => entry.key));

      return inpatientEntriesWithWorkflow
        .filter(({ entry }) => trackedKeys.has(entry.key))
        .filter(({ workflow }) => workflow.mandatory)
        .sort((first, second) => {
          const firstPriority = first.workflow.firstVisitCompletedAt ? 1 : 0;
          const secondPriority = second.workflow.firstVisitCompletedAt ? 1 : 0;
          if (firstPriority !== secondPriority) {
            return firstPriority - secondPriority;
          }

          return first.entry.patientName.localeCompare(second.entry.patientName, "pt-BR");
        });
    },
    [inpatientEntriesWithWorkflow, trackedInpatientEntries]
  );

  const dischargedOverviewRows = useMemo(
    () =>
      inpatientEntriesWithWorkflow
        .filter(
          ({ workflow }) =>
            workflow.status === "Alta" || (workflow.status === "Concluído" && !workflow.mandatory)
        )
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

  useEffect(() => {
    setSelectedPatientProfileForm({
      birthDate: formatAdmissionDateValue(selectedPatient?.birthDate ?? "")
    });
    setShowAllergyComposer(false);
    setShowAdmissionSummaryComposer(false);
    setShowAdmissionSummaryPreview(false);
    setAdmissionSummarySelection("");
    setAllergyForm({ query: "", selectedValue: "" });
    setAllergyFeedback(null);
  }, [selectedPatient?.birthDate, selectedPatient?.id]);

  useEffect(() => {
    if (!selectedPatient) {
      return;
    }

    const latestAdmission = selectedPatientAdmissions[0] ?? selectedPatient.latestAdmission;
    const latestMeasurement = selectedPatient.latestMeasurement;

    setAdmissionForm({
      admissionId: latestAdmission ? String(latestAdmission.id) : "",
      admissionDate: formatAdmissionDateValue(
        latestAdmission?.admissionDate ?? selectedInpatientEntry?.admissionDate ?? ""
      ),
      bed: latestAdmission?.bed ?? selectedInpatientEntry?.bed ?? "",
      admissionReason:
        latestAdmission?.admissionReason && latestAdmission.admissionReason !== "Pendente de preenchimento"
          ? latestAdmission.admissionReason
          : "",
      admissionSummary: latestAdmission?.admissionSummary ?? "",
      admissionImportExcerpt: latestAdmission?.admissionImportExcerpt ?? "",
      teamId:
        latestAdmission?.teamId !== null && latestAdmission?.teamId !== undefined
          ? String(latestAdmission.teamId)
          : selectedInpatientEntry?.teamId !== null && selectedInpatientEntry?.teamId !== undefined
            ? String(selectedInpatientEntry.teamId)
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
  }, [selectedInpatientEntry, selectedPatient, selectedPatientAdmissions]);

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
      const medicationValue = descriptor.medication.name.trim();
      const medicationKey = `medication:${normalizeMedicationName(medicationValue)}`;
      if (medicationValue && !suggestionMap.has(medicationKey)) {
        suggestionMap.set(medicationKey, {
          key: medicationKey,
          label: `${medicationValue} (medicamento)`,
          value: medicationValue,
          source: "medication",
          normalizedSearch: normalizeMedicationName(
            `${medicationValue} ${descriptor.medication.activeIngredients ?? ""} ${
              descriptor.medication.therapeuticClass ?? ""
            } ${descriptor.medication.searchAliases ?? ""}`
          )
        });
      }

      for (const ingredientTerm of descriptor.activeIngredientTerms) {
        const ingredientValue = ingredientTerm.raw.trim();
        const ingredientKey = `ingredient:${ingredientTerm.normalized}`;
        if (ingredientValue && !suggestionMap.has(ingredientKey)) {
          suggestionMap.set(ingredientKey, {
            key: ingredientKey,
            label: `${ingredientValue} (princípio ativo)`,
            value: ingredientValue,
            source: "active-ingredient",
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

    return allergySuggestionItems
      .filter((item) => hasConceptTermMatch(item.normalizedSearch, normalizedQuery))
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

function hasTherapeuticClassRelation(allergyNormalized: string, classNormalized: string): boolean {
  if (!allergyNormalized || !classNormalized) {
    return false;
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
      const allergyClassCodes = extractTherapeuticClassCodes(allergy.allergyName);

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
        if (
          hasTherapeuticClassCodeMatch(allergyClassCodes, prescribedDescriptor.classCodes)
        ) {
          return {
            allergyName: allergy.allergyName,
            kind: "therapeutic-class",
            detail: prescribedDescriptor.medication.therapeuticClass ?? allergy.allergyName
          };
        }

        for (const allergyDescriptor of allergyDescriptors) {
          if (
            hasTherapeuticClassCodeMatch(
              allergyDescriptor.classCodes,
              prescribedDescriptor.classCodes
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

  function resolveMedicationSafetyFlags(medicationName: string): MedicationSafetyFlags {
    const normalizedMedication = normalizeMedicationName(medicationName);
    if (!normalizedMedication) {
      return {
        renalAdjustment: false,
        hepatotoxic: false
      };
    }

    const matchedDescriptors = findMedicationDescriptorsByText(medicationName);

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
    const leadingLabel = withoutPrefix.split(/\s+[–-]\s+/)[0]?.trim() ?? withoutPrefix;
    const withoutDose = leadingLabel
      .replace(
        /\b\d+(?:[.,]\d+)?\s*(mg|mcg|g|kg|mL|ml|UI|ui|U|cp|cps|cmp|comprimidos?|caps?|cápsulas?|gotas?)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

    return withoutDose || leadingLabel;
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

    const normalizedLabel = normalizeMedicationName(searchCandidates[0] ?? "");
    if (!normalizedLabel) {
      return null;
    }

    const scoredMatches = medicationDescriptors
      .map((descriptor) => {
        let score = 0;

        if (descriptor.normalizedName === normalizedLabel) {
          score = 100;
        } else if (descriptor.aliasTerms.some((aliasTerm) => aliasTerm.normalized === normalizedLabel)) {
          score = 95;
        } else if (
          descriptor.activeIngredientTerms.some((ingredientTerm) => ingredientTerm.normalized === normalizedLabel)
        ) {
          score = 85;
        } else if (
          hasTokenBoundaryMatch(descriptor.normalizedName, normalizedLabel) ||
          hasTokenBoundaryMatch(normalizedLabel, descriptor.normalizedName)
        ) {
          score = 70;
        } else if (
          descriptor.aliasTerms.some(
            (aliasTerm) =>
              hasTokenBoundaryMatch(aliasTerm.normalized, normalizedLabel) ||
              hasTokenBoundaryMatch(normalizedLabel, aliasTerm.normalized)
          )
        ) {
          score = 65;
        }

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
    if (competingBestMatches.length > 1 && bestMatch.score < 100) {
      return null;
    }

    return bestMatch.descriptor.medication;
  }

  function extractSummaryMedicationCandidates(summaryText: string): SummaryMedicationCandidate[] {
    const candidates = new Map<number, SummaryMedicationCandidate>();
    const chunks = summaryText
      .split("\n")
      .flatMap((line) =>
        line
          .split(";")
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length > 0)
      );

    for (const chunk of chunks) {
      const medication = findBestCatalogMedicationFromSummaryChunk(chunk);
      if (!medication || candidates.has(medication.id)) {
        continue;
      }

      const parsedDose = extractDoseFromText(chunk);
      const dose = parsedDose.dose;
      const doseUnit = parsedDose.doseUnit || medication.defaultUnit;
      if (!dose || !doseUnit) {
        continue;
      }

      candidates.set(medication.id, {
        medicationId: medication.id,
        medicationName: medication.name,
        dose,
        doseUnit,
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

        return response.ok ? candidate.medicationName : null;
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

  const selectedPatientPriorMedications = useMemo(
    () =>
      priorMedications.filter(
        (medication) => selectedPatient !== null && medication.patientId === selectedPatient.id
      ),
    [priorMedications, selectedPatient]
  );

  useEffect(() => {
    setPriorMedicationValidationForm(
      Object.fromEntries(
        selectedPatientPriorMedications.map((priorMedication) => [
          priorMedication.id,
          {
            quantityTablets:
              priorMedication.quantityTablets === null ? "" : String(priorMedication.quantityTablets),
            lotNumber: priorMedication.lotNumber ?? "",
            expirationDate: priorMedication.expirationDate ?? "",
            manufacturer: priorMedication.manufacturer ?? ""
          }
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
      prescriptions.filter(
        (prescription) => selectedPatient !== null && prescription.patientId === selectedPatient.id
      ),
    [prescriptions, selectedPatient]
  );

  const selectedPatientMedicationValidationRows = useMemo(
    () =>
      selectedPatientPrescriptions
        .filter((prescription) => {
          if (prescription.externalValidationCandidate) {
            return true;
          }

          return normalizeMedicationName(prescription.medicationName).startsWith(
            "medicamento nao cadastrado"
          );
        })
        .map((prescription) => {
          const dailyTabletUse = calculateDailyTabletUse({
            dose: prescription.dose,
            doseUnit: prescription.doseUnit,
            frequency: prescription.frequency,
            shifts: prescription.shifts
          });

          return {
            prescription,
            displayMedicationName: sanitizeMedicationName(prescription.medicationName).medicationName,
            dailyTabletUse,
            durationDays: calculateDurationDays(prescription.quantityTablets, dailyTabletUse)
          };
        }),
    [selectedPatientPrescriptions]
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
            manufacturer: row.prescription.manufacturer ?? ""
          }
        ])
      )
    );
  }, [selectedPatientMedicationValidationRows]);

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

  const prescriptionMedicationSafetyFlags = useMemo(
    () => resolveMedicationSafetyFlags(prescriptionMedicationNameForAlert),
    [prescriptionMedicationNameForAlert, medicationDescriptors]
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
        normalizeDateOnlyKey(prescription.validationStartAt),
        normalizeDateOnlyKey(prescription.validationEndAt),
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
      const firstTime = getPrescriptionValiditySortTime(firstGroup.validationStartAt);
      const secondTime = getPrescriptionValiditySortTime(secondGroup.validationStartAt);
      return secondTime - firstTime;
    });
  }, [selectedPatientPrescriptions]);

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
        const dailyTabletUse = calculateDailyTabletUse({
          dose: priorMedication.dose,
          doseUnit: priorMedication.doseUnit,
          frequency: priorMedication.frequency,
          shifts: priorMedication.shifts
        });
        return {
          priorMedication,
          latestPrescriptionDate: latest?.prescriptionDate ?? null,
          latestReconciled: latest?.reconciled ?? null,
          reconciledInAllPrescriptions: history.length > 0 ? history.every((item) => item.reconciled) : null,
          history,
          dailyTabletUse,
          durationDays: calculateDurationDays(priorMedication.quantityTablets, dailyTabletUse)
        };
      }),
    [selectedPatientPriorMedications, selectedPatientPrescriptionGroups]
  );

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
          isMedicationNameCompatible(
            prescription.medicationName,
            selectedPrescriptionMedicationHistory.medicationName
          ) ||
          isMedicationNameCompatible(
            selectedPrescriptionMedicationHistory.medicationName,
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
  }, [selectedPatientPrescriptions, selectedPrescriptionMedicationHistory]);

  const selectedPrescriptionMedicationCatalogMatch = useMemo(() => {
    if (!selectedPrescriptionMedicationHistory) {
      return null;
    }

    return findCatalogMedicationMatchByName(selectedPrescriptionMedicationHistory.medicationName);
  }, [selectedPrescriptionMedicationHistory, medications]);

  const selectedPrescriptionMedicationSafetyFlags = useMemo(
    () =>
      selectedPrescriptionMedicationHistory
        ? resolveMedicationSafetyFlags(selectedPrescriptionMedicationHistory.medicationName)
        : { renalAdjustment: false, hepatotoxic: false },
    [selectedPrescriptionMedicationHistory, medicationDescriptors]
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
        isMedicationNameCompatible(
          prescription.medicationName,
          selectedPrescriptionMedicationHistory.medicationName
        ) ||
        isMedicationNameCompatible(
          selectedPrescriptionMedicationHistory.medicationName,
          prescription.medicationName
        )
      );
    });

    if (!hasMatchingPrescription) {
      setSelectedPrescriptionMedicationHistory(null);
    }
  }, [selectedPatientPrescriptions, selectedPrescriptionMedicationHistory]);

  const prescriptionSetStartAt = normalizeHospitalDateTime(prescriptionSetForm.startAt);
  const prescriptionSetEndAt = normalizeHospitalDateTime(prescriptionSetForm.endAt);
  const prescriptionSetStatus = prescriptionSetForm.status.trim() || "Validado";

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

  function toggleList(sectionId: DashboardSectionId): void {
    setListVisibility((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  function openDashboardSection(sectionId: DashboardSectionId): void {
    setActiveSection(sectionId);

    if (sectionId === "inpatients") {
      setInpatientOverviewMode("all");
      setPatientDetailsOpen(false);
    }
  }

  function openInpatientOverview(mode: InpatientOverviewMode): void {
    setActiveSection("inpatients");
    setInpatientOverviewMode(mode);
    setPatientDetailsOpen(false);
  }

  function openPatientView(view: PatientViewId): void {
    setPatientView(view);

    if (!effectivePatientPageMode || !selectedPatientId) {
      return;
    }

    router.push(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: requestedInpatientMode,
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
    router.push(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: nextInpatientMode,
        patientId,
        patientView: targetView
      })
    );
  }

  function closePatientDetailsPage(): void {
    setPatientPageOverride(false);
    setActiveSection("inpatients");
    setInpatientOverviewMode(requestedInpatientMode);
    setPatientDetailsOpen(false);
    setSelectedPrescriptionMedicationHistory(null);
    router.push(
      buildDashboardUrl({
        section: "inpatients",
        inpatientMode: requestedInpatientMode
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

      const sanitizedMedication = sanitizeMedicationName(medicationName);
      medicationName = sanitizedMedication.medicationName;

      const matchedMedication = findCatalogMedicationMatchByName(medicationName);
      const allergyConflict = resolveAllergyConflict(medicationName);
      const safetyFlags = resolveMedicationSafetyFlags(medicationName);

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
        safetyFlags,
        isValid: validationMessage.length === 0,
        validationMessage: validationMessage || "Linha pronta para importação.",
        shouldAddToPriorMedicationValidation: sanitizedMedication.isNonCatalog
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

    const normalizedAdmissionDate = normalizeAdmissionDateValue(admissionForm.admissionDate);
    if (!normalizedAdmissionDate) {
      setAdmissionFeedback({
        type: "error",
        message: "Informe a admissão no formato DD/MM/AAAA."
      });
      return;
    }

    const normalizedBirthDate = selectedPatientProfileForm.birthDate.trim()
      ? normalizeAdmissionDateValue(selectedPatientProfileForm.birthDate)
      : null;
    if (selectedPatientProfileForm.birthDate.trim() && !normalizedBirthDate) {
      setAdmissionFeedback({
        type: "error",
        message: "Informe a data de nascimento no formato DD/MM/AAAA."
      });
      return;
    }

    setAdmissionLoading(true);

    try {
      if (normalizedBirthDate && normalizedBirthDate !== selectedPatient.birthDate) {
        const patientResponse = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: selectedPatient.fullName,
            chartNumber: selectedPatient.chartNumber,
            birthDate: normalizedBirthDate,
            allergies: []
          })
        });

        const patientResult = (await patientResponse.json()) as { message?: string };
        if (!patientResponse.ok) {
          setAdmissionFeedback({
            type: "error",
            message: patientResult.message ?? "Falha ao atualizar os dados do paciente."
          });
          return;
        }
      }

      const shouldUpdateAdmission = admissionForm.admissionId.trim().length > 0;
      const response = await fetch("/api/admissions", {
        method: shouldUpdateAdmission ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...admissionForm,
          admissionDate: normalizedAdmissionDate,
          admissionId: shouldUpdateAdmission ? Number(admissionForm.admissionId) : undefined,
          patientId: selectedPatient.id,
          teamId: admissionForm.teamId ? Number(admissionForm.teamId) : undefined,
          weightKg: admissionForm.weightKg ? Number(admissionForm.weightKg) : undefined,
          heightCm: admissionForm.heightCm ? Number(admissionForm.heightCm) : undefined
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setAdmissionFeedback({
          type: "error",
          message: result.message ?? "Falha ao salvar internação."
        });
        return;
      }

      const summaryAutofill = await autoPopulateFromAdmissionSummary(
        selectedPatient.id,
        admissionForm.admissionImportExcerpt
      );
      const autofillDetails =
        summaryAutofill.addedPriorMedications > 0
          ? `${summaryAutofill.addedPriorMedications} medicamento(s) prévio(s) identificado(s)`
          : "";

      setAdmissionFeedback({
        type: "success",
        message: `${
          shouldUpdateAdmission ? "Internação atualizada com sucesso." : "Internação cadastrada com sucesso."
        }${autofillDetails ? ` Trecho de MUC analisado: ${autofillDetails}.` : ""}`
      });
      setAdmissionForm({
        admissionId: "",
        admissionDate: "",
        bed: "",
        admissionReason: "",
        admissionSummary: "",
        admissionImportExcerpt: "",
        teamId: "",
        weightKg: "",
        heightCm: "",
        bmiFormula: "quetelet",
        bsaFormula: "mosteller"
      });
      router.refresh();
    } catch {
      setAdmissionFeedback({
        type: "error",
        message: "Erro de conexão ao salvar internação."
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

    const allergyName = (allergyForm.selectedValue || allergyForm.query).trim();

    if (!allergyName) {
      setAllergyFeedback({
        type: "error",
        message: "Informe uma alergia para registrar (medicamento, princípio ativo ou classe)."
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
      setShowAllergyComposer(false);
      setAllergyForm({ query: "", selectedValue: "" });
      router.refresh();
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
      router.refresh();
    } catch {
      setAllergyFeedback({ type: "error", message: "Erro de conexão ao remover alergia." });
    } finally {
      setAllergyRemovingId(null);
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
          shifts: priorMedicationForm.shifts,
          quantityTablets: priorMedicationForm.quantityTablets
            ? Number(priorMedicationForm.quantityTablets)
            : undefined,
          lotNumber: priorMedicationForm.lotNumber,
          expirationDate: priorMedicationForm.expirationDate,
          manufacturer: priorMedicationForm.manufacturer
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
        shifts: "",
        quantityTablets: "",
        lotNumber: "",
        expirationDate: "",
        manufacturer: ""
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

  async function handleUpdatePriorMedicationValidation(priorMedicationId: number): Promise<void> {
    if (!selectedPatient) {
      setPriorMedicationFeedback({
        type: "error",
        message: "Selecione um paciente para atualizar o medicamento prévio."
      });
      return;
    }

    const formState = priorMedicationValidationForm[priorMedicationId];
    if (!formState) {
      return;
    }

    setPriorMedicationFeedback(null);
    setPriorMedicationUpdatingId(priorMedicationId);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}/prior-medications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priorMedicationId,
          quantityTablets: formState.quantityTablets,
          lotNumber: formState.lotNumber,
          expirationDate: formState.expirationDate,
          manufacturer: formState.manufacturer
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPriorMedicationFeedback({
          type: "error",
          message: result.message ?? "Falha ao atualizar validação do medicamento prévio."
        });
        return;
      }

      setPriorMedicationFeedback({
        type: "success",
        message: "Dados de validação do medicamento prévio atualizados."
      });
      router.refresh();
    } catch {
      setPriorMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao atualizar validação do medicamento prévio."
      });
    } finally {
      setPriorMedicationUpdatingId(null);
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
      const response = await fetch(`/api/patients/${selectedPatient.id}/prescriptions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          quantityTablets: formState.quantityTablets,
          lotNumber: formState.lotNumber,
          expirationDate: formState.expirationDate,
          manufacturer: formState.manufacturer
        })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPrescriptionFeedback({
          type: "error",
          message: result.message ?? "Falha ao atualizar validação do medicamento."
        });
        return;
      }

      setPrescriptionFeedback({
        type: "success",
        message: "Validação do medicamento atualizada."
      });
      router.refresh();
    } catch {
      setPrescriptionFeedback({
        type: "error",
        message: "Erro de conexão ao atualizar validação do medicamento."
      });
    } finally {
      setMedicationValidationUpdatingId(null);
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
      router.refresh();
    } catch {
      setPriorMedicationFeedback({
        type: "error",
        message: "Erro de conexão ao remover medicamento prévio."
      });
    } finally {
      setPriorMedicationRemovingId(null);
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
            validationStatus: draft.validationStatus || prescriptionSetStatus,
            externalValidationCandidate: draft.shouldAddToPriorMedicationValidation
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
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: null,
        mandatory: true,
        firstVisitCompletedAt: null,
        evolutionGeneratedAt: null,
        updatedAt: now
      };
      const currentWorkflow = current[inpatientKey] ?? fallbackWorkflow;
      const nextFirstVisitCompletedAt =
        nextStatus === "Pendente"
          ? null
          : nextStatus === "Concluído"
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

  function handleGenerateMandatoryEvolution(entry: InpatientEntry): void {
    const currentWorkflow = resolveInpatientWorkflow(entry);
    if (!currentWorkflow.firstVisitCompletedAt && currentWorkflow.status !== "Concluído") {
      setMandatoryFeedback({
        type: "error",
        message: "Conclua a 1ª visita antes de gerar a evolução."
      });
      return;
    }

    setWorkflowByInpatientKey((current) => {
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Concluído",
        assignedTeamId: entry.teamId ?? null,
        mandatory: true,
        firstVisitCompletedAt: now,
        evolutionGeneratedAt: null,
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
          updatedAt: now
        }
      };
    });

    setMandatoryFeedback({
      type: "success",
      message: `Evolução registrada para ${entry.patientName}. Quando você enviar o modelo, eu encaixo o texto-base.`
    });
  }

  function handleRemoveMandatory(entry: InpatientEntry): void {
    const confirmed = window.confirm(`Remover ${entry.patientName} da lista de obrigatórios?`);
    if (!confirmed) {
      return;
    }

    setWorkflowByInpatientKey((current) => {
      const now = new Date().toISOString();
      const fallbackWorkflow: InpatientWorkflowState = {
        status: "Pendente",
        assignedTeamId: entry.teamId ?? null,
        mandatory: true,
        firstVisitCompletedAt: null,
        evolutionGeneratedAt: null,
        updatedAt: now
      };
      const baseWorkflow = current[entry.key] ?? fallbackWorkflow;

      return {
        ...current,
        [entry.key]: {
          ...baseWorkflow,
          mandatory: false,
          updatedAt: now
        }
      };
    });

    setMandatoryFeedback({
      type: "success",
      message: `${entry.patientName} removido da lista de obrigatórios.`
    });
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
          updatedAt: now
        }
      };
    });
  }

  function togglePriorityTeam(teamId: number): void {
    setPriorityTeamIds((current) =>
      current.includes(teamId) ? current.filter((existingId) => existingId !== teamId) : [...current, teamId]
    );
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
        message: "Cole ao menos uma linha para tratar os atendimentos obrigatórios."
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
        recentAdmissions.map(
          (admission) =>
            `${admission.patientId}:${admission.admissionDate}:${normalizeSearchValue(admission.bed)}`
        )
      );

      const nextManualEntriesByKey = new Map<string, InpatientEntry>();
      const entriesToPending = new Map<string, number | null>();
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
            lastErrorMessage = patientResult.message ?? "Falha ao cadastrar paciente do obrigatório.";
            continue;
          }

          patientRecord = patientResult.patient;
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
              admissionResult.message ?? "Falha ao cadastrar internação do obrigatório.";
            continue;
          }

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
          teamName: null,
          teamId: null,
          source: "active",
          createdAt: new Date().toISOString()
        });
        entriesToPending.set(entryKey, null);
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
        setTrackedInpatientEntries((current) => {
          const nextByKey = new Map(current.map((entry) => [entry.key, entry]));
          for (const manualEntry of nextManualEntriesByKey.values()) {
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
            firstVisitCompletedAt: null,
            evolutionGeneratedAt: null,
            updatedAt: new Date().toISOString()
          };
          const baseWorkflow = currentWorkflow ?? fallbackWorkflow;
          const updatedWorkflow: InpatientWorkflowState = {
            ...baseWorkflow,
            status: "Pendente",
            mandatory: true,
            assignedTeamId: assignedTeamId ?? null,
            firstVisitCompletedAt: null,
            evolutionGeneratedAt: null,
            updatedAt: new Date().toISOString()
          };

          if (
            !currentWorkflow ||
            currentWorkflow.status !== updatedWorkflow.status ||
            currentWorkflow.mandatory !== updatedWorkflow.mandatory ||
            currentWorkflow.assignedTeamId !== updatedWorkflow.assignedTeamId ||
            currentWorkflow.firstVisitCompletedAt !== updatedWorkflow.firstVisitCompletedAt ||
            currentWorkflow.evolutionGeneratedAt !== updatedWorkflow.evolutionGeneratedAt
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
        message:
          `${createdPatientsCount} paciente(s) cadastrado(s), ${createdAdmissionsCount} internação(ões) criada(s) e ${linkedCount} registro(s) já existente(s) mantido(s) em obrigatórios.` +
          (skippedCount > 0 ? ` ${skippedCount} linha(s) ignorada(s).` : "") +
          (lastErrorMessage ? ` Último erro: ${lastErrorMessage}` : "")
      });
      router.refresh();
    } catch {
      setMandatoryFeedback({
        type: "error",
        message: "Erro de conexão ao importar os obrigatórios do dia."
      });
    } finally {
      setMandatoryLoading(false);
    }
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
          {!effectivePatientPageMode ? (
            <section className="dashboard-card dashboard-highlight">
              <h2>Profissional logado</h2>
              <p>
                <strong>{responsibleProfessionalName}</strong> é o farmacêutico responsável padrão para novos
                registros.
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
                          {item.label}
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
                        {item.label}
                      </button>
                    ))}
                  </section>
                </nav>
              </aside>
            ) : null}

            <div className={`dashboard-content ${effectivePatientPageMode ? "is-patient-page" : ""}`}>
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
                                          <td>{inpatient.teamName ?? "-"}</td>
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
                        </section>
                      ) : null}

                      {!effectivePatientPageMode && inpatientOverviewMode === "mandatory" ? (
                        <section className="dashboard-subsection">
                          <div className="dashboard-subsection-block">
                            <h3>Atendimentos obrigatórios</h3>
                            <p className="dashboard-muted">
                              Farmacêutico responsável pela lista: {responsibleProfessionalName}
                            </p>
                            <p className="dashboard-muted">
                              Cole a lista do sistema no formato `Leito | Nome | Prontuário | Admissão` ou
                              `Leito | Nome | Idade | Prontuário | Admissão`.
                            </p>
                            <p className="dashboard-muted">
                              Cada login mantém sua própria lista. `Concluído` marca apenas a 1ª visita; o
                              paciente só sai daqui após `Gerar evolução`, `Alta` ou `Remover`.
                            </p>

                            <div className="dashboard-form">
                              <textarea
                                placeholder="Cole várias linhas do sistema para cadastrar os obrigatórios do dia"
                                value={mandatoryRawInput}
                                onChange={(event) => setMandatoryRawInput(event.target.value)}
                              />
                              <button type="button" onClick={handleMandatoryRawImport} disabled={mandatoryLoading}>
                                {mandatoryLoading
                                  ? "Importando pacientes..."
                                  : "Cadastrar obrigatórios do dia"}
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
                                    <th>Detalhes</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mandatoryOverviewRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={11}>Nenhum atendimento obrigatório pendente.</td>
                                    </tr>
                                  ) : (
                                    mandatoryOverviewRows.map(({ entry, workflow, assignedTeamName }) => (
                                      <tr key={entry.key}>
                                        <td>{entry.patientName}</td>
                                        <td>{entry.chartNumber || "-"}</td>
                                        <td>{formatAdmissionDate(entry.admissionDate)}</td>
                                        <td>{entry.bed || "-"}</td>
                                        <td>{assignedTeamName ?? entry.teamName ?? "Pendente"}</td>
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
                                              onClick={() => handleGenerateMandatoryEvolution(entry)}
                                              disabled={!workflow.firstVisitCompletedAt}
                                            >
                                              Gerar evolução
                                            </button>
                                          )}
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
                                        <td>
                                          <button
                                            type="button"
                                            className="dashboard-chip-remove"
                                            onClick={() => handleRemoveMandatory(entry)}
                                          >
                                            Remover
                                          </button>
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

                          {patientView === "allergies" ? (
                            <div className="dashboard-subsection-block">
                              <h3>Alergias</h3>
                              <div className="dashboard-inline-actions">
                                <button
                                  type="button"
                                  className="dashboard-mini-button"
                                  onClick={() => {
                                    setShowAllergyComposer((current) => !current);
                                    setAllergyFeedback(null);
                                    setAllergyForm({ query: "", selectedValue: "" });
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
                                        selectedValue: ""
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
                                                selectedValue: suggestion.value
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
                                      <th>Registro</th>
                                      <th>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedPatientAllergies.length === 0 ? (
                                      <tr>
                                        <td colSpan={3}>Nenhuma alergia cadastrada.</td>
                                      </tr>
                                    ) : (
                                      selectedPatientAllergies.map((allergy) => (
                                        <tr key={allergy.id}>
                                          <td>{allergy.allergyName}</td>
                                          <td>{formatTimestamp(allergy.createdAt)}</td>
                                          <td>
                                            <button
                                              type="button"
                                              className="dashboard-chip-remove"
                                              onClick={() =>
                                                handleRemoveAllergy(allergy.id, allergy.allergyName)
                                              }
                                              disabled={allergyRemovingId === allergy.id}
                                            >
                                              {allergyRemovingId === allergy.id ? "Removendo..." : "Remover"}
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
                                      birthDate: event.target.value
                                    }))
                                  }
                                />
                                <input
                                  value={selectedPatientAgePreview === null ? "Idade: -" : `Idade: ${selectedPatientAgePreview} anos`}
                                  disabled
                                  aria-label="Idade calculada"
                                />
                              </div>

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
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {priorMedicationRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={10}>Nenhum medicamento prévio cadastrado.</td>
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
                                        <td>
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
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedPatientMedicationValidationRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={12}>
                                        Nenhum medicamento não cadastrado encontrado na prescrição.
                                      </td>
                                    </tr>
                                  ) : (
                                    selectedPatientMedicationValidationRows.map((row) => (
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
                                            value={
                                              medicationValidationForm[row.prescription.id]?.quantityTablets ?? ""
                                            }
                                            onChange={(event) =>
                                              setMedicationValidationForm((current) => ({
                                                ...current,
                                                [row.prescription.id]: {
                                                  ...(current[row.prescription.id] ?? {
                                                    quantityTablets: "",
                                                    lotNumber: "",
                                                    expirationDate: "",
                                                    manufacturer: ""
                                                  }),
                                                  quantityTablets: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={medicationValidationForm[row.prescription.id]?.lotNumber ?? ""}
                                            onChange={(event) =>
                                              setMedicationValidationForm((current) => ({
                                                ...current,
                                                [row.prescription.id]: {
                                                  ...(current[row.prescription.id] ?? {
                                                    quantityTablets: "",
                                                    lotNumber: "",
                                                    expirationDate: "",
                                                    manufacturer: ""
                                                  }),
                                                  lotNumber: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="date"
                                            value={
                                              medicationValidationForm[row.prescription.id]?.expirationDate ?? ""
                                            }
                                            onChange={(event) =>
                                              setMedicationValidationForm((current) => ({
                                                ...current,
                                                [row.prescription.id]: {
                                                  ...(current[row.prescription.id] ?? {
                                                    quantityTablets: "",
                                                    lotNumber: "",
                                                    expirationDate: "",
                                                    manufacturer: ""
                                                  }),
                                                  expirationDate: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            value={
                                              medicationValidationForm[row.prescription.id]?.manufacturer ?? ""
                                            }
                                            onChange={(event) =>
                                              setMedicationValidationForm((current) => ({
                                                ...current,
                                                [row.prescription.id]: {
                                                  ...(current[row.prescription.id] ?? {
                                                    quantityTablets: "",
                                                    lotNumber: "",
                                                    expirationDate: "",
                                                    manufacturer: ""
                                                  }),
                                                  manufacturer: event.target.value
                                                }
                                              }))
                                            }
                                          />
                                        </td>
                                        <td>
                                          {row.dailyTabletUse !== null
                                            ? `${formatNumber(row.dailyTabletUse)} comp/dia`
                                            : "-"}
                                        </td>
                                        <td>{formatDurationDays(row.durationDays)}</td>
                                        <td>
                                          {row.prescription.validationStartAt
                                            ? formatTimestamp(row.prescription.validationStartAt)
                                            : formatTimestamp(row.prescription.createdAt)}
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateMedicationValidation(row.prescription.id)
                                            }
                                            disabled={medicationValidationUpdatingId === row.prescription.id}
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

                            {prescriptionMode === "view" ? (
                              <div className="dashboard-subtle-picker">
                                <p className="dashboard-subtle-picker-label">Últimas vigências</p>
                                {recentPrescriptionGroups.length === 0 ? (
                                  <p className="dashboard-muted">Nenhuma vigência disponível.</p>
                                ) : (
                                  <div className="dashboard-subtle-picker-actions">
                                    {recentPrescriptionGroups.map((group) => {
                                      const referenceDate =
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
                                            group.validationStartAt
                                              ? formatPrescriptionValidityDate(group.validationStartAt)
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
                            ) : (
                              <div className="dashboard-calculation-box">
                                <h3>Vigência do conjunto da prescrição</h3>
                                <div className="dashboard-two-columns">
                                  <input
                                    type="text"
                                    aria-label="Data início da vigência do conjunto"
                                    placeholder="DD/MM/AAAA HH:MM"
                                    value={prescriptionSetForm.startAt}
                                    onChange={(event) =>
                                      setPrescriptionSetForm((current) => ({
                                        ...current,
                                        startAt: event.target.value
                                      }))
                                    }
                                  />
                                  <input
                                    type="text"
                                    aria-label="Data fim da vigência do conjunto"
                                    placeholder="DD/MM/AAAA HH:MM"
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
                            )}

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
                                      {formatAdmissionDate(admission.admissionDate)} | Leito {admission.bed} |{" "}
                                      {admission.teamName ?? "-"}
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

                                {hasMedicationSafetyFlag(prescriptionMedicationSafetyFlags)
                                  ? renderMedicationFlags(null, prescriptionMedicationSafetyFlags)
                                  : null}

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
                                  {prescriptionSetStartAt
                                    ? formatPrescriptionValidityDate(prescriptionSetStartAt)
                                    : "não definida"}
                                  {" "}
                                  até
                                  {" "}
                                  {prescriptionSetEndAt
                                    ? formatPrescriptionValidityDate(prescriptionSetEndAt)
                                    : "não definida"}
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
                                      {formatAdmissionDate(admission.admissionDate)} | Leito {admission.bed} |{" "}
                                      {admission.teamName ?? "-"}
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
                                              <th>Registro</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {group.prescriptions.map((prescription) => {
                                              const prescriptionConflict = resolveAllergyConflict(
                                                prescription.medicationName
                                              );
                                              const prescriptionSafetyFlags = resolveMedicationSafetyFlags(
                                                prescription.medicationName
                                              );

                                              return (
                                                <tr key={prescription.id}>
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
                                                                medicationName: prescription.medicationName
                                                              };
                                                        })
                                                      }
                                                    >
                                                      {prescription.medicationName}
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
                                                  <td>{formatTimestamp(prescription.createdAt)}</td>
                                                </tr>
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
                                  {selectedPrescriptionMedicationHistory.medicationName}
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
                        </section>
                      ) : null}
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
