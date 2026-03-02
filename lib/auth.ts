import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

const AUTH_USERNAME = (process.env.AUTH_USERNAME ?? "jephesson").trim().toLowerCase();
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "ufpb2010";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "troque-este-segredo-em-producao";

export const SESSION_COOKIE_NAME = "coreclin_session";

export type SessionData = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

function signPayload(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

export function validateLegacyCredentials(username: string, password: string): boolean {
  return username.trim().toLowerCase() === AUTH_USERNAME && password === AUTH_PASSWORD;
}

export function createSessionToken(username: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const normalizedUsername = username.trim().toLowerCase();
  const payload = `${normalizedUsername}.${issuedAt}.${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function getSessionFromToken(token: string): SessionData | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, issuedAtRaw, expiresAtRaw, signature] = decoded.split(".");
    if (!username || !issuedAtRaw || !expiresAtRaw || !signature) {
      return null;
    }

    const payload = `${username}.${issuedAtRaw}.${expiresAtRaw}`;
    const expectedSignature = signPayload(payload);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    const isValidSignature = timingSafeEqual(providedBuffer, expectedBuffer);
    if (!isValidSignature) {
      return null;
    }

    const issuedAt = Number(issuedAtRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isInteger(issuedAt) || !Number.isInteger(expiresAt)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= expiresAt) {
      return null;
    }

    return { username, issuedAt, expiresAt };
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return getSessionFromToken(token);
}
