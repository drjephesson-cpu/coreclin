import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createAdmission } from "@/lib/db";

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
  const patientIdRaw = body.patientId;
  const admissionDate = typeof body.admissionDate === "string" ? body.admissionDate : "";
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const admissionReason = typeof body.admissionReason === "string" ? body.admissionReason.trim() : "";
  const teamIdRaw = body.teamId;

  const patientId = typeof patientIdRaw === "number" ? patientIdRaw : Number(patientIdRaw);
  const teamId = typeof teamIdRaw === "number" ? teamIdRaw : Number(teamIdRaw);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  if (!admissionDate || !bed || !admissionReason) {
    return NextResponse.json({ message: "Preencha os campos obrigatórios da internação." }, { status: 400 });
  }

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json({ message: "Equipe inválida." }, { status: 400 });
  }

  try {
    const admission = await createAdmission({
      patientId,
      admissionDate,
      bed,
      admissionReason,
      teamId,
      responsibleLogin: session.username
    });

    return NextResponse.json({ ok: true, admission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar internação.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

