export type EnvStatus = {
  ok: boolean;
  missing: string[];
};

const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NIMIO_SESSION_SECRET"
] as const;

export function getEnvStatus(): EnvStatus {
  const missing = requiredServerEnv.filter((name) => !process.env[name]);
  return {
    ok: missing.length === 0,
    missing
  };
}

export function requireEnv(name: (typeof requiredServerEnv)[number]): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSessionSecret() {
  return requireEnv("NIMIO_SESSION_SECRET");
}

export function getAdminAccessToken() {
  return process.env.ADMIN_ACCESS_TOKEN || null;
}
