export type EngagementRateItem = {
  label: string;
  rate: number;
  meta?: string;
};

type Props = {
  items: EngagementRateItem[];
  className?: string;
};

export function EngagementRateBarChart({ items, className = "" }: Props) {
  const sorted = [...items].sort((a, b) => b.rate - a.rate);
  const maxRate = sorted[0]?.rate || 1;

  if (sorted.length === 0) {
    return <p className="text-sm text-neutral-500">No engagement data yet.</p>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {sorted.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-neutral-700">{item.label}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
              {item.rate}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max((item.rate / maxRate) * 100, 2)}%` }}
            />
          </div>
          {item.meta && <p className="mt-1 text-xs text-neutral-400">{item.meta}</p>}
        </div>
      ))}
    </div>
  );
}
