import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createTeam } from "@/lib/db";

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
  if (!name) {
    return NextResponse.json({ message: "Informe o nome da equipe." }, { status: 400 });
  }

  try {
    const team = await createTeam(name);
    return NextResponse.json({ ok: true, team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar equipe.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
