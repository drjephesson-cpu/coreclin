import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { addPriorMedication, removePriorMedication, updatePriorMedication } from "@/lib/db";

export const runtime = "nodejs";

function parseOptionalDecimalInput(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "invalid";
  }

  if (typeof value !== "string") {
    return "invalid";
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : "invalid";
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
  const medicationIdRaw = body.medicationId;
  const medicationId =
    medicationIdRaw === undefined || medicationIdRaw === null || medicationIdRaw === ""
      ? undefined
      : Number(medicationIdRaw);
  const medicationName = typeof body.medicationName === "string" ? body.medicationName.trim() : "";
  const preserveTypedName =
    body.preserveTypedName === true || body.preserveTypedName === "true";
  const dose = parseOptionalDecimalInput(body.dose);
  const doseUnit = typeof body.doseUnit === "string" ? body.doseUnit.trim() : "";
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const shifts = typeof body.shifts === "string" ? body.shifts.trim() : "";
  const quantityRaw = body.quantityTablets;
  const quantityTablets =
    quantityRaw === undefined || quantityRaw === null || quantityRaw === ""
      ? undefined
      : Number(quantityRaw);
  const lotNumber = typeof body.lotNumber === "string" ? body.lotNumber.trim() : "";
  const expirationDate =
    typeof body.expirationDate === "string" ? body.expirationDate.trim() : "";
  const manufacturer = typeof body.manufacturer === "string" ? body.manufacturer.trim() : "";

  if (medicationId !== undefined && (!Number.isInteger(medicationId) || medicationId <= 0)) {
    return NextResponse.json({ message: "Medicamento inválido." }, { status: 400 });
  }

  if (dose === "invalid" || (dose !== null && dose <= 0)) {
    return NextResponse.json({ message: "Dose inválida." }, { status: 400 });
  }

  if (dose !== null && !doseUnit) {
    return NextResponse.json({ message: "Informe a unidade da dose." }, { status: 400 });
  }

  if (!medicationId && !medicationName) {
    return NextResponse.json(
      { message: "Selecione um medicamento cadastrado ou informe o nome." },
      { status: 400 }
    );
  }

  if (
    quantityTablets !== undefined &&
    (!Number.isInteger(quantityTablets) || quantityTablets < 0)
  ) {
    return NextResponse.json({ message: "Quantidade inválida." }, { status: 400 });
  }

  if (expirationDate && Number.isNaN(new Date(expirationDate).getTime())) {
    return NextResponse.json({ message: "Validade inválida." }, { status: 400 });
  }

  try {
    const priorMedication = await addPriorMedication({
      patientId,
      medicationId,
      medicationName,
      preserveTypedName,
      dose,
      doseUnit,
      frequency,
      shifts,
      quantityTablets,
      lotNumber,
      expirationDate,
      manufacturer
    });

    return NextResponse.json({ ok: true, priorMedication });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar medicamento prévio.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
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
  const priorMedicationId = Number(body.priorMedicationId);

  if (!Number.isInteger(priorMedicationId) || priorMedicationId <= 0) {
    return NextResponse.json({ message: "Medicamento prévio inválido." }, { status: 400 });
  }

  try {
    await removePriorMedication({ patientId, priorMedicationId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover medicamento prévio.";
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
  const priorMedicationId = Number(body.priorMedicationId);
  const medicationIdRaw = body.medicationId;
  const medicationId =
    medicationIdRaw === undefined || medicationIdRaw === null || medicationIdRaw === ""
      ? undefined
      : Number(medicationIdRaw);
  const medicationNameRaw =
    typeof body.medicationName === "string" ? body.medicationName.trim() : undefined;
  const preserveTypedName =
    body.preserveTypedName === true || body.preserveTypedName === "true";
  const dose = parseOptionalDecimalInput(body.dose);
  const doseUnit = typeof body.doseUnit === "string" ? body.doseUnit.trim() : "";
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const shifts = typeof body.shifts === "string" ? body.shifts.trim() : "";
  const reconciliationManualStatusRaw = body.reconciliationManualStatus;
  const reconciliationManualStatus =
    reconciliationManualStatusRaw === null ||
    reconciliationManualStatusRaw === "" ||
    reconciliationManualStatusRaw === undefined
      ? null
      : reconciliationManualStatusRaw === true ||
          reconciliationManualStatusRaw === "true" ||
          reconciliationManualStatusRaw === "sim"
        ? true
        : reconciliationManualStatusRaw === false ||
            reconciliationManualStatusRaw === "false" ||
            reconciliationManualStatusRaw === "nao" ||
            reconciliationManualStatusRaw === "não"
          ? false
          : "invalid";
  const reconciliationPrescriptionIdRaw = body.reconciliationPrescriptionId;
  const reconciliationPrescriptionId =
    reconciliationPrescriptionIdRaw === undefined ||
    reconciliationPrescriptionIdRaw === null ||
    reconciliationPrescriptionIdRaw === ""
      ? null
      : Number(reconciliationPrescriptionIdRaw);

  if (!Number.isInteger(priorMedicationId) || priorMedicationId <= 0) {
    return NextResponse.json({ message: "Medicamento prévio inválido." }, { status: 400 });
  }

  if (medicationId !== undefined && (!Number.isInteger(medicationId) || medicationId <= 0)) {
    return NextResponse.json({ message: "Medicamento inválido." }, { status: 400 });
  }

  if (dose === "invalid" || (dose !== null && dose <= 0)) {
    return NextResponse.json({ message: "Dose inválida." }, { status: 400 });
  }

  if (dose !== null && !doseUnit) {
    return NextResponse.json({ message: "Informe a unidade da dose." }, { status: 400 });
  }

  if (medicationNameRaw !== undefined && !medicationNameRaw) {
    return NextResponse.json(
      { message: "Informe o nome corrigido do medicamento." },
      { status: 400 }
    );
  }

  if (reconciliationManualStatus === "invalid") {
    return NextResponse.json(
      { message: "Situação manual da reconciliação inválida." },
      { status: 400 }
    );
  }

  if (
    reconciliationPrescriptionId !== null &&
    (!Number.isInteger(reconciliationPrescriptionId) || reconciliationPrescriptionId <= 0)
  ) {
    return NextResponse.json(
      { message: "Medicamento vinculado da prescrição inválido." },
      { status: 400 }
    );
  }

  try {
    const result = await updatePriorMedication({
      patientId,
      priorMedicationId,
      medicationId,
      medicationName: medicationNameRaw,
      preserveTypedName,
      dose,
      doseUnit,
      frequency,
      shifts,
      reconciliationManualStatus,
      reconciliationPrescriptionId
    });

    return NextResponse.json({
      ok: true,
      priorMedication: result.priorMedication,
      learnedMedication: result.learnedMedication
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar medicamento prévio.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
