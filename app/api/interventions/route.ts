import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { listMedicalPrescriptions } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  try {
    const prescriptions = await listMedicalPrescriptions(null, {
      backfillInterventionProfessionalLogin: session.username
    });
    return NextResponse.json({ prescriptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar as intervenções.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
