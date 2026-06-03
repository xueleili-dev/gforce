"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function OutboundPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [project, setProject] = useState("");
  const [projectHistory, setProjectHistory] = useState<string[]>([]);
  const [rows, setRows] = useState<{ materialId: string; quantity: number }[]>([{ materialId: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/materials").then((r) => r.json()).then(setMaterials);
    fetch("/api/materials/customers").then((r) => r.json()).then(setCustomers);
    fetch("/api/materials/outbound?projects=1").then((r) => r.json()).then(setProjectHistory);
  }, []);

  function addRow() { setRows([...rows, { materialId: "", quantity: 1 }]); }
  function removeRow(i: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, field: string, value: any) {
    const next = [...rows];
    (next[i] as any)[field] = value;
    setRows(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerId) { setError("Select a customer"); return; }
    const items = rows
      .filter((r) => r.materialId && r.quantity > 0)
      .map((r) => {
        const mat = materials.find((m) => m.id === r.materialId);
        return { materialId: r.materialId, name: mat?.name || "", quantity: r.quantity, unit: mat?.unit || "" };
      });
    if (items.length === 0) { setError("Add at least one material with quantity > 0"); return; }
    setSubmitting(true);
    const res = await fetch("/api/materials/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, project: project.trim(), items }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Submit failed"); setSubmitting(false); return;
    }
    toast("Outbound order created");
    fetch("/api/materials/outbound?projects=1").then((r) => r.json()).then(setProjectHistory);
    router.push("/materials");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-6">{t("material.outbound")}</h2>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 p-6">
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">{t("material.customer")}</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                <option value="">{t("material.selectCustomer")}...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">{t("material.project")}</label>
              <div className="flex gap-1">
                <input type="text" value={project} onChange={(e) => setProject(e.target.value)}
                  list="project-list"
                  placeholder={t("material.project") + "..."}
                  className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                <button type="button" onClick={() => { setProject(""); setProjectHistory([]); }}
                  className="rounded border border-slate-200 px-2 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50">Clear</button>
              </div>
              <datalist id="project-list">
                {projectHistory.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="mb-3 flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">{t("material.name")}</label>
                <select value={row.materialId} onChange={(e) => updateRow(i, "materialId", e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  <option value="">{t("material.name")}...</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} (stock: {m.currentStock})</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs text-gray-500">{t("material.quantity")}</label>
                <input type="number" min="1" value={row.quantity || ""}
                  onChange={(e) => { const v = parseInt(e.target.value); updateRow(i, "quantity", isNaN(v) ? 0 : v); }}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <button type="button" onClick={() => removeRow(i)}
                className="mb-0.5 rounded px-2 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">{t("material.remove")}</button>
            </div>
          ))}

          <button type="button" onClick={addRow}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 font-medium">{t("material.addMaterial")}</button>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {submitting ? "..." : t("material.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
