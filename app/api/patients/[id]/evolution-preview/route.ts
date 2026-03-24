import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  findProfessionalByLogin,
  listMedicalPrescriptions,
  listPatientAllergies,
  listPatientExamImports,
  listPatients,
  listPriorMedications,
  recordAuditLogSafely
} from "@/lib/db";
import { buildProfessionalSignatureLines } from "@/lib/professional-display";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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

  try {
    const [patients, allergies, priorMedications, examImports, prescriptions, currentProfessional] =
      await Promise.all([
        listPatients(patientId, { includeLatestDetails: true }),
        listPatientAllergies(patientId),
        listPriorMedications(patientId),
        listPatientExamImports(patientId),
        listMedicalPrescriptions(patientId, {
          backfillInterventionProfessionalLogin: session.username,
          backfillValidationProfessionalLogin: session.username
        }),
        findProfessionalByLogin(session.username)
      ]);

    const patient = patients[0] ?? null;
    if (!patient) {
      return NextResponse.json({ message: "Paciente não encontrado." }, { status: 404 });
    }

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "patient_evolution_preview_viewed",
      resourceType: "patient_evolution_preview",
      resourceId: patientId,
      patientId,
      patientNameSnapshot: patient.fullName,
      metadata: {
        source: "api_patient_evolution_preview"
      }
    });

    return NextResponse.json({
      ok: true,
      preview: {
        patient,
        allergies,
        priorMedications,
        latestExamImport: examImports[0] ?? null,
        prescriptions,
        professionalSignatureLines: buildProfessionalSignatureLines(
          currentProfessional,
          session.username
        )
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar a prévia da evolução.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
