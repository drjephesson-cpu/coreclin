import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addAdmissionRoundNote, recordAuditLogSafely } from "@/lib/db";

export const runtime = "nodejs";

function buildIsoAdmissionDate(year: number, month: number, day: number): string | null {
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeAdmissionDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|T|$)/);
  if (isoMatch) {
    return buildIsoAdmissionDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\b|\s|$)/);
  if (!brMatch) {
    return null;
  }

  const day = Number(brMatch[1]);
  const month = Number(brMatch[2]);
  const year = Number(brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3]);

  return buildIsoAdmissionDate(year, month, day);
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
  const admissionId = Number(routeParams.id);
  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    return NextResponse.json({ message: "Internação inválida." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const roundDate = normalizeAdmissionDate(typeof body.roundDate === "string" ? body.roundDate : "");

  if (!note) {
    return NextResponse.json({ message: "Escreva o comentário do round." }, { status: 400 });
  }

  if (!roundDate) {
    return NextResponse.json({ message: "Informe a data do round no formato DD/MM/AAAA." }, { status: 400 });
  }

  try {
    const roundNote = await addAdmissionRoundNote({
      admissionId,
      roundDate,
      note,
      responsibleLogin: session.username
    });

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "admission_round_note_created",
      resourceType: "admission_round_note",
      resourceId: roundNote.id,
      patientId: roundNote.patientId,
      patientNameSnapshot: roundNote.patientName,
      metadata: {
        source: "api_admission_round_notes_create",
        admissionId,
        roundDate
      }
    });

    return NextResponse.json({ ok: true, roundNote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar o resumo do round.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
