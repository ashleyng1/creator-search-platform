"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { getToken, templates, type EmailTemplate } from "@/lib/api";

export default function TemplatesPage() {
  const router = useRouter();
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", template_type: "intro", subject: "", body: "" });

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else templates.list().then(setItems);
  }, [router]);

  async function saveNew() {
    await templates.create(form);
    setForm({ name: "", template_type: "intro", subject: "", body: "" });
    setItems(await templates.list());
  }

  async function saveEdit() {
    if (!editing) return;
    await templates.update(editing.id, { name: editing.name, subject: editing.subject, body: editing.body });
    setEditing(null);
    setItems(await templates.list());
  }

  return (
    <AppShell breadcrumbs={[{ label: "Email templates" }]} title="Email templates" subtitle="Customize outreach — use {{creator_name}}, {{brand_name}}, {{budget}}">
      <div className="space-y-4">
        {items.map((t) => (
          <div key={t.id} className="rounded-lg border border-surface-border bg-white p-5 shadow-card">
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">{t.name}</h3>
                <span className="text-xs capitalize text-gray-400">{t.template_type}</span>
                {t.is_system && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs">System</span>}
              </div>
              <button onClick={() => setEditing({ ...t, name: t.is_system ? t.name + " (My copy)" : t.name })} className="text-sm text-brand-600 hover:underline">
                Customize
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">{t.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{t.body.slice(0, 180)}...</pre>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-card">
            <h2 className="font-semibold">Edit template</h2>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input-field mt-3" />
            <input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="input-field mt-2" />
            <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={12} className="input-field mt-2" />
            <div className="mt-4 flex gap-2">
              <button onClick={saveEdit} className="btn-primary">Save</button>
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-surface-border bg-white p-5 shadow-card">
        <h2 className="font-medium">Create new template</h2>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field mt-3" />
        <select value={form.template_type} onChange={(e) => setForm({ ...form, template_type: e.target.value })} className="input-field mt-2">
          <option value="intro">Intro</option>
          <option value="collaboration">Collaboration</option>
          <option value="budget">Budget</option>
          <option value="follow_up">Follow-up</option>
        </select>
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field mt-2" />
        <textarea placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="input-field mt-2" />
        <button onClick={saveNew} className="btn-primary mt-3">Create</button>
      </div>
    </AppShell>
  );
}
