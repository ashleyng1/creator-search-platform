"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { campaigns, getToken, insights, type Campaign, type InsightSnapshot } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);
  const [insightList, setInsightList] = useState<InsightSnapshot[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    campaigns.list().then(setItems).catch(() => router.push("/login"));
    insights.weekly().then(setInsightList).catch(() => {});
  }, [router]);

  return (
    <AppShell
      breadcrumbs={[{ label: "All campaigns" }]}
      title="All campaigns"
      subtitle="Manage creator campaigns, outreach, and performance"
    >
      <div className="mb-6 flex justify-end">
        <Link href="/search" className="btn-primary">
          + New campaign search
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}?tab=summary`}
            className="rounded-lg border border-surface-border bg-white p-5 shadow-card transition hover:border-brand-200"
          >
            <h3 className="font-semibold text-gray-900">{c.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{c.brief_text}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
              <span>{c.budget || "Budget TBD"}</span>
              <span className="tag-purple">{c.status}</span>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No campaigns yet. Start with a creator search.</p>
        )}
      </div>

      {/* KPI-style insights row — Traackr Summary inspired */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">This week&apos;s insights</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {insightList.map((s) => (
            <div key={s.category} className="kpi-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{s.category}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {String(s.payload.avg_engagement_rate)}%
              </p>
              <p className="mt-1 text-xs text-gray-500">Avg engagement rate</p>
              <p className="mt-2 text-xs text-gray-400">{String(s.payload.creator_count)} creators tracked</p>
            </div>
          ))}
        </div>
        <Link href="/insights" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          View full insights →
        </Link>
      </section>
    </AppShell>
  );
}
