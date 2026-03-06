import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addMedicalPrescription } from "@/lib/db";

export const runtime = "nodejs";

function normalizeDateTimeInput(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const directParsed = new Date(trimmed);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.toISOString();
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!brMatch) {
    return undefined;
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
    return undefined;
  }

  return parsed.toISOString();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  const routeParams = await params;
  const patientId = Number(routeParams.id);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const admissionIdRaw = body.admissionId;
  const admissionId =
    admissionIdRaw === undefined || admissionIdRaw === null || admissionIdRaw === ""
      ? undefined
      : Number(admissionIdRaw);
  const medicationIdRaw = body.medicationId;
  const medicationId =
    medicationIdRaw === undefined || medicationIdRaw === null || medicationIdRaw === ""
      ? undefined
      : Number(medicationIdRaw);
  const medicationName = typeof body.medicationName === "string" ? body.medicationName.trim() : "";
  const doseRaw = body.dose;
  const dose = typeof doseRaw === "number" ? doseRaw : Number(doseRaw);
  const doseUnit = typeof body.doseUnit === "string" ? body.doseUnit.trim() : "";
  const administrationRoute =
    typeof body.administrationRoute === "string" ? body.administrationRoute.trim() : "";
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const shifts = typeof body.shifts === "string" ? body.shifts.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const validationStatus =
    typeof body.validationStatus === "string" ? body.validationStatus.trim() : "";
  const validationStartAtRaw =
    typeof body.validationStartAt === "string" ? body.validationStartAt.trim() : "";
  const validationEndAtRaw = typeof body.validationEndAt === "string" ? body.validationEndAt.trim() : "";
  const validationStartAt = normalizeDateTimeInput(validationStartAtRaw);
  const validationEndAt = normalizeDateTimeInput(validationEndAtRaw);

  if (admissionId !== undefined && (!Number.isInteger(admissionId) || admissionId <= 0)) {
    return NextResponse.json({ message: "Internação inválida." }, { status: 400 });
  }

  if (medicationId !== undefined && (!Number.isInteger(medicationId) || medicationId <= 0)) {
    return NextResponse.json({ message: "Medicamento inválido." }, { status: 400 });
  }

  if (!Number.isFinite(dose) || dose <= 0 || !doseUnit || !frequency) {
    return NextResponse.json(
      { message: "Preencha dose, unidade e frequência." },
      { status: 400 }
    );
  }

  if (!medicationId && !medicationName) {
    return NextResponse.json(
      { message: "Selecione um medicamento cadastrado ou informe o nome." },
      { status: 400 }
    );
  }

  if (validationStartAtRaw && !validationStartAt) {
    return NextResponse.json(
      { message: "Data de início da validação inválida." },
      { status: 400 }
    );
  }

  if (validationEndAtRaw && !validationEndAt) {
    return NextResponse.json(
      { message: "Data de fim da validação inválida." },
      { status: 400 }
    );
  }

  try {
    const prescription = await addMedicalPrescription({
      patientId,
      admissionId,
      medicationId,
      medicationName,
      dose,
      doseUnit,
      administrationRoute,
      frequency,
      shifts,
      notes,
      validationStartAt,
      validationEndAt,
      validationStatus
    });

    return NextResponse.json({ ok: true, prescription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar prescrição.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
