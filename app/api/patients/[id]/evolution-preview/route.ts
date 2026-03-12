import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  findProfessionalByLogin,
  listMedicalPrescriptions,
  listPatientAllergies,
  listPatientExamImports,
  listPatients,
  listPriorMedications
} from "@/lib/db";

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

    const professionalSignature = currentProfessional
      ? `${currentProfessional.fullName} - ${currentProfessional.councilType}/${currentProfessional.stateUf} ${currentProfessional.councilNumber}`
      : session.username;

    return NextResponse.json({
      ok: true,
      preview: {
        patient,
        allergies,
        priorMedications,
        latestExamImport: examImports[0] ?? null,
        prescriptions,
        professionalSignature
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar a prévia da evolução.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
