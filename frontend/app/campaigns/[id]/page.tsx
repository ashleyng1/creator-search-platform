"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { CreatorAvatar } from "@/components/CreatorCard";
import { ViewToggle } from "@/components/ViewToggle";
import {
  campaigns,
  formatFollowers,
  getToken,
  getUser,
  templates,
  type Campaign,
  type EmailTemplate,
  type Feedback,
  type ShortlistItem,
  type TeamMember,
} from "@/lib/api";
import { followerTier, getStoredViewMode, setStoredViewMode, type ViewMode } from "@/lib/utils";

function CampaignContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const user = getUser();
  const tab = searchParams.get("tab") || "creators";

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedItem, setSelectedItem] = useState<ShortlistItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(4);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState("member");
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<{
    posts: Record<string, unknown>[];
    summary: Record<string, unknown>;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterText, setFilterText] = useState("");

  const load = useCallback(async () => {
    const [c, s, t, tmpl] = await Promise.all([
      campaigns.get(id),
      campaigns.shortlist(id),
      campaigns.team(id),
      templates.list(),
    ]);
    setCampaign(c);
    setShortlist(s);
    setTeam(t);
    setEmailTemplates(tmpl);
    try {
      setAnalytics(await campaigns.analytics(id));
    } catch {
      setAnalytics(null);
    }
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load().catch(() => router.push("/dashboard"));
    setViewMode(getStoredViewMode("campaign-creators-view", "list"));
  }, [load, router]);

  async function selectItem(item: ShortlistItem) {
    setSelectedItem(item);
    setFeedback(await campaigns.feedback(id, item.id));
    setOutreachSubject("");
    setOutreachBody("");
    setSelectedTemplate(null);
  }

  async function submitFeedback() {
    if (!selectedItem || !newComment.trim()) return;
    await campaigns.addFeedback(id, selectedItem.id, newComment, newRating);
    setNewComment("");
    setFeedback(await campaigns.feedback(id, selectedItem.id));
    load();
  }

  async function handleApprove(status: "approved" | "rejected") {
    if (!selectedItem) return;
    await campaigns.approve(id, selectedItem.id, status);
    await load();
    const updated = (await campaigns.shortlist(id)).find((s) => s.id === selectedItem.id);
    if (updated) setSelectedItem(updated);
  }

  async function applyTemplate(templateId: number) {
    if (!selectedItem || !campaign) return;
    setSelectedTemplate(templateId);
    const preview = await templates.preview({
      template_id: templateId,
      creator_handle: selectedItem.creator.handle,
      creator_name: selectedItem.creator.display_name,
      campaign_title: campaign.title,
      brand_name: user?.brand_name || "",
      budget: campaign.budget,
    });
    setOutreachSubject(preview.subject);
    setOutreachBody(preview.body);
  }

  async function sendOutreach() {
    if (!selectedItem) return;
    await campaigns.sendOutreach(id, selectedItem.id, {
      subject: outreachSubject,
      body: outreachBody,
      template_id: selectedTemplate || undefined,
    });
    await load();
    alert("Outreach saved. Status updated to sent.");
  }

  async function addTeamMember() {
    await campaigns.addTeam(id, teamEmail, teamRole);
    setTeamEmail("");
    setTeam(await campaigns.team(id));
  }

  const isApprover =
    user?.email === "manager@brand.com" ||
    user?.email === "demo@brand.com" ||
    team.some((m) => m.user_id === user?.id && ["approver", "owner", "manager"].includes(m.role));

  const filteredShortlist = shortlist.filter(
    (item) =>
      !filterText ||
      item.creator.handle.toLowerCase().includes(filterText.toLowerCase()) ||
      item.creator.display_name.toLowerCase().includes(filterText.toLowerCase())
  );

  function toggleSelect(itemId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  if (!campaign) return null;

  return (
    <AppShell
      campaignId={id}
      campaignTitle={campaign.title}
      campaignTab={tab}
      breadcrumbs={[
        { label: "All campaigns", href: "/dashboard" },
        { label: campaign.title },
        { label: tab.charAt(0).toUpperCase() + tab.slice(1) },
      ]}
      title={tab.charAt(0).toUpperCase() + tab.slice(1)}
      subtitle={campaign.budget ? `Budget: ${campaign.budget}` : undefined}
    >
      {tab === "creators" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-lg border border-b-0 border-surface-border bg-white px-4 py-3">
              <div className="relative max-w-xs flex-1">
                <input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Search for creator"
                  className="input-field pl-3"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{filteredShortlist.length} creators</span>
                <ViewToggle
                  mode={viewMode}
                  onChange={(m) => {
                    setViewMode(m);
                    setStoredViewMode("campaign-creators-view", m);
                  }}
                />
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="overflow-x-auto rounded-b-lg border border-surface-border bg-white shadow-card">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th className="w-10">
                        <input type="checkbox" className="h-4 w-4 rounded" readOnly />
                      </th>
                      <th>Name</th>
                      <th>Country</th>
                      <th>Stage</th>
                      <th>Tier</th>
                      <th>Followers</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShortlist.map((item, i) => (
                      <tr
                        key={item.id}
                        onClick={() => selectItem(item)}
                        className={`cursor-pointer hover:bg-surface-muted/60 ${
                          selectedItem?.id === item.id ? "bg-brand-50/60" : ""
                        }`}
                      >
                        <td className="text-xs text-gray-400">{i + 1}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 rounded text-brand-600"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <CreatorAvatar handle={item.creator.handle} name={item.creator.display_name} size={32} />
                            <div>
                              <p className="font-medium">{item.creator.display_name}</p>
                              <p className="text-xs text-gray-500">@{item.creator.handle}</p>
                            </div>
                          </div>
                        </td>
                        <td>{item.creator.audience_country || "—"}</td>
                        <td>
                          <StatusPill status={item.approval_status} />
                        </td>
                        <td>{followerTier(item.creator.followers)}</td>
                        <td>{formatFollowers(item.creator.followers)}</td>
                        <td className="text-gray-500">{item.feedback_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3 rounded-b-lg border border-surface-border bg-surface-muted p-4 sm:grid-cols-2">
                {filteredShortlist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item)}
                    className={`rounded-lg border bg-white p-4 text-left shadow-card ${
                      selectedItem?.id === item.id ? "border-brand-400 ring-1 ring-brand-200" : "border-surface-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded"
                      />
                      <CreatorAvatar handle={item.creator.handle} name={item.creator.display_name} size={48} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.creator.display_name}</p>
                        <StatusPill status={item.approval_status} />
                        <p className="mt-1 text-xs text-gray-500">
                          {formatFollowers(item.creator.followers)} · {item.feedback_count} feedback
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel — feedback + approval */}
          <div className="rounded-lg border border-surface-border bg-white p-5 shadow-card">
            {selectedItem ? (
              <>
                <h3 className="font-semibold">@{selectedItem.creator.handle}</h3>
                <p className="text-sm text-gray-500">{selectedItem.creator.categories}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedItem.match_reasons.map((r) => (
                    <span key={r} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {r}
                    </span>
                  ))}
                </div>

                <section className="mt-5 border-t border-surface-border pt-4">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Team feedback</h4>
                  <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
                    {feedback.map((f) => (
                      <div key={f.id} className="rounded bg-surface-muted p-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{f.author_name}</span>
                          {f.rating && <span className="text-brand-600">★ {f.rating}</span>}
                        </div>
                        <p className="text-gray-600">{f.comment}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={newRating}
                      onChange={(e) => setNewRating(Number(e.target.value))}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}★</option>
                      ))}
                    </select>
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add feedback..."
                      className="input-field flex-1"
                    />
                    <button onClick={submitFeedback} className="btn-primary text-xs">Post</button>
                  </div>
                </section>

                {isApprover && selectedItem.approval_status === "pending" && (
                  <section className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3">
                    <p className="text-xs font-semibold text-brand-800">Approver</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleApprove("approved")} className="btn-primary text-xs">
                        Approve outreach
                      </button>
                      <button onClick={() => handleApprove("rejected")} className="btn-secondary text-xs">
                        Reject
                      </button>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a creator to review feedback and approve outreach</p>
            )}
          </div>
        </div>
      )}

      {tab === "outreach" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-500">Approved creators</h2>
            <div className="mt-3 space-y-2">
              {shortlist
                .filter((s) => s.approval_status === "approved")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                      selectedItem?.id === item.id ? "border-brand-400 bg-brand-50" : "border-surface-border bg-white"
                    }`}
                  >
                    <CreatorAvatar handle={item.creator.handle} name={item.creator.display_name} size={36} />
                    <div>
                      <p className="font-medium">{item.creator.display_name}</p>
                      <p className="text-xs text-gray-500">{item.outreach_status}</p>
                    </div>
                  </button>
                ))}
              {shortlist.filter((s) => s.approval_status === "approved").length === 0 && (
                <p className="text-sm text-gray-500">No approved creators yet. Approve creators on the Creators tab.</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-surface-border bg-white p-5">
            {selectedItem?.approval_status === "approved" ? (
              <>
                <h3 className="font-semibold">Compose outreach</h3>
                <select
                  onChange={(e) => applyTemplate(Number(e.target.value))}
                  className="input-field mt-3"
                  defaultValue=""
                >
                  <option value="" disabled>Choose template...</option>
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input
                  value={outreachSubject}
                  onChange={(e) => setOutreachSubject(e.target.value)}
                  className="input-field mt-2"
                  placeholder="Subject"
                />
                <textarea
                  value={outreachBody}
                  onChange={(e) => setOutreachBody(e.target.value)}
                  rows={10}
                  className="input-field mt-2"
                />
                <div className="mt-3 flex gap-2">
                  <button onClick={sendOutreach} className="btn-primary">Save outreach</button>
                  <Link href="/templates" className="btn-secondary">Manage templates</Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select an approved creator to compose outreach</p>
            )}
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="max-w-lg">
          <ul className="space-y-2">
            {team.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-3">
                <div>
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
                <span className="tag-purple capitalize">{m.role}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-surface-border bg-white p-4">
            <h3 className="font-medium">Add team member</h3>
            <p className="text-xs text-gray-500">User must be registered (e.g. member@brand.com)</p>
            <input value={teamEmail} onChange={(e) => setTeamEmail(e.target.value)} className="input-field mt-2" placeholder="email@brand.com" />
            <select value={teamRole} onChange={(e) => setTeamRole(e.target.value)} className="input-field mt-2">
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="approver">Approver</option>
            </select>
            <button onClick={addTeamMember} className="btn-primary mt-3">Add to team</button>
          </div>
        </div>
      )}

      {tab === "performance" && (
        <div>
          {!analytics?.posts?.length ? (
            <p className="text-sm text-gray-500">No posts logged yet.</p>
          ) : (
            <table className="data-table w-full rounded-lg border border-surface-border bg-white shadow-card">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Followers</th>
                  <th>ER%</th>
                  <th>vs Baseline</th>
                  <th>Index</th>
                </tr>
              </thead>
              <tbody>
                {analytics.posts.map((p) => (
                  <tr key={String(p.post_id)}>
                    <td>@{String(p.creator_handle)}</td>
                    <td>{formatFollowers(Number(p.followers))}</td>
                    <td>{Number(p.engagement_rate).toFixed(3)}%</td>
                    <td>{Number(p.er_vs_baseline).toFixed(2)}x</td>
                    <td>{Number(p.index_score).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {selectedItem && (
            <PostForm campaignId={id} creatorId={selectedItem.creator.id} onSaved={load} />
          )}
          {!selectedItem && shortlist[0] && (
            <p className="mt-4 text-xs text-gray-400">Select a creator on the Creators tab to log a post</p>
          )}
        </div>
      )}

      {tab === "summary" && (
        <div>
          <p className="max-w-2xl text-sm text-gray-600">{campaign.brief_text}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Creators", value: shortlist.length },
              { label: "Approved", value: shortlist.filter((s) => s.approval_status === "approved").length },
              { label: "Outreach sent", value: shortlist.filter((s) => s.outreach_status === "sent").length },
              { label: "Posts tracked", value: analytics?.posts?.length || 0 },
            ].map((kpi) => (
              <div key={kpi.label} className="kpi-card">
                <p className="text-xs font-semibold uppercase text-gray-400">{kpi.label}</p>
                <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-brand-100 text-brand-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] || "bg-gray-100"}`}>
      {status}
    </span>
  );
}

function PostForm({ campaignId, creatorId, onSaved }: { campaignId: number; creatorId: number; onSaved: () => void }) {
  const [likes, setLikes] = useState(10000);
  const [comments, setComments] = useState(500);
  const [url, setUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await campaigns.addPost(campaignId, { creator_id: creatorId, post_url: url, likes, comments, views: likes * 10 });
    onSaved();
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-md rounded-lg border border-surface-border bg-white p-4">
      <h3 className="text-sm font-medium">Log post metrics</h3>
      <input value={url} onChange={(e) => setUrl(e.target.value)} className="input-field mt-2" placeholder="Post URL" />
      <div className="mt-2 flex gap-2">
        <input type="number" value={likes} onChange={(e) => setLikes(Number(e.target.value))} className="input-field" placeholder="Likes" />
        <input type="number" value={comments} onChange={(e) => setComments(Number(e.target.value))} className="input-field" placeholder="Comments" />
      </div>
      <button type="submit" className="btn-primary mt-2 text-xs">Log post</button>
    </form>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <CampaignContent />
    </Suspense>
  );
}
