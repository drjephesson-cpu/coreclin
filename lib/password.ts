import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString(
    "hex"
  );

  return `${salt}:${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const derived = pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString(
    "hex"
  );
  const derivedBuffer = Buffer.from(derived, "utf8");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, expectedBuffer);
}

