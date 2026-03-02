import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  BSA_FORMULA_OPTIONS,
  BMI_FORMULA_OPTIONS,
  type BmiFormulaId,
  type BsaFormulaId
} from "@/lib/coreclin-types";
import { createAdmission } from "@/lib/db";

export const runtime = "nodejs";

function isBmiFormulaId(value: string): value is BmiFormulaId {
  return BMI_FORMULA_OPTIONS.some((formula) => formula.id === value);
}

function isBsaFormulaId(value: string): value is BsaFormulaId {
  return BSA_FORMULA_OPTIONS.some((formula) => formula.id === value);
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const patientIdRaw = body.patientId;
  const admissionDate = typeof body.admissionDate === "string" ? body.admissionDate : "";
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const admissionReason = typeof body.admissionReason === "string" ? body.admissionReason.trim() : "";
  const teamIdRaw = body.teamId;
  const weightKgRaw = body.weightKg;
  const heightCmRaw = body.heightCm;
  const bmiFormulaRaw = typeof body.bmiFormula === "string" ? body.bmiFormula : "";
  const bsaFormulaRaw = typeof body.bsaFormula === "string" ? body.bsaFormula : "";

  const patientId = typeof patientIdRaw === "number" ? patientIdRaw : Number(patientIdRaw);
  const teamId = typeof teamIdRaw === "number" ? teamIdRaw : Number(teamIdRaw);
  const weightKg = typeof weightKgRaw === "number" ? weightKgRaw : Number(weightKgRaw);
  const heightCm = typeof heightCmRaw === "number" ? heightCmRaw : Number(heightCmRaw);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  if (!admissionDate || !bed || !admissionReason) {
    return NextResponse.json({ message: "Preencha os campos obrigatórios da internação." }, { status: 400 });
  }

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ message: "Equipe inválida." }, { status: 400 });
  }

  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    return NextResponse.json({ message: "Peso e altura devem ser positivos." }, { status: 400 });
  }

  if (!isBmiFormulaId(bmiFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de IMC inválida." }, { status: 400 });
  }

  if (!isBsaFormulaId(bsaFormulaRaw)) {
    return NextResponse.json({ message: "Calculadora de superfície corporal inválida." }, { status: 400 });
  }

  try {
    const admission = await createAdmission({
      patientId,
      admissionDate,
      bed,
      admissionReason,
      teamId,
      weightKg,
      heightCm,
      bmiFormula: bmiFormulaRaw,
      bsaFormula: bsaFormulaRaw,
      responsibleLogin: session.username
    });

    return NextResponse.json({ ok: true, admission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar internação.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
