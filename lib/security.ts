import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getAdminAccessToken } from "@/lib/env";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function accessCodePrefix(name: string) {
  const first = name
    .trim()
    .split(/\s+/)[0]
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return first || "NIMIO";
}

export function generateAccessCode(name: string) {
  const random = Array.from(randomBytes(4))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");

  return `${accessCodePrefix(name)}-${random}`;
}

export function fingerprintRequest(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(parts.map((part) => part?.trim().toLowerCase() || "").join("|"))
    .digest("hex");
}

export function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function isValidAdminToken(input: string) {
  const expected = getAdminAccessToken();
  return Boolean(expected) && input.length > 0 && secureCompare(input, expected as string);
}
