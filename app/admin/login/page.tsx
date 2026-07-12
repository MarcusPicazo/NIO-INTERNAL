import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { adminLoginAction, adminTokenFallbackAction } from "@/app/actions/auth";
import { SetupNotice } from "@/components/SetupNotice";
import { getAdminAccessToken } from "@/lib/env";

const errorCopy: Record<string, string> = {
  invalid: "Correo o contrasena incorrectos.",
  "invalid-token": "Token temporal incorrecto."
};

const noticeCopy: Record<string, string> = {
  "setup-locked": "El primer administrador ya existe. Entra aqui con tu correo y contrasena."
};

export default function AdminLoginPage({
  searchParams
}: {
  searchParams: { error?: string; notice?: string };
}) {
  const hasEmergencyToken = Boolean(getAdminAccessToken());
  const errorMessage = searchParams.error ? errorCopy[searchParams.error] : null;
  const noticeMessage = searchParams.notice ? noticeCopy[searchParams.notice] : null;

  return (
    <main className="shell-grid flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <section className="metal-panel-strong rounded-lg p-6">
          <div className="mb-6">
            <LockKeyhole className="text-ion" size={26} />
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-ion">Administrador</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Control total NIMIO LEVELS</h1>
            <p className="mt-2 text-sm text-steel">
              Entra con el correo y contrasena del dueno. No hay registro publico de administradores.
            </p>
          </div>

          <form action={adminLoginAction} className="grid gap-4">
            <label className="label">
              Correo administrador
              <input className="field" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="label">
              Contrasena
              <input className="field" name="password" type="password" autoComplete="current-password" required />
            </label>
            {errorMessage ? (
              <p className="rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                {errorMessage}
              </p>
            ) : null}
            {noticeMessage ? (
              <p className="rounded-md border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                {noticeMessage}
              </p>
            ) : null}
            <button className="btn btn-primary" type="submit">
              Entrar al panel
            </button>
          </form>

          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm">
            <Link className="text-steel hover:text-white" href="/login">
              Volver a acceso de integrante
            </Link>
          </div>

          {hasEmergencyToken ? (
            <details className="mt-5 rounded-md border border-white/10 p-3">
              <summary className="list-none text-sm text-steel">Acceso temporal de emergencia</summary>
              <form action={adminTokenFallbackAction} className="mt-3 grid gap-3">
                <label className="label">
                  Token temporal
                  <input className="field" name="token" type="password" autoComplete="off" />
                </label>
                <button className="btn btn-secondary" type="submit">
                  Entrar con respaldo temporal
                </button>
              </form>
            </details>
          ) : null}
        </section>
        <div className="mt-5">
          <SetupNotice />
        </div>
      </div>
    </main>
  );
}
