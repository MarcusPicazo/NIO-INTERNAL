import Link from "next/link";
import { getPrintMemberMovements } from "@/lib/data";
import { formatDate, formatPoints } from "@/lib/format";
import { requireAdminSession } from "@/lib/session";

export default async function MemberMovementReportPage({
  params
}: {
  params: { memberId: string };
}) {
  requireAdminSession();
  const { member, movements } = await getPrintMemberMovements(params.memberId);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="no-print mb-5 flex items-center justify-between gap-4">
          <Link className="btn btn-secondary" href="/admin#reports">
            Volver
          </Link>
          <p className="rounded-md border border-ion/20 bg-black/30 px-3 py-2 text-sm text-steel">
            Usa imprimir del navegador para guardar PDF.
          </p>
        </div>

        <section className="metal-panel-strong rounded-lg p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ion">Reporte imprimible</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{member.full_name}</h1>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-steel">Nivel</p>
              <p className="font-semibold">{member.level_name || "Inicio"}</p>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-steel">Historicos</p>
              <p className="font-semibold">{formatPoints(member.historical_points)}</p>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-steel">Disponibles</p>
              <p className="font-semibold">{formatPoints(member.available_points)}</p>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-steel">Gastados</p>
              <p className="font-semibold">{formatPoints(member.spent_points)}</p>
            </div>
          </div>

          <table className="mt-8 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/20 text-xs uppercase tracking-[0.16em] text-steel">
                <th className="py-2">Fecha</th>
                <th>Tipo</th>
                <th>Proyecto</th>
                <th>Motivo</th>
                <th className="text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b border-white/10">
                  <td className="py-3">{formatDate(movement.occurred_at)}</td>
                  <td>{movement.movement_type}</td>
                  <td>{movement.projects?.name || "-"}</td>
                  <td>{movement.reason}</td>
                  <td className="text-right">
                    {Number(movement.points) >= 0 ? "+" : ""}
                    {formatPoints(movement.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
