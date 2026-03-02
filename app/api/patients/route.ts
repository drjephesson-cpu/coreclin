import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createPatient } from "@/lib/db";

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

  if (!fullName || !chartNumber || !birthDate) {
    return NextResponse.json({ message: "Preencha os campos obrigatórios do paciente." }, { status: 400 });
  }

  try {
    const patient = await createPatient({
      fullName,
      chartNumber,
      birthDate,
      responsibleLogin: session.username
    });

    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar paciente.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
