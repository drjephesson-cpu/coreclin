import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addPatientAllergy, removePatientAllergy } from "@/lib/db";

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
  const allergyName = typeof body.allergyName === "string" ? body.allergyName.trim() : "";
  const reactionDescription =
    typeof body.reactionDescription === "string" ? body.reactionDescription.trim() : "";

  if (!allergyName) {
    return NextResponse.json({ message: "Informe a alergia." }, { status: 400 });
  }

  try {
    const allergy = await addPatientAllergy({
      patientId,
      allergyName,
      reactionDescription: reactionDescription || null
    });
    return NextResponse.json({ ok: true, allergy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar alergia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
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
  const allergyId = Number(body.allergyId);

  if (!Number.isInteger(allergyId) || allergyId <= 0) {
    return NextResponse.json({ message: "Alergia inválida." }, { status: 400 });
  }

  try {
    await removePatientAllergy({ patientId, allergyId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover alergia.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
