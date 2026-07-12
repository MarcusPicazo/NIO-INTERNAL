import Image from "next/image";

export function AvatarFrame({
  src,
  name,
  level
}: {
  src?: string | null;
  name: string;
  level?: string | null;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-lg border border-ion/30 bg-gradient-to-br from-graphite-2 via-steel-dark to-black shadow-ion">
      {src ? (
        <Image src={src} alt={`Avatar de ${name}`} fill className="object-cover" sizes="280px" unoptimized />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-radial-steel p-6 text-center">
          <div className="text-5xl font-semibold text-white">{initials}</div>
          <div className="h-px w-20 bg-ion/50" />
          <p className="text-xs uppercase tracking-[0.22em] text-steel">Avatar pendiente</p>
        </div>
      )}
      {level ? (
        <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-black/62 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ion">
          {level}
        </div>
      ) : null}
    </div>
  );
}
