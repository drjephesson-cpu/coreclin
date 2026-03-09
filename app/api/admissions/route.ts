import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId
} from "@/lib/coreclin-types";
import { createAdmission, updateAdmission } from "@/lib/db";

export const runtime = "nodejs";

function isBmiFormulaId(value: string): value is BmiFormulaId {
  return BMI_FORMULA_OPTIONS.some((formula) => formula.id === value);
}

function isBsaFormulaId(value: string): value is BsaFormulaId {
  return BSA_FORMULA_OPTIONS.some((formula) => formula.id === value);
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
  const teamIdRaw = body.teamId;
  const weightKgRaw = body.weightKg;
  const heightCmRaw = body.heightCm;
  const bmiFormulaRaw = typeof body.bmiFormula === "string" ? body.bmiFormula : "";
  const bsaFormulaRaw = typeof body.bsaFormula === "string" ? body.bsaFormula : "";

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

  const bmiFormula = hasMeasurements ? (bmiFormulaRaw as BmiFormulaId) : undefined;
  const bsaFormula = hasMeasurements ? (bsaFormulaRaw as BsaFormulaId) : undefined;

  try {
    const admission = await createAdmission({
      patientId,
      admissionDate,
      bed,
      admissionReason,
      teamId,
      weightKg,
      heightCm,
      bmiFormula,
      bsaFormula,
      responsibleLogin: sessionUsername
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
  const teamId = parseOptionalPositiveNumber(body.teamId);
  const weightKg = parseOptionalPositiveNumber(body.weightKg);
  const heightCm = parseOptionalPositiveNumber(body.heightCm);
  const bmiFormulaRaw = typeof body.bmiFormula === "string" ? body.bmiFormula : "";
  const bsaFormulaRaw = typeof body.bsaFormula === "string" ? body.bsaFormula : "";
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

  const bmiFormula = hasMeasurements ? (bmiFormulaRaw as BmiFormulaId) : undefined;
  const bsaFormula = hasMeasurements ? (bsaFormulaRaw as BsaFormulaId) : undefined;

  try {
    const admission = await updateAdmission({
      admissionId,
      admissionDate,
      bed,
      admissionReason,
      teamId,
      weightKg,
      heightCm,
      bmiFormula,
      bsaFormula,
      responsibleLogin: sessionUsername
    });

    return NextResponse.json({ ok: true, admission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar internação.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
