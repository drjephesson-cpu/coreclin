import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addPatientMeasurement } from "@/lib/db";

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
  const weightKgRaw = body.weightKg;
  const heightCmRaw = body.heightCm;
  const weightKg = typeof weightKgRaw === "number" ? weightKgRaw : Number(weightKgRaw);
  const heightCm = typeof heightCmRaw === "number" ? heightCmRaw : Number(heightCmRaw);

  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    return NextResponse.json({ message: "Peso e altura devem ser positivos." }, { status: 400 });
  }

  try {
    const measurement = await addPatientMeasurement(patientId, weightKg, heightCm);
    return NextResponse.json({ ok: true, measurement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar medidas.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
