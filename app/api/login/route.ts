import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, createSessionToken, validateLegacyCredentials } from "@/lib/auth";
import { authenticateProfessional, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  let authenticatedLogin = "";

  if (isDatabaseConfigured()) {
    try {
      const professional = await authenticateProfessional(username, password);
      if (professional) {
        authenticatedLogin = professional.login;
      }
    } catch {
      // Fallback para autenticação legada caso exista problema temporário de banco.
    }
  }

  if (!authenticatedLogin && validateLegacyCredentials(username, password)) {
    authenticatedLogin = username.trim().toLowerCase();
  }

  if (!authenticatedLogin) {
    return NextResponse.json(
      { message: "Usuário ou senha incorretos." },
      { status: 401 }
    );
  }

  const token = createSessionToken(authenticatedLogin);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  });

  return response;
}
