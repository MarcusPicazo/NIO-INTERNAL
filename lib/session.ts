import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret } from "@/lib/env";

const legacyCookieName = "nimio_session";
const adminCookieName = "nimio_admin_session";
const memberCookieName = "nimio_member_session";
const maxAge = 60 * 60 * 24 * 14;
const useSecureCookies =
  process.env.NIMIO_COOKIE_SECURE === "true" ||
  process.env.VERCEL === "1" ||
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");
const sessionCookieOptions = {
  httpOnly: true,
  maxAge,
  path: "/",
  sameSite: "lax" as const,
  secure: useSecureCookies
};

export type NimioSession =
  | {
      role: "admin";
      adminId: string;
      issuedAt: number;
    }
  | {
      role: "member";
      memberId: string;
      issuedAt: number;
    };

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodeSession(session: NimioSession) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string | undefined): NimioSession | null {
  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as NimioSession;

    if (Date.now() - parsed.issuedAt > maxAge * 1000) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function deleteLegacySessionIfRole(role: NimioSession["role"]) {
  const store = cookies();
  const legacySession = decodeSession(store.get(legacyCookieName)?.value);

  if (legacySession?.role === role) {
    store.delete(legacyCookieName);
  }
}

export function getSession() {
  const store = cookies();
  const adminSession = decodeSession(store.get(adminCookieName)?.value);

  if (adminSession?.role === "admin") {
    return adminSession;
  }

  const memberSession = decodeSession(store.get(memberCookieName)?.value);

  if (memberSession?.role === "member") {
    return memberSession;
  }

  return decodeSession(store.get(legacyCookieName)?.value);
}

export function getAdminSession() {
  const store = cookies();
  const session = decodeSession(store.get(adminCookieName)?.value);

  if (session?.role === "admin") {
    return session;
  }

  const legacySession = decodeSession(store.get(legacyCookieName)?.value);
  return legacySession?.role === "admin" ? legacySession : null;
}

export function getMemberSession() {
  const store = cookies();
  const session = decodeSession(store.get(memberCookieName)?.value);

  if (session?.role === "member") {
    return session;
  }

  const legacySession = decodeSession(store.get(legacyCookieName)?.value);
  return legacySession?.role === "member" ? legacySession : null;
}

export function setMemberSession(memberId: string) {
  const store = cookies();

  store.set(memberCookieName, encodeSession({ role: "member", memberId, issuedAt: Date.now() }), sessionCookieOptions);
  deleteLegacySessionIfRole("member");
}

export function setAdminSession(adminId: string) {
  const store = cookies();

  store.set(adminCookieName, encodeSession({ role: "admin", adminId, issuedAt: Date.now() }), sessionCookieOptions);
  deleteLegacySessionIfRole("admin");
}

export function clearMemberSession() {
  const store = cookies();

  store.delete(memberCookieName);
  deleteLegacySessionIfRole("member");
}

export function clearAdminSession() {
  const store = cookies();

  store.delete(adminCookieName);
  deleteLegacySessionIfRole("admin");
}

export function clearSession() {
  const store = cookies();

  store.delete(adminCookieName);
  store.delete(memberCookieName);
  store.delete(legacyCookieName);
}

export function requireMemberSession() {
  const session = getMemberSession();

  if (!session || session.role !== "member") {
    redirect("/login");
  }

  return session;
}

export function requireAdminSession() {
  const session = getAdminSession();

  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return session;
}
