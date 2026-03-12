import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  listAdmissionRoundNotes,
  listMedicalPrescriptions,
  listPatientAllergies,
  listPatientExamImports,
  listPatients,
  listPriorMedications,
  listRecentAdmissions
} from "@/lib/db";
import { type PatientDashboardDetails } from "@/lib/coreclin-types";

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
    const [patients, admissions, allergies, priorMedications, examImports, roundNotes, prescriptions] =
      await Promise.all([
      listPatients(patientId, { includeLatestDetails: true }),
      listRecentAdmissions(200, patientId),
      listPatientAllergies(patientId),
      listPriorMedications(patientId),
      listPatientExamImports(patientId, { includeRawText: "latest" }),
      listAdmissionRoundNotes(patientId),
      listMedicalPrescriptions(patientId, {
        backfillInterventionProfessionalLogin: session.username,
        backfillValidationProfessionalLogin: session.username
      })
      ]);

    const patient = patients[0] ?? null;
    if (!patient) {
      return NextResponse.json({ message: "Paciente não encontrado." }, { status: 404 });
    }

    const patientDetails: PatientDashboardDetails = {
      patient,
      admissions,
      allergies,
      priorMedications,
      examImports,
      roundNotes,
      prescriptions
    };

    return NextResponse.json({ patientDetails });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar os dados completos do paciente.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
