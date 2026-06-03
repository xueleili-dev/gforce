"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function MaterialsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [materials, setMaterials] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projectHistory, setProjectHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [txType, setTxType] = useState("all");
  const [txMaterialId, setTxMaterialId] = useState("");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txCustomerId, setTxCustomerId] = useState("");
  const [txProject, setTxProject] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  useEffect(() => {
    fetch("/api/materials/categories").then((r) => r.json()).then(setCategories);
    fetch("/api/materials/customers").then((r) => r.json()).then(setCustomers);
    fetch("/api/materials/outbound?projects=1").then((r) => r.json()).then(setProjectHistory);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    fetch(`/api/materials?${params}`).then((r) => r.json()).then(setMaterials);
  }, [search, categoryFilter]);

  useEffect(() => {
    const params = new URLSearchParams({ type: txType, page: String(txPage), pageSize: "15" });
    if (txMaterialId) params.set("materialId", txMaterialId);
    if (txStartDate) params.set("startDate", txStartDate);
    if (txEndDate) params.set("endDate", txEndDate);
    if (txCustomerId) params.set("customerId", txCustomerId);
    if (txProject) params.set("project", txProject);
    fetch(`/api/materials/transactions?${params}`).then((r) => r.json()).then((d) => {
      setTransactions(d.items || []);
      setTxTotal(d.total || 0);
    }).catch(() => {});
  }, [txType, txMaterialId, txStartDate, txEndDate, txCustomerId, txProject, txPage]);

  function getStockStatus(item: any) {
    if (item.currentStock <= 0) return { label: t("material.out"), color: "bg-red-100 text-red-700" };
    if (item.currentStock <= item.safetyStock) return { label: t("material.low"), color: "bg-yellow-100 text-yellow-700" };
    return { label: t("material.normal"), color: "bg-green-100 text-green-700" };
  }

  const txTotalPages = Math.max(1, Math.ceil(txTotal / 15));

  function downloadCsv(filename: string, headers: string[], rows: string[][]) {
    const bom = "﻿";
    const csv = bom + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportStock() {
    downloadCsv(
      `materials_${new Date().toISOString().split("T")[0]}.csv`,
      [t("material.name"), t("material.category"), t("material.spec"), t("material.unit"), t("material.currentStock"), t("material.safetyStock"), t("material.status")],
      materials.map((m) => {
        const st = getStockStatus(m);
        return [m.name, m.categoryName || "", m.spec || "", m.unit || "", String(m.currentStock), String(m.safetyStock), st.label];
      })
    );
  }

  function exportTransactions() {
    downloadCsv(
      `transactions_${new Date().toISOString().split("T")[0]}.csv`,
      [t("material.date"), t("material.type"), t("material.name"), t("material.quantity"), t("material.currentStock"), t("material.operator"), t("material.customer"), t("material.project")],
      transactions.map((tx) => {
        const isOutCancelled = tx.orderType === "void" && tx.type === "in";
        const typeLabel = isOutCancelled ? "Void" : tx.type === "in" ? t("material.inbound") : t("material.outbound");
        return [
          new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          typeLabel,
          tx.materialName,
          `${tx.quantity} ${tx.materialUnit}`,
          String(tx.afterStock),
          tx.operatorName,
          tx.customerName || "",
          tx.notes || "",
        ];
      })
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-xl font-semibold">{t("material.overview")}</h2>
        <div className="flex gap-2">
          <button onClick={() => router.push("/materials/inbound")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
            {t("material.addStock")}
          </button>
          <button onClick={() => router.push("/materials/outbound")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {t("material.outbound")}
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 flex-wrap mb-2 shrink-0">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("material.search")}
            className="w-56 rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-slate-200 px-3 py-1.5 text-sm">
            <option value="">{t("material.category")}</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button onClick={exportStock} className="rounded border border-green-200 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50">
            {t("material.export")}
          </button>
        </div>

        <div className="rounded-lg bg-white shadow-sm overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">{t("material.name")}</th>
                <th className="px-3 py-2 text-left">{t("material.category")}</th>
                <th className="px-3 py-2 text-left">{t("material.spec")}</th>
                <th className="px-3 py-2 text-center">{t("material.unit")}</th>
                <th className="px-3 py-2 text-right">{t("material.currentStock")}</th>
                <th className="px-3 py-2 text-right">{t("material.safetyStock")}</th>
                <th className="px-3 py-2 text-center">{t("material.status")}</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No materials yet</td></tr>
              ) : (
                materials.map((m) => {
                  const st = getStockStatus(m);
                  return (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-gray-500">{m.categoryName}</td>
                      <td className="px-3 py-2 text-gray-500">{m.spec || "-"}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{m.unit || "-"}</td>
                      <td className="px-3 py-2 text-right font-medium">{m.currentStock}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{m.safetyStock}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History */}
      <div className="flex flex-col flex-1 min-h-0 mt-4">
        <div className="flex flex-wrap items-end gap-2 mb-2 shrink-0">
          <h3 className="font-medium text-sm mr-1">{t("material.transactionHistory")}</h3>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
            <input type="date" value={txStartDate} onChange={(e) => { setTxStartDate(e.target.value); setTxPage(1); }}
              className="rounded border border-slate-200 px-2 py-1 text-xs w-28" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
            <input type="date" value={txEndDate} onChange={(e) => { setTxEndDate(e.target.value); setTxPage(1); }}
              className="rounded border border-slate-200 px-2 py-1 text-xs w-28" />
          </div>
          <select value={txType} onChange={(e) => { setTxType(e.target.value); setTxPage(1); }}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm">
            <option value="all">All</option>
            <option value="in">{t("material.inbound")}</option>
            <option value="out">{t("material.outbound")}</option>
          </select>
          <select value={txMaterialId} onChange={(e) => { setTxMaterialId(e.target.value); setTxPage(1); }}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm">
            <option value="">{t("material.name")}...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select value={txCustomerId} onChange={(e) => { setTxCustomerId(e.target.value); setTxPage(1); }}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm">
            <option value="">{t("material.customer")}...</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div>
            <input type="text" value={txProject} onChange={(e) => { setTxProject(e.target.value); setTxPage(1); }}
              list="tx-project-list"
              placeholder={t("material.project") + "..."}
              className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm" />
            <datalist id="tx-project-list">
              {projectHistory.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
          <button type="button" onClick={() => {
            setTxType("all"); setTxMaterialId(""); setTxStartDate(""); setTxEndDate("");
            setTxCustomerId(""); setTxProject(""); setTxPage(1);
          }}
            className="rounded border border-slate-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">Clear</button>
          <div className="flex-1" />
          <button onClick={exportTransactions} className="rounded border border-green-200 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 mb-0.5">
            {t("material.export")}
          </button>
        </div>

        <div className="rounded-lg bg-white shadow-sm overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">{t("material.date")}</th>
                <th className="px-3 py-2 text-center">{t("material.type")}</th>
                <th className="px-3 py-2 text-left">{t("material.name")}</th>
                <th className="px-3 py-2 text-right">{t("material.quantity")}</th>
                <th className="px-3 py-2 text-right">{t("material.currentStock")}</th>
                <th className="px-3 py-2 text-left">{t("material.operator")}</th>
                <th className="px-3 py-2 text-left">{t("material.customer")}</th>
                <th className="px-3 py-2 text-left">{t("material.project")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>
              ) : (
                transactions.map((tx) => {
                  const isOutCancelled = tx.orderType === "void" && tx.type === "in";
                  const typeLabel = isOutCancelled ? "Void" : tx.type === "in" ? t("material.inbound") : t("material.outbound");
                  const typeColor = isOutCancelled ? "bg-gray-100 text-gray-500" :
                    tx.type === "in" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";
                  return (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>{typeLabel}</span>
                      </td>
                      <td className="px-3 py-2 font-medium">{tx.materialName}</td>
                      <td className="px-3 py-2 text-right">{tx.quantity} {tx.materialUnit}</td>
                      <td className="px-3 py-2 text-right">{tx.afterStock}</td>
                      <td className="px-3 py-2 text-gray-500">{tx.operatorName}</td>
                      <td className="px-3 py-2 text-gray-500">{tx.customerName || "-"}</td>
                      <td className="px-3 py-2 text-gray-400">{tx.notes || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {txTotal > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500 shrink-0">
            <span>{txTotal} records</span>
            <div className="flex gap-1">
              <button onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage <= 1}
                className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&larr;</button>
              <span className="px-2 py-0.5">{txPage} / {txTotalPages}</span>
              <button onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))} disabled={txPage >= txTotalPages}
                className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&rarr;</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
