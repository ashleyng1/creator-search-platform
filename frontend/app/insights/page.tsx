"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { getToken, insights, type InsightSnapshot } from "@/lib/api";

export default function InsightsPage() {
  const router = useRouter();
  const [items, setItems] = useState<InsightSnapshot[]>([]);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else insights.weekly().then(setItems);
  }, [router]);

  return (
    <AppShell breadcrumbs={[{ label: "Insights" }]} title="Weekly insights" subtitle="Benchmarks from Instagram Top 1000 dataset">
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((s) => {
          const top = (s.payload.top_handles as Array<{ handle: string; followers: number; er: number }>) || [];
          return (
            <div key={s.category} className="rounded-lg border border-surface-border bg-white p-6 shadow-card">
              <div className="flex justify-between">
                <h2 className="text-lg font-semibold">{s.category}</h2>
                <span className="text-xs text-gray-400">{s.week_label}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{String(s.payload.insight)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="kpi-card">
                  <p className="text-xs text-gray-400">Creators</p>
                  <p className="text-xl font-semibold">{String(s.payload.creator_count)}</p>
                </div>
                <div className="kpi-card">
                  <p className="text-xs text-gray-400">Avg ER</p>
                  <p className="text-xl font-semibold">{String(s.payload.avg_engagement_rate)}%</p>
                </div>
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase text-gray-500">Top performers</h3>
              <ul className="mt-2 space-y-1">
                {top.map((c) => (
                  <li key={c.handle} className="flex justify-between text-sm text-gray-600">
                    <span>@{c.handle}</span>
                    <span>{c.er}% ER</span>
                  </li>
                ))}
              </ul>
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
