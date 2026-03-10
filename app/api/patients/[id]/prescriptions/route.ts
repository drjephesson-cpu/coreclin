import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addMedicalPrescription, updateMedicalPrescriptionValidation } from "@/lib/db";
import {
  MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS,
  type MedicalPrescriptionInterventionResponse
} from "@/lib/coreclin-types";

export const runtime = "nodejs";

function hasOwnProperty(target: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function normalizeDateTimeInput(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const hour = Number(brMatch[4] ?? "0");
    const minute = Number(brMatch[5] ?? "0");
    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return undefined;
    }

    return parsed.toISOString();
  }

  const directParsed = new Date(trimmed);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.toISOString();
  }

  return undefined;
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
  const patientId = Number(routeParams.id);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ message: "Paciente inválido." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const admissionIdRaw = body.admissionId;
  const admissionId =
    admissionIdRaw === undefined || admissionIdRaw === null || admissionIdRaw === ""
      ? undefined
      : Number(admissionIdRaw);
  const medicationIdRaw = body.medicationId;
  const medicationId =
    medicationIdRaw === undefined || medicationIdRaw === null || medicationIdRaw === ""
      ? undefined
      : Number(medicationIdRaw);
  const medicationName = typeof body.medicationName === "string" ? body.medicationName.trim() : "";
  const doseRaw = body.dose;
  const dose = typeof doseRaw === "number" ? doseRaw : Number(doseRaw);
  const doseUnit = typeof body.doseUnit === "string" ? body.doseUnit.trim() : "";
  const administrationRoute =
    typeof body.administrationRoute === "string" ? body.administrationRoute.trim() : "";
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const shifts = typeof body.shifts === "string" ? body.shifts.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const validationStatus =
    typeof body.validationStatus === "string" ? body.validationStatus.trim() : "";
  const validationStartAtRaw =
    typeof body.validationStartAt === "string" ? body.validationStartAt.trim() : "";
  const validationEndAtRaw = typeof body.validationEndAt === "string" ? body.validationEndAt.trim() : "";
  const validationStartAt = normalizeDateTimeInput(validationStartAtRaw);
  const validationEndAt = normalizeDateTimeInput(validationEndAtRaw);
  const externalValidationCandidate = Boolean(body.externalValidationCandidate);

  if (admissionId !== undefined && (!Number.isInteger(admissionId) || admissionId <= 0)) {
    return NextResponse.json({ message: "Internação inválida." }, { status: 400 });
  }

  if (medicationId !== undefined && (!Number.isInteger(medicationId) || medicationId <= 0)) {
    return NextResponse.json({ message: "Medicamento inválido." }, { status: 400 });
  }

  if (!Number.isFinite(dose) || dose <= 0 || !doseUnit || !frequency) {
    return NextResponse.json(
      { message: "Preencha dose, unidade e frequência." },
      { status: 400 }
    );
  }

  if (!medicationId && !medicationName) {
    return NextResponse.json(
      { message: "Selecione um medicamento cadastrado ou informe o nome." },
      { status: 400 }
    );
  }

  if (validationStartAtRaw && !validationStartAt) {
    return NextResponse.json(
      { message: "Data de início da validação inválida." },
      { status: 400 }
    );
  }

  if (validationEndAtRaw && !validationEndAt) {
    return NextResponse.json(
      { message: "Data de fim da validação inválida." },
      { status: 400 }
    );
  }

  try {
    const prescription = await addMedicalPrescription({
      patientId,
      admissionId,
      medicationId,
      medicationName,
      dose,
      doseUnit,
      administrationRoute,
      frequency,
      shifts,
      notes,
      validationStartAt,
      validationEndAt,
      validationStatus,
      externalValidationCandidate
    });

    return NextResponse.json({ ok: true, prescription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar prescrição.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const prescriptionId = Number(body.prescriptionId);
  const quantityRaw = body.quantityTablets;
  const hasQuantityTablets = hasOwnProperty(body, "quantityTablets");
  const quantityTablets =
    !hasQuantityTablets || quantityRaw === undefined || quantityRaw === null || quantityRaw === ""
      ? null
      : Number(quantityRaw);
  const hasLotNumber = hasOwnProperty(body, "lotNumber");
  const lotNumber = typeof body.lotNumber === "string" ? body.lotNumber.trim() : "";
  const hasExpirationDate = hasOwnProperty(body, "expirationDate");
  const expirationDate =
    typeof body.expirationDate === "string" ? body.expirationDate.trim() : "";
  const hasManufacturer = hasOwnProperty(body, "manufacturer");
  const manufacturer = typeof body.manufacturer === "string" ? body.manufacturer.trim() : "";
  const hasInterventionNotes = hasOwnProperty(body, "interventionNotes");
  const interventionNotes =
    typeof body.interventionNotes === "string" ? body.interventionNotes.trim() : "";
  const hasInterventionRequestedToPrescriber = hasOwnProperty(
    body,
    "interventionRequestedToPrescriber"
  );
  const interventionRequestedToPrescriberRaw = body.interventionRequestedToPrescriber;
  const interventionRequestedToPrescriber =
    interventionRequestedToPrescriberRaw === null ||
    interventionRequestedToPrescriberRaw === "" ||
    interventionRequestedToPrescriberRaw === undefined
      ? null
      : interventionRequestedToPrescriberRaw === true ||
          interventionRequestedToPrescriberRaw === "true" ||
          interventionRequestedToPrescriberRaw === "sim"
        ? true
        : interventionRequestedToPrescriberRaw === false ||
            interventionRequestedToPrescriberRaw === "false" ||
            interventionRequestedToPrescriberRaw === "nao" ||
            interventionRequestedToPrescriberRaw === "não"
          ? false
          : "invalid";
  const hasInterventionResponse = hasOwnProperty(body, "interventionResponse");
  const interventionResponseRaw =
    typeof body.interventionResponse === "string" ? body.interventionResponse.trim() : "";
  const interventionResponse =
    !interventionResponseRaw
      ? null
      : MEDICAL_PRESCRIPTION_INTERVENTION_RESPONSE_OPTIONS.includes(
            interventionResponseRaw as MedicalPrescriptionInterventionResponse
          )
        ? (interventionResponseRaw as MedicalPrescriptionInterventionResponse)
        : "invalid";

  if (!Number.isInteger(prescriptionId) || prescriptionId <= 0) {
    return NextResponse.json({ message: "Prescrição inválida." }, { status: 400 });
  }

  if (
    hasQuantityTablets &&
    quantityTablets !== null &&
    (!Number.isInteger(quantityTablets) || quantityTablets < 0)
  ) {
    return NextResponse.json({ message: "Quantidade inválida." }, { status: 400 });
  }

  if (hasExpirationDate && expirationDate && Number.isNaN(new Date(expirationDate).getTime())) {
    return NextResponse.json({ message: "Validade inválida." }, { status: 400 });
  }

  if (
    hasInterventionRequestedToPrescriber &&
    interventionRequestedToPrescriber === "invalid"
  ) {
    return NextResponse.json(
      { message: "Informe se a intervenção foi solicitada ao prescritor." },
      { status: 400 }
    );
  }

  if (hasInterventionResponse && interventionResponse === "invalid") {
    return NextResponse.json({ message: "Resposta da intervenção inválida." }, { status: 400 });
  }

  const safeInterventionRequestedToPrescriber =
    interventionRequestedToPrescriber === "invalid"
      ? null
      : interventionRequestedToPrescriber;
  const safeInterventionResponse =
    interventionResponse === "invalid" ? null : interventionResponse;

  try {
    const prescription = await updateMedicalPrescriptionValidation({
      patientId,
      prescriptionId,
      ...(hasQuantityTablets ? { quantityTablets } : {}),
      ...(hasLotNumber ? { lotNumber } : {}),
      ...(hasExpirationDate ? { expirationDate } : {}),
      ...(hasManufacturer ? { manufacturer } : {}),
      ...(hasInterventionNotes ? { interventionNotes } : {}),
      ...(hasInterventionRequestedToPrescriber
        ? { interventionRequestedToPrescriber: safeInterventionRequestedToPrescriber }
        : {}),
      ...(hasInterventionResponse ? { interventionResponse: safeInterventionResponse } : {})
    });

    return NextResponse.json({ ok: true, prescription });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar validação do medicamento.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
