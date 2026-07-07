export default function Avatar({
  name,
  hue,
  size = 40,
  ring = false,
}: {
  name: string;
  hue: number;
  size?: number;
  ring?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${ring ? "ring-2 ring-brand-500/70 ring-offset-2 ring-offset-ink-950" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue + 50) % 360},65%,40%))`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
