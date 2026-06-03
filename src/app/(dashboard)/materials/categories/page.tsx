"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function CategoriesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catError, setCatError] = useState("");
  // Per-category material form state
  const [matForms, setMatForms] = useState<Record<string, { name: string; spec: string; unit: string; safety: string }>>({});
  const [matErrors, setMatErrors] = useState<Record<string, string>>({});
  // Batch delete state
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [txClearing, setTxClearing] = useState(false);
  const [orderClearing, setOrderClearing] = useState(false);
  // Inline edit state for materials
  const [editingMat, setEditingMat] = useState<{ id: string; name: string; spec: string; unit: string; safety: string; categoryId: string } | null>(null);

  function load() {
    fetch("/api/materials/categories").then((r) => r.json()).then(setCategories);
  }

  useEffect(() => { load(); }, []);

  function getMatForm(catId: string) {
    return matForms[catId] || { name: "", spec: "", unit: "", safety: "" };
  }

  function setMatForm(catId: string, field: string, value: string) {
    setMatForms((prev) => ({
      ...prev,
      [catId]: { ...(prev[catId] || { name: "", spec: "", unit: "", safety: "" }), [field]: value },
    }));
    setMatErrors((prev) => ({ ...prev, [catId]: "" }));
  }

  // ── Category CRUD ──

  function openNewCat() {
    setEditCatId(null);
    setCatName("");
    setShowCatForm(true);
    setCatError("");
  }

  function openEditCat(c: any) {
    setEditCatId(c.id);
    setCatName(c.name);
    setShowCatForm(true);
    setCatError("");
  }

  async function saveCategory() {
    if (!catName.trim()) { setCatError("Name is required"); return; }
    const url = editCatId ? `/api/materials/categories/${editCatId}` : "/api/materials/categories";
    const method = editCatId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: catName.trim() }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setCatError(d.error || "Save failed"); return; }
    setShowCatForm(false);
    toast(editCatId ? "Category updated" : "Category created");
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    const res = await fetch(`/api/materials/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d.error || "Delete failed", "error"); return; }
    if (expanded === id) setExpanded(null);
    toast("Category deleted");
    load();
  }

  // ── Material CRUD ──

  async function addMaterial(categoryId: string) {
    const f = getMatForm(categoryId);
    if (!f.name.trim()) { setMatErrors((prev) => ({ ...prev, [categoryId]: "Name is required" })); return; }
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name.trim(), spec: f.spec.trim(), unit: f.unit.trim(), safetyStock: parseFloat(f.safety) || 0, categoryId }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setMatErrors((prev) => ({ ...prev, [categoryId]: d.error || "Save failed" })); return; }
    setMatForms((prev) => ({ ...prev, [categoryId]: { name: "", spec: "", unit: "", safety: "" } }));
    setMatErrors((prev) => ({ ...prev, [categoryId]: "" }));
    toast("Material added");
    load();
  }

  function startEditMat(m: any, catId: string) {
    setEditingMat({ id: m.id, name: m.name, spec: m.spec || "", unit: m.unit || "", safety: String(m.safetyStock || ""), categoryId: catId });
  }

  function cancelEditMat() {
    setEditingMat(null);
  }

  async function saveEditMat() {
    if (!editingMat) return;
    if (!editingMat.name.trim()) { toast("Name is required", "error"); return; }
    const res = await fetch(`/api/materials/${editingMat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingMat.name.trim(), spec: editingMat.spec.trim(), unit: editingMat.unit.trim(), safetyStock: parseFloat(editingMat.safety) || 0 }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d.error || "Save failed", "error"); return; }
    setEditingMat(null);
    toast("Material updated");
    load();
  }

  async function deleteMaterial(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast(d.error || "Delete failed", "error"); return; }
    toast("Material deleted");
    load();
  }

  async function clearTransactions() {
    if (!batchStart || !batchEnd) { toast("Select both start and end date", "error"); return; }
    if (!confirm(`PERMANENTLY DELETE all transaction history between ${batchStart} and ${batchEnd}?\n\nThis action cannot be undone.`)) return;
    setTxClearing(true);
    const res = await fetch(`/api/materials/transactions?startDate=${batchStart}&endDate=${batchEnd}`, { method: "DELETE" });
    if (!res.ok) { toast("Delete failed", "error"); setTxClearing(false); return; }
    const d = await res.json();
    toast(`Deleted ${d.deleted} transaction records`);
    setTxClearing(false);
    setBatchStart(""); setBatchEnd("");
  }

  async function clearOutboundOrders() {
    if (!batchStart || !batchEnd) { toast("Select both start and end date", "error"); return; }
    if (!confirm(`PERMANENTLY DELETE all outbound orders and their transactions between ${batchStart} and ${batchEnd}?\n\nThis action cannot be undone.`)) return;
    setOrderClearing(true);
    const res = await fetch(`/api/materials/outbound?startDate=${batchStart}&endDate=${batchEnd}&action=deleteOrders`, { method: "DELETE" });
    if (!res.ok) { toast("Delete failed", "error"); setOrderClearing(false); return; }
    const d = await res.json();
    toast(`Deleted ${d.deleted} outbound orders`);
    setOrderClearing(false);
    setBatchStart(""); setBatchEnd("");
  }

  function toggleExpand(catId: string) {
    if (expanded === catId) {
      setExpanded(null);
      setEditingMat(null);
    } else {
      setExpanded(catId);
      setEditingMat(null);
      // Initialize form for this category if not yet set
      setMatForms((prev) => {
        if (prev[catId]) return prev;
        return { ...prev, [catId]: { name: "", spec: "", unit: "", safety: "" } };
      });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.categories")}</h2>
        <button onClick={openNewCat} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t("material.createCategory")}
        </button>
      </div>

      {showCatForm && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {catError && <div className="mb-2 text-sm text-red-600">{catError}</div>}
          <div className="flex gap-2 mb-3">
            <input placeholder={t("material.categoryName")} value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-56 rounded border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveCategory} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">Save</button>
            <button onClick={() => setShowCatForm(false)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No categories yet</p>
        ) : categories.map((cat) => {
          const isExpanded = expanded === cat.id;
          const matCount = cat._count?.materials || 0;
          const form = getMatForm(cat.id);
          const formErr = matErrors[cat.id] || "";

          return (
          <div key={cat.id} className="rounded-lg bg-white shadow-sm border border-slate-200/60">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(cat.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{isExpanded ? "▾" : "▸"}</span>
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-gray-400">({matCount} materials)</span>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEditCat(cat)}
                  className="text-sm text-indigo-600 hover:underline">Edit</button>
                {matCount > 0 ? (
                  <span className="text-sm text-gray-300 cursor-not-allowed" title="Cannot delete category with materials">Delete</span>
                ) : (
                  <button onClick={() => deleteCategory(cat.id)}
                    className="text-sm text-red-600 hover:underline">Delete</button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3">
                {/* Add material form */}
                <div className="flex gap-2 mb-3">
                  <input placeholder={t("material.name")} value={form.name}
                    onChange={(e) => setMatForm(cat.id, "name", e.target.value)}
                    className="w-52 rounded border border-slate-200 px-3 py-2 text-sm" />
                  <input placeholder={t("material.spec")} value={form.spec}
                    onChange={(e) => setMatForm(cat.id, "spec", e.target.value)}
                    className="w-60 rounded border border-slate-200 px-3 py-2 text-sm" />
                  <input placeholder={t("material.unit")} value={form.unit}
                    onChange={(e) => setMatForm(cat.id, "unit", e.target.value)}
                    className="w-20 rounded border border-slate-200 px-3 py-2 text-sm" />
                  <input placeholder={t("material.safetyStock")} value={form.safety}
                    onChange={(e) => setMatForm(cat.id, "safety", e.target.value)}
                    className="w-24 rounded border border-slate-200 px-3 py-2 text-sm" />
                  <button onClick={() => addMaterial(cat.id)}
                    className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 whitespace-nowrap">+ Add</button>
                </div>
                {formErr && <p className="mb-2 text-sm text-red-600">{formErr}</p>}

                {/* Materials list */}
                {cat.materials?.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400">
                        <th className="pb-1 font-normal">{t("material.name")}</th>
                        <th className="pb-1 font-normal">{t("material.spec")}</th>
                        <th className="pb-1 font-normal text-center w-16">{t("material.unit")}</th>
                        <th className="pb-1 font-normal text-right w-16">{t("material.safetyStock")}</th>
                        <th className="pb-1 font-normal text-right">{t("material.currentStock")}</th>
                        <th className="pb-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.materials.map((m: any) => (
                        <tr key={m.id} className="border-t border-slate-50">
                          {editingMat && editingMat.id === m.id ? (
                            <>
                              <td className="py-1.5">
                                <input value={editingMat.name}
                                  onChange={(e) => setEditingMat({ ...editingMat, name: e.target.value })}
                                  className="w-full rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                              </td>
                              <td className="py-1.5">
                                <input value={editingMat.spec}
                                  onChange={(e) => setEditingMat({ ...editingMat, spec: e.target.value })}
                                  className="w-full rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                              </td>
                              <td className="py-1.5">
                                <input value={editingMat.unit}
                                  onChange={(e) => setEditingMat({ ...editingMat, unit: e.target.value })}
                                  className="w-full rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                              </td>
                              <td className="py-1.5">
                                <input value={editingMat.safety}
                                  onChange={(e) => setEditingMat({ ...editingMat, safety: e.target.value })}
                                  placeholder="Safety"
                                  className="w-16 rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                              </td>
                              <td className="py-1.5 text-right text-gray-400">{m.currentStock}</td>
                              <td className="py-1.5 text-right">
                                <button onClick={saveEditMat} className="text-sm text-green-600 hover:underline mr-2">Save</button>
                                <button onClick={cancelEditMat} className="text-sm text-gray-400 hover:underline">Cancel</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5 font-medium">{m.name}</td>
                              <td className="py-1.5 text-gray-500">{m.spec || "-"}</td>
                              <td className="py-1.5 text-center text-gray-500">{m.unit || "-"}</td>
                              <td className="py-1.5 text-right text-gray-400">{m.safetyStock || 0}</td>
                              <td className="py-1.5 text-right">{m.currentStock}</td>
                              <td className="py-1.5 text-right space-x-2">
                                <button onClick={() => startEditMat(m, cat.id)}
                                  className="text-sm text-indigo-600 hover:underline">Edit</button>
                                <button onClick={() => deleteMaterial(m.id)}
                                  className="text-sm text-red-600 hover:underline">Delete</button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400">No materials in this category</p>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Clear Transaction History */}
      <div className="mt-8 rounded-lg border-2 border-red-200 bg-red-50/50 p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Clear Transaction History</h3>
        <p className="text-xs text-red-500 mb-3">Permanently delete all stock transaction records within the selected date range. Orders remain intact, only the history log is cleared. Cannot be undone.</p>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">From</label>
            <input type="date" value={batchStart} onChange={(e) => setBatchStart(e.target.value)}
              className="rounded border border-red-200 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">To</label>
            <input type="date" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)}
              className="rounded border border-red-200 px-3 py-1.5 text-sm" />
          </div>
          <button onClick={clearTransactions} disabled={txClearing || !batchStart || !batchEnd}
            className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
            {txClearing ? "Deleting..." : "Clear Transaction History"}
          </button>
          <button onClick={clearOutboundOrders} disabled={orderClearing || !batchStart || !batchEnd}
            className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
            {orderClearing ? "Deleting..." : "Clear Outbound Orders"}
          </button>
        </div>
      </div>
    </div>
  );
}
