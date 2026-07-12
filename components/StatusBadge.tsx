import clsx from "clsx";

const labels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  blocked: "Bloqueado",
  deleted: "Eliminado",
  pending_review: "Pendiente",
  in_review: "En revision",
  approved: "Aprobada",
  approved_adjusted: "Ajustada",
  rejected: "Rechazada",
  needs_more_evidence: "Mas evidencia",
  paid: "Pagado",
  cancelled: "Cancelado"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        status.includes("approved") || status === "active" || status === "paid"
          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
          : status.includes("pending") || status === "in_review"
            ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
            : status === "blocked" || status === "rejected"
              ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
              : "border-steel/20 bg-steel/10 text-steel"
      )}
    >
      {labels[status] || status}
    </span>
  );
}
