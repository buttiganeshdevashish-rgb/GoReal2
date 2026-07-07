import type { HeatmapDay } from "@/lib/types";

const LEVELS = ["bg-white/[0.05]", "bg-brand-700/60", "bg-brand-500", "bg-mint-500"];

export default function Heatmap({ days }: { days: HeatmapDay[] }) {
  // pad so the grid starts on Sunday
  const first = new Date(days[0].date + "T12:00:00");
  const pad = first.getDay();
  const cells: (HeatmapDay | null)[] = [...Array(pad).fill(null), ...days];
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) =>
            day ? (
              <div
                key={day.date}
                title={`${day.date}: ${day.count ? "posted ✓" : "no post"}`}
                className={`h-[11px] w-[11px] rounded-[3px] ${day.count > 0 ? LEVELS[Math.min(day.count + 1, 3)] : LEVELS[0]}`}
              />
            ) : (
              <div key={`pad-${wi}-${di}`} className="h-[11px] w-[11px]" />
            )
          )}
        </div>
      ))}
    </div>
  );
}
