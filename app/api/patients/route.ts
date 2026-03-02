import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createPatientWithInitialMeasurement } from "@/lib/db";

export const runtime = "nodejs";

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
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const chartNumber = typeof body.chartNumber === "string" ? body.chartNumber.trim() : "";
  const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
  const admissionDate = typeof body.admissionDate === "string" ? body.admissionDate : "";
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const admissionReason = typeof body.admissionReason === "string" ? body.admissionReason.trim() : "";
  const teamIdRaw = body.teamId;
  const weightKgRaw = body.weightKg;
  const heightCmRaw = body.heightCm;

  const teamId = typeof teamIdRaw === "number" ? teamIdRaw : Number(teamIdRaw);
  const weightKg = typeof weightKgRaw === "number" ? weightKgRaw : Number(weightKgRaw);
  const heightCm = typeof heightCmRaw === "number" ? heightCmRaw : Number(heightCmRaw);

  if (!fullName || !chartNumber || !birthDate || !admissionDate || !bed || !admissionReason) {
    return NextResponse.json({ message: "Preencha os campos obrigatórios do paciente." }, { status: 400 });
  }

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ message: "Equipe inválida." }, { status: 400 });
  }

  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    return NextResponse.json(
      { message: "Peso e altura devem ser números positivos." },
      { status: 400 }
    );
  }

  try {
    const patient = await createPatientWithInitialMeasurement({
      fullName,
      chartNumber,
      birthDate,
      admissionDate,
      bed,
      admissionReason,
      teamId,
      weightKg,
      heightCm,
      responsibleLogin: session.username
    });

    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar paciente.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
