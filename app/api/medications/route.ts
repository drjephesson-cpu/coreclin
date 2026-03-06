import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createMedication } from "@/lib/db";

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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const defaultUnit = typeof body.defaultUnit === "string" ? body.defaultUnit.trim() : "";
  const therapeuticClass =
    typeof body.therapeuticClass === "string" ? body.therapeuticClass.trim() : "";

  if (!name || !defaultUnit) {
    return NextResponse.json(
      { message: "Informe nome do medicamento e unidade padrão." },
      { status: 400 }
    );
  }

  try {
    const medication = await createMedication({ name, defaultUnit, therapeuticClass });
    return NextResponse.json({ ok: true, medication });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar medicamento.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
