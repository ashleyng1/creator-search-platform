"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { EngagementRateBarChart } from "@/components/EngagementRateBarChart";
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
            <h3 className="font-semibold text-neutral-900">{c.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{c.brief_text}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
              <span>{c.budget || "Budget TBD"}</span>
              <span className="tag-brand">{c.status}</span>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">No campaigns yet. Start with a creator search.</p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Brand insights</h2>
        <div className="mt-4 max-w-xl rounded-lg border border-surface-border bg-white p-5 shadow-card">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Market engagement rate by category
          </p>
          <EngagementRateBarChart
            items={insightList.map((s) => ({
              label: s.category,
              rate: Number(s.payload.avg_engagement_rate) || 0,
              meta: `${String(s.payload.creator_count)} creators tracked`,
            }))}
          />
        </div>
        <Link href="/insights" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          View full insights →
        </Link>
      </section>
    </AppShell>
  );
}
