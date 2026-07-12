import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { memberLoginAction } from "@/app/actions/auth";
import { SetupNotice } from "@/components/SetupNotice";

const errorCopy: Record<string, string> = {
  missing: "Escribe tu codigo personal.",
  invalid: "Codigo no encontrado. Revisa mayusculas, guion y caracteres.",
  blocked: "Acceso no disponible. Pide a Demian que revise tu codigo."
};

export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const errorMessage = searchParams.error ? errorCopy[searchParams.error] : null;
  return (
    <main className="shell-grid min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-ion">Plataforma privada</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">NIMIO LEVELS</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-steel">
              Progreso, puntos, niveles, avatares y recompensas para el equipo. Acceso cerrado,
              historial auditado y recompensas controladas por administracion.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="metal-panel rounded-lg p-4">
                <ShieldCheck className="text-ion" size={22} />
                <p className="mt-3 text-sm text-steel">Cada integrante solo ve su propio perfil.</p>
              </div>
              <div className="metal-panel rounded-lg p-4">
                <KeyRound className="text-ember" size={22} />
                <p className="mt-3 text-sm text-steel">Los codigos se guardan hasheados, no en texto plano.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="metal-panel-strong rounded-lg p-6">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-ion">Acceso de integrante</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Entra con tu codigo</h2>
            <p className="mt-2 text-sm text-steel">Ejemplo: AMY-4P9X</p>
          </div>

          <form action={memberLoginAction} className="grid gap-4">
            <label className="label">
              Codigo personal
              <input
                className="field font-mono uppercase tracking-[0.16em]"
                name="code"
                placeholder="NOMBRE-8F2K"
                autoComplete="one-time-code"
                required
              />
            </label>
            {errorMessage ? (
              <p className="rounded-md border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                {errorMessage}
              </p>
            ) : null}
            <button className="btn btn-primary" type="submit">
              Entrar a mi perfil
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-sm text-steel">
            <Link className="text-ion hover:text-white" href="/admin/login">
              Acceso administrador
            </Link>
          </div>
        </section>
      </div>
      <div className="mx-auto mt-6 max-w-6xl">
        <SetupNotice />
      </div>
    </main>
  );
}
