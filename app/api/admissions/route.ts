import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  type BmiFormulaId,
  INTERVIEW_INFORMATION_QUALITY_OPTIONS,
  INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS,
  LAMG_PROPHYLAXIS_AGENT_OPTIONS,
  type BsaFormulaId,
  type InterviewInformationQuality,
  type InterviewInformationSourceType,
  type LamgProphylaxisAgent
} from "@/lib/coreclin-types";
import { createAdmission, recordAuditLogSafely, updateAdmission } from "@/lib/db";

export const runtime = "nodejs";

function isBmiFormulaId(value: string): value is BmiFormulaId {
  return BMI_FORMULA_OPTIONS.some((formula) => formula.id === value);
}

function isBsaFormulaId(value: string): value is BsaFormulaId {
  return BSA_FORMULA_OPTIONS.some((formula) => formula.id === value);
}

function isInterviewInformationQuality(value: string): value is InterviewInformationQuality {
  return INTERVIEW_INFORMATION_QUALITY_OPTIONS.some((option) => option === value);
}

function isInterviewInformationSourceType(value: string): value is InterviewInformationSourceType {
  return INTERVIEW_INFORMATION_SOURCE_TYPE_OPTIONS.some((option) => option === value);
}

function isLamgProphylaxisAgent(value: string): value is LamgProphylaxisAgent {
  return LAMG_PROPHYLAXIS_AGENT_OPTIONS.some((option) => option === value);
}

async function parseAdmissionRequest(request: Request): Promise<
  | { error: NextResponse }
  | {
      body: Record<string, unknown>;
      sessionUsername: string;
    }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { error: NextResponse.json({ message: "Sessão inválida." }, { status: 401 }) };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { error: NextResponse.json({ message: "Corpo inválido." }, { status: 400 }) };
  }

  return {
    body: payload as Record<string, unknown>,
    sessionUsername: session.username
  };
}

function parseOptionalPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "sim";
  }

  return false;
}

function parseOptionalBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (normalized === "true" || normalized === "1" || normalized === "sim") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "nao" || normalized === "não") {
      return false;
    }
  }

  return null;
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

function normalizeAdmissionDate(value: string): string | null {
  const trimmed = value.trim();
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

export async function POST(request: Request): Promise<NextResponse> {
  const parsedRequest = await parseAdmissionRequest(request);
  if ("error" in parsedRequest) {
    return parsedRequest.error;
  }

  const { body, sessionUsername } = parsedRequest;
  const patientIdRaw = body.patientId;
  const admissionDate = normalizeAdmissionDate(typeof body.admissionDate === "string" ? body.admissionDate : "");
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const admissionReason = typeof body.admissionReason === "string" ? body.admissionReason.trim() : "";
  const deniesContinuousMedicationUse = parseBooleanFlag(body.deniesContinuousMedicationUse);
  const admissionSummary = typeof body.admissionSummary === "string" ? body.admissionSummary.trim() : "";
  const roundSummary = typeof body.roundSummary === "string" ? body.roundSummary.trim() : "";
  const roundSummaryDate = normalizeAdmissionDate(
    typeof body.roundSummaryDate === "string" ? body.roundSummaryDate : ""
  );
  const admissionImportExcerpt =
    typeof body.admissionImportExcerpt === "string" ? body.admissionImportExcerpt.trim() : "";
  const teamIdRaw = body.teamId;
  const weightKgRaw = body.weightKg;
  const heightCmRaw = body.heightCm;
  const bmiFormulaRaw = typeof body.bmiFormula === "string" ? body.bmiFormula : "";
  const bsaFormulaRaw = typeof body.bsaFormula === "string" ? body.bsaFormula : "";
  const interviewInformationQualityRaw =
    typeof body.interviewInformationQuality === "string"
      ? body.interviewInformationQuality.trim().toLowerCase()
      : "";
  const interviewInformationSourceTypeRaw =
    typeof body.interviewInformationSourceType === "string"
      ? body.interviewInformationSourceType.trim().toLowerCase()
      : "";
  const interviewInformationSourceName = parseOptionalTrimmedString(body.interviewInformationSourceName);
  const interviewInformationSourceRelationship = parseOptionalTrimmedString(
    body.interviewInformationSourceRelationship
  );
  const interviewAmbulates = parseOptionalBooleanFlag(body.interviewAmbulates);
  const interviewIsIntubated = parseOptionalBooleanFlag(body.interviewIsIntubated);
  const paduaActiveCancer = parseOptionalBooleanFlag(body.paduaActiveCancer);
  const paduaPreviousVte = parseOptionalBooleanFlag(body.paduaPreviousVte);
  const paduaKnownThrombophilia = parseOptionalBooleanFlag(body.paduaKnownThrombophilia);
  const paduaRecentTraumaOrSurgery = parseOptionalBooleanFlag(body.paduaRecentTraumaOrSurgery);
  const paduaHeartOrRespiratoryFailure = parseOptionalBooleanFlag(
    body.paduaHeartOrRespiratoryFailure
  );
  const paduaAcuteMiOrIschemicStroke = parseOptionalBooleanFlag(body.paduaAcuteMiOrIschemicStroke);
  const paduaAcuteInfectionOrRheumatologicDisorder = parseOptionalBooleanFlag(
    body.paduaAcuteInfectionOrRheumatologicDisorder
  );
  const paduaHormonalTreatment = parseOptionalBooleanFlag(body.paduaHormonalTreatment);
  const paduaContraindicationToPharmacologicProphylaxis = parseOptionalBooleanFlag(
    body.paduaContraindicationToPharmacologicProphylaxis
  );
  const paduaNotes = parseOptionalTrimmedString(body.paduaNotes);
  const lamgCriticallyIll = parseOptionalBooleanFlag(body.lamgCriticallyIll);
  const lamgShock = parseOptionalBooleanFlag(body.lamgShock);
  const lamgCoagulopathy = parseOptionalBooleanFlag(body.lamgCoagulopathy);
  const lamgChronicLiverDisease = parseOptionalBooleanFlag(body.lamgChronicLiverDisease);
  const lamgNeurocritical = parseOptionalBooleanFlag(body.lamgNeurocritical);
  const lamgEnteralNutrition = parseOptionalBooleanFlag(body.lamgEnteralNutrition);
  const lamgAgentRaw = typeof body.lamgAgent === "string" ? body.lamgAgent.trim().toLowerCase() : "";
  const lamgNotes = parseOptionalTrimmedString(body.lamgNotes);
  const interviewInterventionMotive = parseOptionalTrimmedString(body.interviewInterventionMotive);
  const interviewSubjective = parseOptionalTrimmedString(body.interviewSubjective);
  const interviewRelevantSymptoms = parseOptionalTrimmedString(body.interviewRelevantSymptoms);
  const interviewPendingIssues = parseOptionalTrimmedString(body.interviewPendingIssues);
  const interviewPlan = parseOptionalTrimmedString(body.interviewPlan);

  const patientId = typeof patientIdRaw === "number" ? patientIdRaw : Number(patientIdRaw);
  const teamId = parseOptionalPositiveNumber(teamIdRaw);
  const weightKg = parseOptionalPositiveNumber(weightKgRaw);
  const heightCm = parseOptionalPositiveNumber(heightCmRaw);
  const hasMeasurements = weightKg !== null && heightCm !== null;

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  if (!admissionDate || !bed) {
    return NextResponse.json(
      { message: "Preencha a admissão no formato DD/MM/AAAA e informe o leito." },
      { status: 400 }
    );
  }

  if ((weightKg === null) !== (heightCm === null)) {
    return NextResponse.json(
      { message: "Informe peso e altura juntos ou deixe ambos em branco." },
      { status: 400 }
    );
  }

  if (hasMeasurements && !isBmiFormulaId(bmiFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de IMC inválida." }, { status: 400 });
  }

  if (hasMeasurements && !isBsaFormulaId(bsaFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de superfície corporal inválida." }, { status: 400 });
  }

  if (interviewInformationQualityRaw && !isInterviewInformationQuality(interviewInformationQualityRaw)) {
    return NextResponse.json({ message: "Qualidade das informações inválida." }, { status: 400 });
  }

  if (
    interviewInformationSourceTypeRaw &&
    !isInterviewInformationSourceType(interviewInformationSourceTypeRaw)
  ) {
    return NextResponse.json({ message: "Fonte da informação inválida." }, { status: 400 });
  }

  if (lamgAgentRaw && !isLamgProphylaxisAgent(lamgAgentRaw)) {
    return NextResponse.json({ message: "Agente de profilaxia para LAMG inválido." }, { status: 400 });
  }

  const bmiFormula = hasMeasurements ? (bmiFormulaRaw as BmiFormulaId) : undefined;
  const bsaFormula = hasMeasurements ? (bsaFormulaRaw as BsaFormulaId) : undefined;
  const interviewInformationQuality = interviewInformationQualityRaw
    ? (interviewInformationQualityRaw as InterviewInformationQuality)
    : undefined;
  const interviewInformationSourceType = interviewInformationSourceTypeRaw
    ? (interviewInformationSourceTypeRaw as InterviewInformationSourceType)
    : undefined;
  const lamgAgent = lamgAgentRaw ? (lamgAgentRaw as LamgProphylaxisAgent) : undefined;

  try {
    const admission = await createAdmission({
      patientId,
      admissionDate,
      bed,
      admissionReason,
      deniesContinuousMedicationUse,
      admissionSummary,
      roundSummary,
      roundSummaryDate,
      admissionImportExcerpt,
      teamId,
      weightKg,
      heightCm,
      bmiFormula,
      bsaFormula,
      interviewInformationQuality,
      interviewInformationSourceType,
      interviewInformationSourceName,
      interviewInformationSourceRelationship,
      interviewAmbulates,
      interviewIsIntubated,
      paduaActiveCancer,
      paduaPreviousVte,
      paduaKnownThrombophilia,
      paduaRecentTraumaOrSurgery,
      paduaHeartOrRespiratoryFailure,
      paduaAcuteMiOrIschemicStroke,
      paduaAcuteInfectionOrRheumatologicDisorder,
      paduaHormonalTreatment,
      paduaContraindicationToPharmacologicProphylaxis,
      paduaNotes,
      lamgCriticallyIll,
      lamgShock,
      lamgCoagulopathy,
      lamgChronicLiverDisease,
      lamgNeurocritical,
      lamgEnteralNutrition,
      lamgAgent,
      lamgNotes,
      interviewInterventionMotive,
      interviewSubjective,
      interviewRelevantSymptoms,
      interviewPendingIssues,
      interviewPlan,
      responsibleLogin: sessionUsername
    });

    await recordAuditLogSafely({
      actorLogin: sessionUsername,
      action: "admission_created",
      resourceType: "admission",
      resourceId: admission.id,
      patientId: admission.patientId,
      patientNameSnapshot: admission.patientName,
      metadata: {
        source: "api_admissions_create",
        teamId,
        bed,
        hasMeasurements,
        hasAdmissionSummary: Boolean(admissionSummary),
        hasRoundSummary: Boolean(roundSummary)
      }
    });

    return NextResponse.json({ ok: true, admission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar internação.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const parsedRequest = await parseAdmissionRequest(request);
  if ("error" in parsedRequest) {
    return parsedRequest.error;
  }

  const { body, sessionUsername } = parsedRequest;
  const admissionIdRaw = body.admissionId;
  const admissionDate = normalizeAdmissionDate(typeof body.admissionDate === "string" ? body.admissionDate : "");
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const admissionReason = typeof body.admissionReason === "string" ? body.admissionReason.trim() : "";
  const deniesContinuousMedicationUse = parseBooleanFlag(body.deniesContinuousMedicationUse);
  const admissionSummary = typeof body.admissionSummary === "string" ? body.admissionSummary.trim() : "";
  const roundSummary = typeof body.roundSummary === "string" ? body.roundSummary.trim() : "";
  const roundSummaryDate = normalizeAdmissionDate(
    typeof body.roundSummaryDate === "string" ? body.roundSummaryDate : ""
  );
  const admissionImportExcerpt =
    typeof body.admissionImportExcerpt === "string" ? body.admissionImportExcerpt.trim() : "";
  const teamId = parseOptionalPositiveNumber(body.teamId);
  const weightKg = parseOptionalPositiveNumber(body.weightKg);
  const heightCm = parseOptionalPositiveNumber(body.heightCm);
  const bmiFormulaRaw = typeof body.bmiFormula === "string" ? body.bmiFormula : "";
  const bsaFormulaRaw = typeof body.bsaFormula === "string" ? body.bsaFormula : "";
  const interviewInformationQualityRaw =
    typeof body.interviewInformationQuality === "string"
      ? body.interviewInformationQuality.trim().toLowerCase()
      : "";
  const interviewInformationSourceTypeRaw =
    typeof body.interviewInformationSourceType === "string"
      ? body.interviewInformationSourceType.trim().toLowerCase()
      : "";
  const interviewInformationSourceName = parseOptionalTrimmedString(body.interviewInformationSourceName);
  const interviewInformationSourceRelationship = parseOptionalTrimmedString(
    body.interviewInformationSourceRelationship
  );
  const interviewAmbulates = parseOptionalBooleanFlag(body.interviewAmbulates);
  const interviewIsIntubated = parseOptionalBooleanFlag(body.interviewIsIntubated);
  const paduaActiveCancer = parseOptionalBooleanFlag(body.paduaActiveCancer);
  const paduaPreviousVte = parseOptionalBooleanFlag(body.paduaPreviousVte);
  const paduaKnownThrombophilia = parseOptionalBooleanFlag(body.paduaKnownThrombophilia);
  const paduaRecentTraumaOrSurgery = parseOptionalBooleanFlag(body.paduaRecentTraumaOrSurgery);
  const paduaHeartOrRespiratoryFailure = parseOptionalBooleanFlag(
    body.paduaHeartOrRespiratoryFailure
  );
  const paduaAcuteMiOrIschemicStroke = parseOptionalBooleanFlag(body.paduaAcuteMiOrIschemicStroke);
  const paduaAcuteInfectionOrRheumatologicDisorder = parseOptionalBooleanFlag(
    body.paduaAcuteInfectionOrRheumatologicDisorder
  );
  const paduaHormonalTreatment = parseOptionalBooleanFlag(body.paduaHormonalTreatment);
  const paduaContraindicationToPharmacologicProphylaxis = parseOptionalBooleanFlag(
    body.paduaContraindicationToPharmacologicProphylaxis
  );
  const paduaNotes = parseOptionalTrimmedString(body.paduaNotes);
  const lamgCriticallyIll = parseOptionalBooleanFlag(body.lamgCriticallyIll);
  const lamgShock = parseOptionalBooleanFlag(body.lamgShock);
  const lamgCoagulopathy = parseOptionalBooleanFlag(body.lamgCoagulopathy);
  const lamgChronicLiverDisease = parseOptionalBooleanFlag(body.lamgChronicLiverDisease);
  const lamgNeurocritical = parseOptionalBooleanFlag(body.lamgNeurocritical);
  const lamgEnteralNutrition = parseOptionalBooleanFlag(body.lamgEnteralNutrition);
  const lamgAgentRaw = typeof body.lamgAgent === "string" ? body.lamgAgent.trim().toLowerCase() : "";
  const lamgNotes = parseOptionalTrimmedString(body.lamgNotes);
  const interviewInterventionMotive = parseOptionalTrimmedString(body.interviewInterventionMotive);
  const interviewSubjective = parseOptionalTrimmedString(body.interviewSubjective);
  const interviewRelevantSymptoms = parseOptionalTrimmedString(body.interviewRelevantSymptoms);
  const interviewPendingIssues = parseOptionalTrimmedString(body.interviewPendingIssues);
  const interviewPlan = parseOptionalTrimmedString(body.interviewPlan);
  const admissionId = typeof admissionIdRaw === "number" ? admissionIdRaw : Number(admissionIdRaw);
  const hasMeasurements = weightKg !== null && heightCm !== null;

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    return NextResponse.json({ message: "Internação inválida." }, { status: 400 });
  }

  if (!admissionDate || !bed) {
    return NextResponse.json(
      { message: "Preencha a admissão no formato DD/MM/AAAA e informe o leito." },
      { status: 400 }
    );
  }

  if ((weightKg === null) !== (heightCm === null)) {
    return NextResponse.json(
      { message: "Informe peso e altura juntos ou deixe ambos em branco." },
      { status: 400 }
    );
  }

  if (hasMeasurements && !isBmiFormulaId(bmiFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de IMC inválida." }, { status: 400 });
  }

  if (hasMeasurements && !isBsaFormulaId(bsaFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de superfície corporal inválida." }, { status: 400 });
  }

  if (interviewInformationQualityRaw && !isInterviewInformationQuality(interviewInformationQualityRaw)) {
    return NextResponse.json({ message: "Qualidade das informações inválida." }, { status: 400 });
  }

  if (
    interviewInformationSourceTypeRaw &&
    !isInterviewInformationSourceType(interviewInformationSourceTypeRaw)
  ) {
    return NextResponse.json({ message: "Fonte da informação inválida." }, { status: 400 });
  }

  if (lamgAgentRaw && !isLamgProphylaxisAgent(lamgAgentRaw)) {
    return NextResponse.json({ message: "Agente de profilaxia para LAMG inválido." }, { status: 400 });
  }

  const bmiFormula = hasMeasurements ? (bmiFormulaRaw as BmiFormulaId) : undefined;
  const bsaFormula = hasMeasurements ? (bsaFormulaRaw as BsaFormulaId) : undefined;
  const interviewInformationQuality = interviewInformationQualityRaw
    ? (interviewInformationQualityRaw as InterviewInformationQuality)
    : undefined;
  const interviewInformationSourceType = interviewInformationSourceTypeRaw
    ? (interviewInformationSourceTypeRaw as InterviewInformationSourceType)
    : undefined;
  const lamgAgent = lamgAgentRaw ? (lamgAgentRaw as LamgProphylaxisAgent) : undefined;

  try {
    const admission = await updateAdmission({
      admissionId,
      admissionDate,
      bed,
      admissionReason,
      deniesContinuousMedicationUse,
      admissionSummary,
      roundSummary,
      roundSummaryDate,
      admissionImportExcerpt,
      teamId,
      weightKg,
      heightCm,
      bmiFormula,
      bsaFormula,
      interviewInformationQuality,
      interviewInformationSourceType,
      interviewInformationSourceName,
      interviewInformationSourceRelationship,
      interviewAmbulates,
      interviewIsIntubated,
      paduaActiveCancer,
      paduaPreviousVte,
      paduaKnownThrombophilia,
      paduaRecentTraumaOrSurgery,
      paduaHeartOrRespiratoryFailure,
      paduaAcuteMiOrIschemicStroke,
      paduaAcuteInfectionOrRheumatologicDisorder,
      paduaHormonalTreatment,
      paduaContraindicationToPharmacologicProphylaxis,
      paduaNotes,
      lamgCriticallyIll,
      lamgShock,
      lamgCoagulopathy,
      lamgChronicLiverDisease,
      lamgNeurocritical,
      lamgEnteralNutrition,
      lamgAgent,
      lamgNotes,
      interviewInterventionMotive,
      interviewSubjective,
      interviewRelevantSymptoms,
      interviewPendingIssues,
      interviewPlan,
      responsibleLogin: sessionUsername
    });

    await recordAuditLogSafely({
      actorLogin: sessionUsername,
      action: "admission_updated",
      resourceType: "admission",
      resourceId: admission.id,
      patientId: admission.patientId,
      patientNameSnapshot: admission.patientName,
      metadata: {
        source: "api_admissions_update",
        teamId,
        bed,
        hasMeasurements,
        hasAdmissionSummary: Boolean(admissionSummary),
        hasRoundSummary: Boolean(roundSummary)
      }
    });

    return NextResponse.json({ ok: true, admission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar internação.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
