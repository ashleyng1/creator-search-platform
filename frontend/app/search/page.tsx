"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { CreatorResultsPanel } from "@/components/CreatorResultsPanel";
import {
  campaigns,
  getToken,
  search,
  type CreatorResult,
} from "@/lib/api";

export default function SearchPage() {
  const router = useRouter();
  const [brief, setBrief] = useState(
    "Launch gloss lipstick for GCC female audience, makeup lovers, age 30-35, micro to mid-tier beauty influencers"
  );
  const [filters, setFilters] = useState<Record<string, unknown> | null>(null);
  const [results, setResults] = useState<CreatorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [title, setTitle] = useState("New Campaign");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const parsed = await search.parse(brief);
      setFilters(parsed.filters);
      const res = await search.creators(brief, parsed.filters);
      setResults(res.results);
      setFilters(res.filters);
    } finally {
      setLoading(false);
    }
  }

  async function addSelectedToShortlist(selected: CreatorResult[]) {
    setAdding(true);
    try {
      let cid = campaignId;
      if (!cid) {
        const c = await campaigns.create({
          title,
          brief_text: brief,
          parsed_filters: filters || undefined,
          budget: "$3,000 - $8,000 per creator",
        });
        cid = c.id;
        setCampaignId(cid);
      }
      for (const creator of selected) {
        try {
          await campaigns.addShortlist(cid, creator.id, creator.score, creator.match_reasons);
        } catch {
          /* already on shortlist */
        }
      }
      router.push(`/campaigns/${cid}?tab=creators`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <AppShell
      breadcrumbs={[{ label: "Search", href: "/search" }]}
      title="Creator search"
      subtitle="Describe your campaign — results appear as a list or product grid"
    >
      {/* Search bar — Google-style prominent input */}
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSearch} className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Campaign title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-1"
            placeholder="e.g. Gloss Lipstick GCC Launch"
          />
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Brief (natural language)
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            className="input-field mt-1 resize-none"
            placeholder="e.g. gloss lipstick launch for GCC women 30-35 who love makeup, micro influencers..."
          />
          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? "Searching..." : "Search creators"}
          </button>
        </form>
      </div>

      {filters && (
        <div className="mx-auto mt-4 max-w-3xl">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {showFilters ? "Hide" : "Show"} parsed filters
          </button>
          {showFilters && (
            <pre className="mt-2 overflow-x-auto rounded-lg border border-surface-border bg-white p-3 text-xs text-gray-600">
              {JSON.stringify(filters, null, 2)}
            </pre>
          )}
        </div>
      )}

      {results.length > 0 && (
        <CreatorResultsPanel
          results={results}
          onAddSelected={addSelectedToShortlist}
          adding={adding}
        />
      )}

      {campaignId && (
        <p className="mt-4 text-center text-sm text-gray-500">
          Campaign created.{" "}
          <Link href={`/campaigns/${campaignId}`} className="font-medium text-brand-600 hover:underline">
            View campaign →
          </Link>
        </p>
      )}
    </AppShell>
  );
}
