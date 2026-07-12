import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { setupInitialAdminAction } from "@/app/actions/auth";
import { SetupNotice } from "@/components/SetupNotice";
import { getEnvStatus } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  invalid: "Revisa el nombre, correo y contrasena. La contrasena debe tener minimo 10 caracteres.",
  locked: "La configuracion inicial ya esta bloqueada o no se pudo crear el administrador."
};

async function getSetupState(envOk: boolean) {
  if (!envOk) {
    return "missing-env" as const;
  }

  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase.from("admins").select("id", { count: "exact", head: true });

  if (error) {
    return "unprepared" as const;
  }

  return Number(count || 0) > 0 ? ("locked" as const) : ("open" as const);
}

export default async function AdminSetupPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const env = getEnvStatus();
  const setupState = await getSetupState(env.ok);

  if (setupState === "locked" || searchParams.error === "locked") {
    redirect("/admin/login?notice=setup-locked");
  }

  return (
    <main className="shell-grid flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <section className="metal-panel-strong rounded-lg p-6">
          <ShieldCheck className="text-ion" size={28} />
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-ion">Configuracion inicial</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Crear dueno administrador</h1>
          <p className="mt-2 text-sm leading-6 text-steel">
            Esta pantalla solo funciona una vez. Cuando exista el primer administrador, queda bloqueada.
          </p>

          {setupState === "missing-env" ? (
            <div className="mt-5">
              <SetupNotice />
            </div>
          ) : setupState === "unprepared" ? (
            <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-400/10 p-4">
              <h2 className="font-semibold text-amber-100">Preparacion pendiente</h2>
              <p className="mt-2 text-sm text-amber-50">
                La conexion existe, pero todavia falta preparar la base de datos de NIMIO LEVELS.
              </p>
            </div>
          ) : (
            <form action={setupInitialAdminAction} className="mt-6 grid gap-4">
              <label className="label">
                Tu nombre
                <input className="field" name="display_name" autoComplete="name" required />
              </label>
              <label className="label">
                Tu correo
                <input className="field" name="email" type="email" autoComplete="email" required />
              </label>
              <label className="label">
                Crea una contrasena
                <input className="field" name="password" type="password" autoComplete="new-password" minLength={10} required />
              </label>
              <label className="label">
                Repite la contrasena
                <input
                  className="field"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>
              {searchParams.error ? (
                <p className="rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                  {errorCopy[searchParams.error] || "No se pudo crear el administrador."}
                </p>
              ) : null}
              <button className="btn btn-primary" type="submit">
                Crear administrador y entrar
              </button>
            </form>
          )}

          <Link className="mt-5 inline-flex text-sm text-steel hover:text-white" href="/admin/login">
            Volver al acceso admin
          </Link>
        </section>
      </div>
    </main>
  );
}
