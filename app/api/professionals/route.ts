import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import {
  COUNCIL_OPTIONS,
  PROFESSION_OPTIONS,
  type CouncilOption,
  type ProfessionOption
} from "@/lib/coreclin-types";
import {
  createProfessional,
  recordAuditLogSafely,
  updateProfessional,
} from "@/lib/db";

export const runtime = "nodejs";

function isProfessionOption(value: string): value is ProfessionOption {
  return (PROFESSION_OPTIONS as readonly string[]).includes(value);
}

function isCouncilOption(value: string): value is CouncilOption {
  return (COUNCIL_OPTIONS as readonly string[]).includes(value);
}

function normalizeProfessionalPayload(payload: unknown): {
  fullName: string;
  professionRaw: string;
  councilTypeRaw: string;
  councilNumber: string;
  stateUf: string;
  login: string;
  password: string;
  institution: string;
  isTrainee: boolean;
  supervisingPharmacistId: number | null;
} {
  const body = payload as Record<string, unknown>;

  const supervisingPharmacistIdRaw = body.supervisingPharmacistId;
  return {
    fullName: typeof body.fullName === "string" ? body.fullName.trim() : "",
    professionRaw: typeof body.profession === "string" ? body.profession : "",
    councilTypeRaw: typeof body.councilType === "string" ? body.councilType : "",
    councilNumber: typeof body.councilNumber === "string" ? body.councilNumber.trim() : "",
    stateUf: typeof body.stateUf === "string" ? body.stateUf.trim().toUpperCase() : "",
    login: typeof body.login === "string" ? body.login.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password : "",
    institution: typeof body.institution === "string" ? body.institution.trim() : "",
    isTrainee:
      body.isTrainee === true || body.isTrainee === "true" || body.isTrainee === "sim",
    supervisingPharmacistId:
      supervisingPharmacistIdRaw === undefined ||
      supervisingPharmacistIdRaw === null ||
      supervisingPharmacistIdRaw === ""
        ? null
        : Number(supervisingPharmacistIdRaw)
  };
}

function validateProfessionalPayload(input: {
  fullName: string;
  professionRaw: string;
  councilTypeRaw: string;
  councilNumber: string;
  stateUf: string;
  login: string;
  password: string;
  institution: string;
  isTrainee: boolean;
  supervisingPharmacistId: number | null;
  requirePassword: boolean;
}): NextResponse | null {
  if (!input.fullName || !input.login || !input.institution || (input.requirePassword && !input.password)) {
    return NextResponse.json({ message: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  if (!isProfessionOption(input.professionRaw)) {
    return NextResponse.json({ message: "Profissão inválida." }, { status: 400 });
  }

  if (input.isTrainee) {
    if (
      input.supervisingPharmacistId === null ||
      !Number.isInteger(input.supervisingPharmacistId) ||
      input.supervisingPharmacistId <= 0
    ) {
      return NextResponse.json(
        { message: "Selecione o farmacêutico responsável pelo estagiário." },
        { status: 400 }
      );
    }

    return null;
  }

  if (!input.councilNumber) {
    return NextResponse.json({ message: "Informe o número do conselho." }, { status: 400 });
  }

  if (!isCouncilOption(input.councilTypeRaw)) {
    return NextResponse.json({ message: "Conselho inválido." }, { status: 400 });
  }

  if (!/^[A-Z]{2}$/.test(input.stateUf)) {
    return NextResponse.json({ message: "UF inválida. Use duas letras." }, { status: 400 });
  }

  return null;
}

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

  const normalized = normalizeProfessionalPayload(payload);
  const validationError = validateProfessionalPayload({ ...normalized, requirePassword: true });
  if (validationError) {
    return validationError;
  }

  try {
    const professional = await createProfessional({
      fullName: normalized.fullName,
      profession: normalized.professionRaw as ProfessionOption,
      councilType: normalized.isTrainee ? null : (normalized.councilTypeRaw as CouncilOption),
      councilNumber: normalized.isTrainee ? null : normalized.councilNumber,
      stateUf: normalized.isTrainee ? null : normalized.stateUf,
      login: normalized.login,
      password: normalized.password,
      institution: normalized.institution,
      isTrainee: normalized.isTrainee,
      supervisingPharmacistId: normalized.supervisingPharmacistId
    });

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "professional_created",
      resourceType: "professional",
      resourceId: professional.id,
      metadata: {
        source: "api_professionals_create",
        login: professional.login,
        profession: professional.profession,
        isTrainee: professional.isTrainee
      }
    });

    return NextResponse.json({ ok: true, professional });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar profissional.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
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
  const professionalId = Number(body.professionalId);
  if (!Number.isInteger(professionalId) || professionalId <= 0) {
    return NextResponse.json({ message: "Profissional inválido." }, { status: 400 });
  }

  const normalized = normalizeProfessionalPayload(payload);
  const validationError = validateProfessionalPayload({ ...normalized, requirePassword: false });
  if (validationError) {
    return validationError;
  }

  try {
    const professional = await updateProfessional({
      professionalId,
      fullName: normalized.fullName,
      profession: normalized.professionRaw as ProfessionOption,
      councilType: normalized.isTrainee ? null : (normalized.councilTypeRaw as CouncilOption),
      councilNumber: normalized.isTrainee ? null : normalized.councilNumber,
      stateUf: normalized.isTrainee ? null : normalized.stateUf,
      login: normalized.login,
      password: normalized.password,
      institution: normalized.institution,
      isTrainee: normalized.isTrainee,
      supervisingPharmacistId: normalized.supervisingPharmacistId
    });

    await recordAuditLogSafely({
      actorLogin: session.username,
      action: "professional_updated",
      resourceType: "professional",
      resourceId: professional.id,
      metadata: {
        source: "api_professionals_update",
        login: professional.login,
        profession: professional.profession,
        isTrainee: professional.isTrainee
      }
    });

    return NextResponse.json({ ok: true, professional });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar profissional.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
