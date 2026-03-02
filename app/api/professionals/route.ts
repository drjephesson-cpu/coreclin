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
} from "@/lib/db";

export const runtime = "nodejs";

function isProfessionOption(value: string): value is ProfessionOption {
  return (PROFESSION_OPTIONS as readonly string[]).includes(value);
}

function isCouncilOption(value: string): value is CouncilOption {
  return (COUNCIL_OPTIONS as readonly string[]).includes(value);
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

  const body = payload as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const professionRaw = typeof body.profession === "string" ? body.profession : "";
  const councilTypeRaw = typeof body.councilType === "string" ? body.councilType : "";
  const councilNumber = typeof body.councilNumber === "string" ? body.councilNumber.trim() : "";
  const stateUf = typeof body.stateUf === "string" ? body.stateUf.trim().toUpperCase() : "";
  const login = typeof body.login === "string" ? body.login.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const institution = typeof body.institution === "string" ? body.institution.trim() : "";

  if (!fullName || !councilNumber || !login || !password || !institution) {
    return NextResponse.json({ message: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  if (!isProfessionOption(professionRaw)) {
    return NextResponse.json({ message: "Profissão inválida." }, { status: 400 });
  }

  if (!isCouncilOption(councilTypeRaw)) {
    return NextResponse.json({ message: "Conselho inválido." }, { status: 400 });
  }

  if (!/^[A-Z]{2}$/.test(stateUf)) {
    return NextResponse.json({ message: "UF inválida. Use duas letras." }, { status: 400 });
  }

  try {
    const professional = await createProfessional({
      fullName,
      profession: professionRaw,
      councilType: councilTypeRaw,
      councilNumber,
      stateUf,
      login,
      password,
      institution
    });

    return NextResponse.json({ ok: true, professional });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cadastrar profissional.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
