"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function CustomersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/materials/customers").then((r) => r.json()).then(setItems);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ name: "", contact: "", phone: "" });
    setShowForm(true);
    setError("");
  }

  function openEdit(c: any) {
    setEditId(c.id);
    setForm({ name: c.name, contact: c.contact || "", phone: c.phone || "" });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    const url = editId ? `/api/materials/customers/${editId}` : "/api/materials/customers";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Save failed"); return; }
    toast(editId ? "Customer updated" : "Customer created");
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    const res = await fetch(`/api/materials/customers/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d.error || "Delete failed", "error"); return; }
    toast("Customer deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.customers")}</h2>
        <button onClick={openNew} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t("material.createCustomer")}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input placeholder={t("material.customerName")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder={t("material.contact")} value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder={t("material.phone")} value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">Save</button>
            <button onClick={() => setShowForm(false)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.customerName")}</th>
              <th className="px-3 py-2 text-left">{t("material.contact")}</th>
              <th className="px-3 py-2 text-left">{t("material.phone")}</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No customers yet</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-gray-500">{c.contact || "-"}</td>
                <td className="px-3 py-2 text-gray-500">{c.phone || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(c)} className="mr-2 text-sm text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
