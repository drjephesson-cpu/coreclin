import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addPriorMedication } from "@/lib/db";

export const runtime = "nodejs";

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
  const medicationIdRaw = body.medicationId;
  const medicationId =
    medicationIdRaw === undefined || medicationIdRaw === null || medicationIdRaw === ""
      ? undefined
      : Number(medicationIdRaw);
  const medicationName = typeof body.medicationName === "string" ? body.medicationName.trim() : "";
  const doseRaw = body.dose;
  const dose = typeof doseRaw === "number" ? doseRaw : Number(doseRaw);
  const doseUnit = typeof body.doseUnit === "string" ? body.doseUnit.trim() : "";
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const shifts = typeof body.shifts === "string" ? body.shifts.trim() : "";

  if (medicationId !== undefined && (!Number.isInteger(medicationId) || medicationId <= 0)) {
    return NextResponse.json({ message: "Medicamento inválido." }, { status: 400 });
  }

  if (!Number.isFinite(dose) || dose <= 0 || !doseUnit || !frequency || !shifts) {
    return NextResponse.json(
      { message: "Preencha dose, unidade, frequência e turnos." },
      { status: 400 }
    );
  }

  if (!medicationId && !medicationName) {
    return NextResponse.json(
      { message: "Selecione um medicamento cadastrado ou informe o nome." },
      { status: 400 }
    );
  }

  try {
    const priorMedication = await addPriorMedication({
      patientId,
      medicationId,
      medicationName,
      dose,
      doseUnit,
      frequency,
      shifts
    });

    return NextResponse.json({ ok: true, priorMedication });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar medicamento prévio.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
