import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, createSessionToken, validateLoginCredentials } from "@/lib/auth";

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

  if (!validateLoginCredentials(username, password)) {
    return NextResponse.json(
      { message: "Usuário ou senha incorretos." },
      { status: 401 }
    );
  }

  const token = createSessionToken(username);
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

