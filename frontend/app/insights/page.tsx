"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { EngagementRateBarChart } from "@/components/EngagementRateBarChart";
import { getToken, insights, type InsightSnapshot } from "@/lib/api";

export default function InsightsPage() {
  const router = useRouter();
  const [items, setItems] = useState<InsightSnapshot[]>([]);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else insights.weekly().then(setItems);
  }, [router]);

  return (
    <AppShell
      breadcrumbs={[{ label: "Insights" }]}
      title="Brand insights"
      subtitle="Market benchmarks for your brand, not tied to a single campaign"
    >
      <div className="mb-6 max-w-xl rounded-lg border border-surface-border bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Engagement by category</h2>
        <EngagementRateBarChart
          className="mt-4"
          items={items.map((s) => ({
            label: s.category,
            rate: Number(s.payload.avg_engagement_rate) || 0,
            meta: `${String(s.payload.creator_count)} creators tracked`,
          }))}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {items.map((s) => {
          const top = (s.payload.top_handles as Array<{ handle: string; followers: number; er: number }>) || [];
          return (
            <div key={s.category} className="rounded-lg border border-surface-border bg-white p-6 shadow-card">
              <div className="flex justify-between">
                <h2 className="text-lg font-semibold">{s.category}</h2>
                <span className="text-xs text-neutral-400">{s.week_label}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{String(s.payload.insight)}</p>
              <h3 className="mt-5 text-xs font-semibold uppercase text-neutral-500">Top performers</h3>
              <EngagementRateBarChart
                className="mt-3"
                items={top.map((c) => ({
                  label: `@${c.handle}`,
                  rate: c.er,
                }))}
              />
            </div>
          );
        })}
      </div>
      <Link href="/search" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
        Search creators →
      </Link>
    </AppShell>
  );
}
