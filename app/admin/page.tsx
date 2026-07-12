import Link from "next/link";
import {
  Archive,
  Award,
  BadgeDollarSign,
  BarChart3,
  Download,
  Gift,
  History,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  Lock,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Upload,
  Users
} from "lucide-react";
import {
  createLevelAction,
  createManualMovementAction,
  createMemberAction,
  createProjectAction,
  createRewardAction,
  markRedemptionPaidAction,
  regenerateAccessCodeAction,
  reviewPointRequestAction,
  reviewRedemptionAction,
  toggleRewardAction,
  updateMemberStatusAction,
  updatePointValueAction,
  uploadMemberAvatarAction,
  uploadMemberLevelAssetAction
} from "@/app/actions/admin";
import { adminLogoutAction } from "@/app/actions/auth";
import { AccessCodeField } from "@/components/AccessCodeField";
import { AvatarFrame } from "@/components/AvatarFrame";
import { MetricCard } from "@/components/MetricCard";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { getAdminDashboard } from "@/lib/data";
import { formatDate, formatMoney, formatPoints } from "@/lib/format";
import { requireAdminSession } from "@/lib/session";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["members", "Miembros", Users],
  ["point-requests", "Solicitudes", ListChecks],
  ["movements", "Movimientos", History],
  ["redemptions", "Canjes", Gift],
  ["rewards", "Recompensas", BadgeDollarSign],
  ["levels", "Niveles", Award],
  ["reports", "Reportes", BarChart3],
  ["exports", "Exportar", Download],
  ["settings", "Configuracion", Settings]
] as const;

const noticeCopy: Record<string, string> = {
  "member-created": "Miembro creado. Comparte el codigo que generaste antes de guardar.",
  "member-updated": "Estado del miembro actualizado.",
  "code-regenerated": "Codigo regenerado y codigos anteriores bloqueados.",
  "movement-created": "Movimiento creado y auditado.",
  "request-reviewed": "Solicitud revisada.",
  "redemption-reviewed": "Canje revisado.",
  "redemption-paid": "Canje marcado como pagado.",
  "request-already-resolved": "Esa solicitud ya estaba resuelta.",
  "redemption-already-resolved": "Ese canje ya estaba resuelto.",
  "reward-created": "Recompensa creada.",
  "reward-updated": "Recompensa actualizada.",
  "level-created": "Nivel creado.",
  "avatar-uploaded": "Avatar actualizado.",
  "asset-uploaded": "Asset personalizado actualizado.",
  "project-created": "Proyecto creado.",
  "point-value-updated": "Equivalencia actualizada."
};

const errorCopy: Record<string, string> = {
  "member-invalid": "Revisa nombre, correo y codigo del miembro.",
  "member-create-failed": "No se pudo crear el miembro. Intenta de nuevo.",
  "code-create-failed": "No se pudo crear el codigo. Prueba con otro codigo.",
  "member-status-failed": "No se pudo actualizar el estado del miembro.",
  "invalid-status": "Ese estado de miembro no es valido.",
  "missing-code": "Escribe el nuevo codigo del miembro.",
  "code-regenerate-failed": "No se pudo regenerar el codigo.",
  "delete-confirmation-required": "Para eliminar logicamente escribe ELIMINAR.",
  "movement-invalid": "Revisa el miembro, puntos y motivo del movimiento.",
  "movement-reason-required": "Todo descuento requiere motivo obligatorio.",
  "movement-create-failed": "No se pudo crear el movimiento.",
  "request-not-found": "No encontre esa solicitud. Recarga el panel.",
  "request-invalid-points": "Los puntos aprobados deben ser mayores a cero.",
  "request-approve-failed": "No se pudo aprobar la solicitud. Revisa puntos y estado.",
  "request-invalid-decision": "Esa decision no es valida.",
  "request-review-failed": "No se pudo revisar la solicitud.",
  "redemption-not-found": "No encontre ese canje. Recarga el panel.",
  "redemption-approve-failed": "No se pudo aprobar el canje. Puede que el saldo ya no alcance.",
  "redemption-review-failed": "No se pudo revisar el canje.",
  "redemption-paid-failed": "No se pudo marcar como pagado. Revisa que el canje este aprobado.",
  "reward-invalid": "Revisa nombre, puntos y valor de la recompensa.",
  "reward-image-failed": "No se pudo subir la imagen. Puedes crear la recompensa sin imagen.",
  "reward-create-failed": "No se pudo crear la recompensa. Intenta de nuevo.",
  "reward-toggle-failed": "No se pudo activar o pausar la recompensa.",
  "level-invalid": "Revisa nombre, rango y puntos del nivel.",
  "level-asset-failed": "No se pudo subir la imagen/GIF del nivel.",
  "level-create-failed": "No se pudo crear el nivel.",
  "avatar-missing": "Selecciona una imagen para el avatar.",
  "avatar-upload-failed": "No se pudo subir el avatar. Usa imagen o GIF de maximo 8 MB.",
  "asset-missing": "Selecciona una imagen/GIF para el nivel del miembro.",
  "asset-upload-failed": "No se pudo subir el asset. Usa imagen o GIF de maximo 8 MB.",
  "project-name-required": "Escribe el nombre del proyecto.",
  "project-create-failed": "No se pudo crear el proyecto. Puede estar repetido.",
  "invalid-point-value": "La equivalencia debe ser cero o mayor.",
  "point-value-failed": "No se pudo guardar la equivalencia."
};

function getThisMonth(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: { notice?: string; error?: string };
}) {
  requireAdminSession();
  const data = await getAdminDashboard();
  const activeMembers = data.members.filter((member) => member.status === "active").length;
  const pendingRequests = data.requests.filter((request) =>
    ["pending_review", "in_review", "needs_more_evidence"].includes(request.status)
  ).length;
  const pendingRedemptions = data.redemptions.filter((redemption) => redemption.status === "pending").length;
  const monthMovements = data.movements.filter((movement) => getThisMonth(movement.occurred_at));
  const grantedThisMonth = monthMovements
    .filter((movement) => Number(movement.points) > 0)
    .reduce((sum, movement) => sum + Number(movement.points), 0);
  const redeemedThisMonth = monthMovements
    .filter((movement) => movement.movement_type === "redemption_approved")
    .reduce((sum, movement) => sum + Math.abs(Number(movement.points)), 0);
  const mxnThisMonth = data.redemptions
    .filter((redemption) => ["approved", "paid"].includes(redemption.status) && getThisMonth(redemption.reviewed_at))
    .reduce((sum, redemption) => sum + Number(redemption.value_mxn_snapshot || 0), 0);
  const topHistorical = [...data.members].sort((a, b) => b.historical_points - a.historical_points).slice(0, 5);
  const topAvailable = [...data.members].sort((a, b) => b.available_points - a.available_points).slice(0, 5);
  const pointValue = data.settings.find((setting) => setting.key === "point_value_mxn")?.value?.mxn ?? 0;

  return (
    <main className="shell-grid min-h-screen px-4 py-5">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="no-print metal-panel-strong h-fit rounded-lg p-4 lg:sticky lg:top-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-ion">NIMIO</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">LEVELS Admin</h1>
          </div>
          <nav className="grid gap-1">
            {navItems.map(([href, label, Icon]) => (
              <a
                key={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-steel hover:bg-white/10 hover:text-white"
                href={`#${href}`}
              >
                <Icon size={16} />
                {label}
              </a>
            ))}
          </nav>
          <form action={adminLogoutAction} className="mt-6">
            <button className="btn btn-secondary w-full" type="submit">
              Salir
            </button>
          </form>
        </aside>

        <div className="grid gap-5">
          <header className="metal-panel-strong rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-ion">Consola privada</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Administracion total</h2>
                <p className="mt-2 max-w-3xl text-sm text-steel">
                  Miembros, puntos, niveles, avatares, recompensas, canjes, reportes y auditoria.
                </p>
              </div>
              <div className="rounded-lg border border-ion/20 bg-black/30 px-4 py-3 text-sm text-steel">
                <Lock className="mb-2 text-ion" size={18} />
                Service role solo en servidor
              </div>
            </div>
          </header>

          {searchParams.notice ? (
            <p className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {noticeCopy[searchParams.notice] || "Listo."}
            </p>
          ) : null}
          {searchParams.error ? (
            <p className="rounded-lg border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorCopy[searchParams.error] || "No se pudo completar la accion."}
            </p>
          ) : null}

          <section id="dashboard" className="section-anchor grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Miembros activos" value={activeMembers} detail="Perfiles con acceso vigente" icon={<Users />} />
            <MetricCard label="Solicitudes pendientes" value={pendingRequests} detail="Puntos por revisar" icon={<ListChecks />} />
            <MetricCard label="Canjes pendientes" value={pendingRedemptions} detail="Recompensas por aprobar" icon={<Gift />} />
            <MetricCard label="Puntos otorgados mes" value={formatPoints(grantedThisMonth)} detail="Movimientos positivos" icon={<Sparkles />} />
            <MetricCard label="Puntos canjeados mes" value={formatPoints(redeemedThisMonth)} detail="Canjes aprobados" icon={<Archive />} />
            <MetricCard label="Premios MXN mes" value={formatMoney(mxnThisMonth)} detail="Valor aprobado vigente" icon={<BadgeDollarSign />} />
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Mas puntos historicos" eyebrow="Metrica interna">
              <div className="grid gap-2">
                {topHistorical.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-md bg-black/24 px-3 py-2">
                    <span>{member.full_name}</span>
                    <span className="text-ion">{formatPoints(member.historical_points)}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Mas puntos disponibles" eyebrow="Metrica interna">
              <div className="grid gap-2">
                {topAvailable.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-md bg-black/24 px-3 py-2">
                    <span>{member.full_name}</span>
                    <span className="text-ember">{formatPoints(member.available_points)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <Section id="members" title="Miembros" eyebrow="Accesos privados" action={<Users className="text-ion" />}>
            <details className="mb-5">
              <summary className="btn btn-primary w-fit list-none">
                <Plus size={16} /> Crear miembro
              </summary>
              <form action={createMemberAction} className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-black/24 p-4 md:grid-cols-2">
                <label className="label">
                  Nombre completo
                  <input id="new-member-name" className="field" name="full_name" required />
                </label>
                <label className="label">
                  Area o equipo
                  <input className="field" name="area" />
                </label>
                <label className="label">
                  Cargo
                  <input className="field" name="role_title" />
                </label>
                <label className="label">
                  Correo opcional
                  <input className="field" name="email" type="email" />
                </label>
                <AccessCodeField nameInputId="new-member-name" />
                <label className="label">
                  Notas privadas
                  <textarea className="field min-h-24" name="private_notes" />
                </label>
                <button className="btn btn-primary md:col-span-2" type="submit">
                  Crear y guardar hash del codigo
                </button>
              </form>
            </details>

            <div className="grid gap-4 xl:grid-cols-2">
              {data.members.map((member) => (
                <article key={member.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                  <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
                    <AvatarFrame
                      src={member.custom_avatar_url || member.level_asset_url || member.base_avatar_url}
                      name={member.full_name}
                      level={member.level_name}
                    />
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{member.full_name}</h3>
                          <p className="text-sm text-steel">
                            {member.area || "Sin area"} {member.role_title ? `- ${member.role_title}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={member.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-md bg-white/6 p-2">
                          <p className="text-steel">Historicos</p>
                          <p className="text-white">{formatPoints(member.historical_points)}</p>
                        </div>
                        <div className="rounded-md bg-white/6 p-2">
                          <p className="text-steel">Disponibles</p>
                          <p className="text-ion">{formatPoints(member.available_points)}</p>
                        </div>
                        <div className="rounded-md bg-white/6 p-2">
                          <p className="text-steel">Gastados</p>
                          <p className="text-ember">{formatPoints(member.spent_points)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={updateMemberStatusAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button className="btn btn-secondary" name="status" value="active" type="submit">
                        Reactivar
                      </button>
                    </form>
                    <form action={updateMemberStatusAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button className="btn btn-secondary" name="status" value="inactive" type="submit">
                        Desactivar
                      </button>
                    </form>
                    <form action={updateMemberStatusAction}>
                      <input type="hidden" name="member_id" value={member.id} />
                      <button className="btn btn-secondary" name="status" value="blocked" type="submit">
                        Bloquear
                      </button>
                    </form>
                    <Link className="btn btn-secondary" href={`/admin/reports/member/${member.id}`}>
                      Vista imprimible
                    </Link>
                  </div>

                  <details className="mt-4 rounded-md border border-white/10 p-3">
                    <summary className="list-none text-sm text-ion">Regenerar codigo</summary>
                    <form action={regenerateAccessCodeAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="member_id" value={member.id} />
                      <AccessCodeField memberName={member.full_name} />
                      <button className="btn btn-primary" type="submit">
                        Bloquear anteriores y guardar nuevo hash
                      </button>
                    </form>
                  </details>

                  <details className="mt-3 rounded-md border border-white/10 p-3">
                    <summary className="list-none text-sm text-steel">Subir avatar personalizado</summary>
                    <form action={uploadMemberAvatarAction} className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input className="field max-w-xs" name="avatar" type="file" accept="image/*,.gif" required />
                      <button className="btn btn-secondary" type="submit">
                        <Upload size={16} /> Subir
                      </button>
                    </form>
                  </details>

                  <details className="mt-3 rounded-md border border-rose-300/20 p-3">
                    <summary className="list-none text-sm text-rose-100">Eliminar sin borrar historial</summary>
                    <form action={updateMemberStatusAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="status" value="deleted" />
                      <input className="field" name="confirm_text" placeholder="Escribe ELIMINAR" />
                      <button className="btn btn-danger" type="submit">
                        Eliminar logicamente
                      </button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          </Section>

          <Section id="point-requests" title="Solicitudes de puntos" eyebrow="Revision" action={<ListChecks className="text-ion" />}>
            <div className="grid gap-3">
              {data.requests.map((request) => (
                <article key={request.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{request.members?.full_name}</p>
                      <p className="mt-1 text-sm text-steel">{request.activity}</p>
                      <p className="mt-1 text-xs text-steel">
                        {request.projects?.name || request.project_name || "Sin proyecto"} - {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={request.status} />
                      <p className="mt-2 text-ion">{formatPoints(request.suggested_points)} pts sugeridos</p>
                    </div>
                  </div>
                  {request.evidence_url ? (
                    <a className="mt-3 inline-flex text-sm text-ion hover:text-white" href={request.evidence_url} target="_blank">
                      Ver evidencia
                    </a>
                  ) : null}
                  {["pending_review", "in_review", "needs_more_evidence"].includes(request.status) ? (
                    <form action={reviewPointRequestAction} className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto_auto_auto_auto]">
                      <input type="hidden" name="request_id" value={request.id} />
                      <input
                        className="field"
                        name="approved_points"
                        type="number"
                        min="1"
                        defaultValue={request.suggested_points}
                      />
                      <input className="field" name="admin_comment" placeholder="Comentario admin" />
                      <button className="btn btn-primary" name="decision" value="approve" type="submit">
                        Aprobar
                      </button>
                      <button className="btn btn-secondary" name="decision" value="review" type="submit">
                        En revision
                      </button>
                      <button className="btn btn-secondary" name="decision" value="evidence" type="submit">
                        Mas evidencia
                      </button>
                      <button className="btn btn-danger" name="decision" value="reject" type="submit">
                        Rechazar
                      </button>
                    </form>
                  ) : (
                    <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-steel">
                      Solicitud cerrada. El historial ya conserva el resultado.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </Section>

          <Section id="movements" title="Movimientos de puntos" eyebrow="Historial auditado" action={<History className="text-ion" />}>
            <details className="mb-5">
              <summary className="btn btn-primary w-fit list-none">
                <Plus size={16} /> Movimiento manual
              </summary>
              <form action={createManualMovementAction} className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-black/24 p-4 md:grid-cols-2">
                <label className="label">
                  Miembro
                  <select className="field" name="member_id" required>
                    {data.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  Proyecto
                  <select className="field" name="project_id">
                    <option value="">Sin proyecto</option>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  Tipo
                  <select className="field" name="movement_type">
                    <option value="manual_points_added">Puntos manuales agregados</option>
                    <option value="admin_adjustment">Ajuste administrativo</option>
                    <option value="correction">Correccion</option>
                  </select>
                </label>
                <label className="label">
                  Puntos
                  <input className="field" name="points" type="number" required />
                </label>
                <label className="label md:col-span-2">
                  Motivo obligatorio
                  <input className="field" name="reason" required />
                </label>
                <label className="label">
                  Evidencia URL
                  <input className="field" name="evidence_url" type="url" />
                </label>
                <label className="label">
                  Comentario adicional
                  <input className="field" name="comment" />
                </label>
                <button className="btn btn-primary md:col-span-2" type="submit">
                  Registrar movimiento
                </button>
              </form>
            </details>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-steel">
                  <tr>
                    <th className="py-2">Fecha</th>
                    <th>Miembro</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th className="text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((movement) => (
                    <tr key={movement.id} className="border-t border-white/10">
                      <td className="py-3 text-steel">{formatDate(movement.occurred_at)}</td>
                      <td>{movement.members?.full_name}</td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.reason}</td>
                      <td className={Number(movement.points) >= 0 ? "text-right text-emerald-200" : "text-right text-rose-200"}>
                        {Number(movement.points) >= 0 ? "+" : ""}
                        {formatPoints(movement.points)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="redemptions" title="Solicitudes de canje" eyebrow="Aprobacion y pagos" action={<Gift className="text-ember" />}>
            <div className="grid gap-3">
              {data.redemptions.map((redemption) => (
                <article key={redemption.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{redemption.members?.full_name}</p>
                      <p className="mt-1 text-sm text-steel">{redemption.rewards?.name || "Recompensa"}</p>
                      <p className="mt-1 text-xs text-steel">{formatDate(redemption.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={redemption.status} />
                      <p className="mt-2 text-ion">{formatPoints(redemption.points_snapshot)} pts</p>
                      <p className="text-ember">{formatMoney(redemption.value_mxn_snapshot)}</p>
                    </div>
                  </div>
                  {redemption.status === "pending" ? (
                    <form action={reviewRedemptionAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                      <input type="hidden" name="redemption_id" value={redemption.id} />
                      <input className="field" name="admin_comment" placeholder="Comentario / comprobante interno" />
                      <button className="btn btn-primary" name="decision" value="approve" type="submit">
                        Aprobar
                      </button>
                      <button className="btn btn-secondary" name="decision" value="cancel" type="submit">
                        Cancelar
                      </button>
                      <button className="btn btn-danger" name="decision" value="reject" type="submit">
                        Rechazar
                      </button>
                    </form>
                  ) : (
                    <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-steel">
                      Canje cerrado. Puedes revisar el historial o marcarlo pagado si ya fue aprobado.
                    </p>
                  )}
                  {redemption.status === "approved" ? (
                    <form action={markRedemptionPaidAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="redemption_id" value={redemption.id} />
                      <input className="field" name="payment_proof_url" placeholder="URL comprobante de pago" />
                      <input className="field" name="admin_comment" placeholder="Comentario de pago" />
                      <button className="btn btn-secondary" type="submit">
                        Marcar pagado
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </Section>

          <Section id="rewards" title="Recompensas y equivalencias" eyebrow="MXN flexible" action={<BadgeDollarSign className="text-ember" />}>
            <form action={createRewardAction} className="mb-5 grid gap-4 rounded-lg border border-white/10 bg-black/24 p-4 md:grid-cols-3">
              <label className="label">
                Nombre
                <input className="field" name="name" required />
              </label>
              <label className="label">
                Tipo
                <select className="field" name="reward_type">
                  <option value="money">Dinero</option>
                  <option value="benefit">Beneficio</option>
                  <option value="course">Curso</option>
                  <option value="tool">Herramienta</option>
                  <option value="priority">Prioridad</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="label">
                Puntos requeridos
                <input className="field" name="points_required" type="number" min="1" required />
              </label>
              <label className="label">
                Valor MXN
                <input className="field" name="value_mxn" type="number" min="0" required />
              </label>
              <label className="label">
                Limite mensual por persona
                <input className="field" name="monthly_limit_per_member" type="number" min="1" />
              </label>
              <label className="label">
                Imagen opcional
                <input className="field" name="image" type="file" accept="image/*,.gif" />
              </label>
              <label className="label md:col-span-3">
                Descripcion
                <textarea className="field min-h-20" name="description" />
              </label>
              <button className="btn btn-primary md:col-span-3" type="submit">
                Crear recompensa
              </button>
            </form>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.rewards.map((reward) => (
                <article key={reward.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{reward.name}</h3>
                      <p className="mt-1 text-sm text-steel">{reward.description}</p>
                    </div>
                    <StatusBadge status={reward.is_active ? "active" : "inactive"} />
                  </div>
                  <p className="mt-4 text-ion">{formatPoints(reward.points_required)} pts</p>
                  <p className="text-ember">{formatMoney(reward.value_mxn)}</p>
                  <form action={toggleRewardAction} className="mt-4">
                    <input type="hidden" name="reward_id" value={reward.id} />
                    <input type="hidden" name="is_active" value={String(reward.is_active)} />
                    <button className="btn btn-secondary" type="submit">
                      {reward.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </Section>

          <Section id="levels" title="Niveles y avatares" eyebrow="Progreso historico" action={<Award className="text-ion" />}>
            <form action={createLevelAction} className="mb-5 grid gap-4 rounded-lg border border-white/10 bg-black/24 p-4 md:grid-cols-3">
              <label className="label">
                Nombre
                <input className="field" name="name" required />
              </label>
              <label className="label">
                Orden
                <input className="field" name="rank" type="number" min="1" required />
              </label>
              <label className="label">
                Puntos minimos
                <input className="field" name="min_points" type="number" min="0" required />
              </label>
              <label className="label">
                Puntos maximos
                <input className="field" name="max_points" type="number" min="0" />
              </label>
              <label className="label">
                Imagen/GIF base
                <input className="field" name="base_asset" type="file" accept="image/*,.gif" />
              </label>
              <label className="label">
                Mensaje
                <input className="field" name="message" />
              </label>
              <button className="btn btn-primary md:col-span-3" type="submit">
                Crear nivel
              </button>
            </form>

            <div className="grid gap-3">
              {data.levels.map((level) => (
                <article key={level.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ion">Nivel {level.rank}</p>
                      <h3 className="text-lg font-semibold text-white">{level.name}</h3>
                      <p className="text-sm text-steel">
                        {formatPoints(level.min_points)} - {level.max_points ? formatPoints(level.max_points) : "sin limite"} pts
                      </p>
                    </div>
                    <p className="max-w-xl text-sm text-steel">{level.message}</p>
                  </div>
                  <details className="mt-4 rounded-md border border-white/10 p-3">
                    <summary className="list-none text-sm text-ion">
                      <ImagePlus className="mr-2 inline" size={16} />
                      Asset personalizado por miembro y nivel
                    </summary>
                    <form action={uploadMemberLevelAssetAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="level_id" value={level.id} />
                      <select className="field" name="member_id" required>
                        {data.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                      <input className="field" name="asset" type="file" accept="image/*,.gif" required />
                      <button className="btn btn-secondary" type="submit">
                        Subir
                      </button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          </Section>

          <Section id="reports" title="Reportes" eyebrow="Persona, proyecto y periodo" action={<BarChart3 className="text-ion" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/24 p-4">
                <h3 className="font-semibold text-white">Actividad reciente</h3>
                <div className="mt-3 grid gap-2">
                  {data.audits.slice(0, 8).map((audit) => (
                    <div key={audit.id} className="rounded-md bg-white/6 p-2 text-sm">
                      <p className="text-white">{audit.action}</p>
                      <p className="text-xs text-steel">
                        {audit.admins?.display_name || "Admin"} - {formatDate(audit.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/24 p-4">
                <h3 className="font-semibold text-white">Vistas imprimibles por persona</h3>
                <div className="mt-3 grid gap-2">
                  {data.members.map((member) => (
                    <Link key={member.id} className="text-sm text-ion hover:text-white" href={`/admin/reports/member/${member.id}`}>
                      {member.full_name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section id="exports" title="Exportar respaldo" eyebrow="CSV" action={<Download className="text-ion" />}>
            <div className="grid gap-3 md:grid-cols-3">
              {["members", "movements", "point_requests", "redemptions", "rewards", "levels", "complete"].map((type) => (
                <Link key={type} className="btn btn-secondary" href={`/admin/export/${type}`}>
                  <Download size={16} />
                  {type}
                </Link>
              ))}
            </div>
          </Section>

          <Section id="settings" title="Configuracion" eyebrow="Equivalencias y proyectos" action={<Settings className="text-ion" />}>
            <div className="grid gap-5 xl:grid-cols-2">
              <form action={updatePointValueAction} className="rounded-lg border border-white/10 bg-black/24 p-4">
                <h3 className="font-semibold text-white">Valor general de punto</h3>
                <p className="mt-1 text-sm text-steel">
                  Solo referencia. Las recompensas guardan snapshot propio al aprobarse.
                </p>
                <label className="label mt-4">
                  MXN por punto
                  <input className="field" name="point_value_mxn" type="number" min="0" step="0.01" defaultValue={pointValue} />
                </label>
                <button className="btn btn-primary mt-4" type="submit">
                  Guardar equivalencia
                </button>
              </form>

              <form action={createProjectAction} className="rounded-lg border border-white/10 bg-black/24 p-4">
                <h3 className="font-semibold text-white">Crear proyecto</h3>
                <label className="label mt-4">
                  Nombre del proyecto
                  <input className="field" name="name" required />
                </label>
                <button className="btn btn-primary mt-4" type="submit">
                  Crear proyecto
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.projects.map((project) => (
                    <span key={project.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-steel">
                      {project.name}
                    </span>
                  ))}
                </div>
              </form>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Shield size={18} className="text-ion" />
                Permisos activos
              </h3>
              <p className="mt-2 text-sm leading-6 text-steel">
                El navegador no recibe claves privadas. Las acciones sensibles pasan por servidor, se auditan y usan
                funciones SQL para aprobaciones atomicas. Las politicas RLS quedan en la migracion para acceso directo
                futuro con Supabase Auth.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
