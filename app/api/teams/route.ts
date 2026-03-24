import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createTeam, recordAuditLogSafely } from "@/lib/db";

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

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "team_created",
      resourceType: "team",
      resourceId: team.id,
      metadata: {
        source: "api_teams_create",
        teamName: team.name
      }
    });

    return NextResponse.json({ ok: true, team });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar equipe.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
