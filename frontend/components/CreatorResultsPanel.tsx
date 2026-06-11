"use client";

import { useEffect, useState } from "react";
import { CreatorGridCard, CreatorListRow } from "@/components/CreatorCard";
import { ViewToggle } from "@/components/ViewToggle";
import { formatFollowers, type CreatorResult } from "@/lib/api";
import { getStoredViewMode, setStoredViewMode, type ViewMode } from "@/lib/utils";

interface Props {
  results: CreatorResult[];
  onAddSelected: (creators: CreatorResult[]) => Promise<void>;
  adding?: boolean;
}

export function CreatorResultsPanel({ results, onAddSelected, adding }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    setViewMode(getStoredViewMode("creator-view-mode", "list"));
  }, []);

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    setStoredViewMode("creator-view-mode", mode);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  const filtered = results.filter(
    (c) =>
      !filterText ||
      c.handle.toLowerCase().includes(filterText.toLowerCase()) ||
      c.display_name.toLowerCase().includes(filterText.toLowerCase()) ||
      c.categories.toLowerCase().includes(filterText.toLowerCase())
  );

  const selectedCreators = filtered.filter((c) => selected.has(c.id));

  return (
    <div className="mt-6">
      {/* Toolbar — Traackr-style */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border border-b-0 border-surface-border bg-white px-4 py-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search for creator"
              className="input-field pl-9"
            />
          </div>
          <button type="button" className="btn-secondary text-xs">
            Filters
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{filtered.length} creators</span>
          <ViewToggle mode={viewMode} onChange={changeView} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between border border-surface-border bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">
            {selected.size} creator{selected.size > 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            disabled={adding}
            onClick={() => onAddSelected(selectedCreators)}
            className="btn-primary text-xs"
          >
            {adding ? "Adding..." : `Add ${selected.size} to shortlist`}
          </button>
        </div>
      )}

      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-b-lg border border-surface-border bg-white shadow-card">
          <table className="data-table w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                  />
                </th>
                <th>Name</th>
                <th>Country</th>
                <th>Tier</th>
                <th>Category</th>
                <th>Followers</th>
                <th>Eng. rate</th>
                <th>Match</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <CreatorListRow
                  key={c.id}
                  creator={c}
                  index={i + 1}
                  selected={selected.has(c.id)}
                  onToggle={() => toggle(c.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} className="border-t border-surface-border bg-surface-muted px-4 py-2 text-xs text-gray-500">
                  {filtered.length} creators · Total audience{" "}
                  {formatFollowers(filtered.reduce((s, c) => s + c.followers, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 rounded-b-lg border border-surface-border bg-surface-muted p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <CreatorGridCard
              key={c.id}
              creator={c}
              selected={selected.has(c.id)}
              onToggle={() => toggle(c.id)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-b-lg border border-surface-border bg-white py-12 text-center text-sm text-gray-500">
          No creators match your search
        </div>
      )}
    </div>
  );
}
