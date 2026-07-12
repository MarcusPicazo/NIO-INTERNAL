import type { ReactNode } from "react";

export function Section({
  id,
  title,
  eyebrow,
  children,
  action
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section id={id} className="section-anchor metal-panel-strong rounded-lg p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-ion">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
