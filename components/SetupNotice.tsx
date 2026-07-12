import { getEnvStatus } from "@/lib/env";

export function SetupNotice() {
  const status = getEnvStatus();

  if (status.ok) {
    return null;
  }

  return (
    <div className="metal-panel mx-auto max-w-3xl rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Configuracion pendiente</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Faltan variables de entorno</h2>
      <p className="mt-3 text-sm text-steel">
        Crea un archivo <code className="text-white">.env.local</code> con los valores de
        <code className="ml-1 text-white">.env.example</code> antes de usar Supabase.
      </p>
      <ul className="mt-4 grid gap-2 text-sm text-amber-100">
        {status.missing.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
