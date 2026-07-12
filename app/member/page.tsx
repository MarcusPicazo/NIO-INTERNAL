import { Award, Coins, Gift, History, Send, WalletCards } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { requestRedemptionAction, submitPointRequestAction } from "@/app/actions/member";
import { AvatarFrame } from "@/components/AvatarFrame";
import { MetricCard } from "@/components/MetricCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { getMemberDashboard } from "@/lib/data";
import { formatDate, formatMoney, formatPoints } from "@/lib/format";
import { requireMemberSession } from "@/lib/session";

const achievementTypes = [
  "Entrega completa a tiempo",
  "Entrega antes de fecha",
  "Entrega sin correcciones importantes",
  "Resolver un bloqueo",
  "Apoyo a otro integrante",
  "Iniciativa implementada",
  "Venta o lead util",
  "Otro"
];

const noticeCopy: Record<string, string> = {
  "points-requested": "Solicitud enviada. Queda pendiente de revision.",
  "redemption-requested": "Canje solicitado. Los puntos se descuentan solo si se aprueba."
};

const errorCopy: Record<string, string> = {
  "evidence-required": "Agrega evidencia, enlace o comentario suficiente.",
  "evidence-upload-failed": "No se pudo subir la evidencia. Prueba con otra imagen/PDF o usa un enlace.",
  "duplicate-request": "Parece que esta solicitud ya existe.",
  "request-failed": "No se pudo enviar la solicitud. Intenta de nuevo.",
  "request-invalid": "Revisa actividad, tipo de logro y puntos sugeridos.",
  "redemption-already-open": "Ya tienes ese canje en proceso.",
  "redemption-monthly-limit": "Ya llegaste al limite mensual de esa recompensa.",
  "redemption-failed": "No se pudo solicitar el canje. Intenta de nuevo.",
  "reward-unavailable": "Esa recompensa no esta disponible con tus puntos actuales."
};

export default async function MemberPage({
  searchParams
}: {
  searchParams: { notice?: string; error?: string };
}) {
  const session = requireMemberSession();
  const dashboard = await getMemberDashboard(session.memberId);
  const { profile, levels } = dashboard;
  const nextLevel = levels.find((level) => Number(level.min_points) > Number(profile.historical_points));
  const currentLevelMin = Number(profile.level_min_points || 0);
  const currentLevelMax = profile.level_max_points ? Number(profile.level_max_points) : nextLevel?.min_points || null;
  const pointsToNext = nextLevel ? Math.max(Number(nextLevel.min_points) - Number(profile.historical_points), 0) : 0;
  const avatar =
    profile.custom_level_asset_url ||
    profile.custom_avatar_url ||
    profile.level_asset_url ||
    profile.base_avatar_url;
  const bestRewardValue = dashboard.rewards.reduce(
    (max, reward) => Math.max(max, Number(reward.value_mxn || 0)),
    0
  );
  const openRedemptionsByRewardId = new Map(
    dashboard.redemptions
      .filter((redemption) => ["pending", "approved"].includes(redemption.status))
      .map((redemption) => [redemption.reward_id, redemption])
  );
  const shouldOpenPointRequest =
    searchParams.notice === "points-requested" ||
    ["evidence-required", "evidence-upload-failed", "duplicate-request", "request-failed", "request-invalid"].includes(
      searchParams.error || ""
    );

  return (
    <main className="shell-grid min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-ion">NIMIO LEVELS</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Perfil privado</h1>
          </div>
          <form action={logoutAction}>
            <button className="btn btn-secondary" type="submit">
              Salir
            </button>
          </form>
        </header>

        {searchParams.notice ? (
          <p className="mb-4 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {noticeCopy[searchParams.notice] || "Listo."}
          </p>
        ) : null}
        {searchParams.error ? (
          <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {errorCopy[searchParams.error] || "No se pudo completar la accion."}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="metal-panel-strong rounded-lg p-5">
            <AvatarFrame src={avatar} name={profile.full_name} level={profile.level_name} />
            <h2 className="mt-5 text-2xl font-semibold text-white">{profile.full_name}</h2>
            <p className="mt-1 text-sm text-steel">
              {profile.area || "Equipo NIMIO"} {profile.role_title ? `- ${profile.role_title}` : ""}
            </p>
            <div className="mt-5 rounded-lg border border-ion/20 bg-black/28 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ion">
                Nivel {profile.level_rank || 1} - {profile.level_name || "Inicio"}
              </p>
              <p className="mt-2 text-sm text-steel">
                {nextLevel
                  ? `Te faltan ${formatPoints(pointsToNext)} puntos historicos para llegar a ${nextLevel.name}.`
                  : "Llegaste al nivel mas alto configurado."}
              </p>
              <div className="mt-4">
                <ProgressBar
                  current={Number(profile.historical_points)}
                  min={currentLevelMin}
                  max={currentLevelMax}
                />
              </div>
              {profile.level_message ? <p className="mt-3 text-sm text-white">{profile.level_message}</p> : null}
            </div>
          </div>

          <div className="grid content-start gap-5">
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Puntos disponibles"
                value={formatPoints(profile.available_points)}
                detail="Saldo real para recompensas"
                icon={<WalletCards size={22} />}
              />
              <MetricCard
                label="Puntos historicos"
                value={formatPoints(profile.historical_points)}
                detail="Determinan nivel y avatar"
                icon={<Award size={22} />}
              />
              <MetricCard
                label="Puntos gastados"
                value={formatPoints(profile.spent_points)}
                detail="Canjes aprobados"
                icon={<Coins size={22} />}
              />
              <MetricCard
                label="Mayor valor de canje"
                value={formatMoney(bestRewardValue)}
                detail="Catalogo activo"
                icon={<Gift size={22} />}
              />
            </div>

            <Section
              id="point-request"
              title="Solicitar puntos"
              eyebrow="Revision admin"
              action={<Send className="text-ion" size={20} />}
            >
              <details className="group" open={shouldOpenPointRequest}>
                <summary className="btn btn-primary w-fit list-none">Solicitar puntos</summary>
                <form action={submitPointRequestAction} className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="label">
                    Proyecto
                    <select className="field" name="project_id">
                      <option value="">Sin proyecto / otro</option>
                      {dashboard.projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    Proyecto nuevo u otro
                    <input className="field" name="project_name" placeholder="Opcional" />
                  </label>
                  <label className="label md:col-span-2">
                    Actividad realizada
                    <input className="field" name="activity" required />
                  </label>
                  <label className="label">
                    Tipo de logro
                    <select className="field" name="achievement_type" required>
                      {achievementTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    Puntos sugeridos
                    <input className="field" name="suggested_points" type="number" min="1" required />
                  </label>
                  <label className="label">
                    Evidencia URL
                    <input className="field" name="evidence_url" type="url" placeholder="https://..." />
                  </label>
                  <label className="label">
                    Archivo / imagen / PDF
                    <input className="field" name="evidence_file" type="file" accept="image/*,.gif,.pdf" />
                  </label>
                  <label className="label md:col-span-2">
                    Comentario adicional
                    <textarea className="field min-h-24" name="comment" />
                  </label>
                  <button className="btn btn-primary md:col-span-2" type="submit">
                    Enviar solicitud
                  </button>
                </form>
              </details>
            </Section>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Section title="Opciones de canje" eyebrow="Recompensas" action={<Gift className="text-ember" size={20} />}>
            <div className="grid gap-3">
              {dashboard.rewards.length ? (
                dashboard.rewards.map((reward) => {
                  const openRedemption = openRedemptionsByRewardId.get(reward.id);
                  const requiredPoints = Number(reward.points_required || 0);
                  const missingPoints = Math.max(requiredPoints - Number(profile.available_points), 0);
                  const canRequest = !openRedemption && missingPoints === 0;
                  const buttonLabel = openRedemption
                    ? openRedemption.status === "approved"
                      ? "Canje aprobado"
                      : "Canje en proceso"
                    : canRequest
                      ? "Solicitar canje"
                      : `Faltan ${formatPoints(missingPoints)} pts`;

                  return (
                    <div key={reward.id} className="rounded-lg border border-white/10 bg-black/24 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{reward.name}</h3>
                          <p className="mt-1 text-sm text-steel">{reward.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-ion">{formatPoints(reward.points_required)} pts</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-steel">Valor</p>
                          <p className="text-sm text-ember">{formatMoney(reward.value_mxn)}</p>
                        </div>
                      </div>
                      <form action={requestRedemptionAction} className="mt-4 flex flex-wrap gap-3">
                        <input type="hidden" name="reward_id" value={reward.id} />
                        <input
                          className="field max-w-md"
                          disabled={!canRequest}
                          name="member_comment"
                          placeholder="Comentario opcional"
                        />
                        <button className="btn btn-secondary" disabled={!canRequest} type="submit">
                          {buttonLabel}
                        </button>
                      </form>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-steel">Aun no hay recompensas activas.</p>
              )}
            </div>
          </Section>

          <Section title="Historial reciente" eyebrow="Movimientos" action={<History className="text-ion" size={20} />}>
            <div className="grid gap-3">
              {dashboard.movements.map((movement) => (
                <div key={movement.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{movement.reason}</p>
                      <p className="mt-1 text-xs text-steel">
                        {formatDate(movement.occurred_at)} {movement.projects?.name ? `- ${movement.projects.name}` : ""}
                      </p>
                    </div>
                    <p className={Number(movement.points) >= 0 ? "text-emerald-200" : "text-rose-200"}>
                      {Number(movement.points) >= 0 ? "+" : ""}
                      {formatPoints(movement.points)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Section title="Mis solicitudes" eyebrow="Puntos">
            <div className="grid gap-3">
              {dashboard.requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{request.activity}</p>
                      <p className="mt-1 text-xs text-steel">
                        {formatDate(request.created_at)} - {formatPoints(request.suggested_points)} pts sugeridos
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  {request.admin_comment ? <p className="mt-2 text-sm text-amber-100">{request.admin_comment}</p> : null}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Mis canjes" eyebrow="Recompensas">
            <div className="grid gap-3">
              {dashboard.redemptions.map((redemption) => (
                <div key={redemption.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{redemption.rewards?.name || "Recompensa"}</p>
                      <p className="mt-1 text-xs text-steel">
                        {formatPoints(redemption.points_snapshot)} pts - {formatMoney(redemption.value_mxn_snapshot)}
                      </p>
                    </div>
                    <StatusBadge status={redemption.status} />
                  </div>
                  {redemption.admin_comment ? (
                    <p className="mt-2 text-sm text-amber-100">{redemption.admin_comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
