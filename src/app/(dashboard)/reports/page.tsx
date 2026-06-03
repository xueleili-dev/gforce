"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

export default function ReportsPage() {
  const { t, ta } = useI18n();
  const [tab, setTab] = useState<"summary" | "details">("summary");
  const [year, setYear] = useState(new Date().getFullYear());
  const [company, setCompany] = useState<any>(null);
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [personalSummaries, setPersonalSummaries] = useState<any[]>([]);

  const months = ta("months");

  useEffect(() => {
    fetch(`/api/reports/company?year=${year}`).then((r) => r.json()).then(setCompany);
    fetch(`/api/reports/by-department?year=${year}`).then((r) => r.json()).then(setDeptReport);
    fetch(`/api/reports/personal-summaries?year=${year}`).then((r) => r.json()).then(setPersonalSummaries);
  }, [year]);

  // Details tab state
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dPage, setDPage] = useState(1);
  const [dTotal, setDTotal] = useState(0);
  const [dSearch, setDSearch] = useState("");
  const [dStartDate, setDStartDate] = useState("");
  const [dEndDate, setDEndDate] = useState("");
  const [dType, setDType] = useState("all");
  const [dStatus, setDStatus] = useState("all");
  const [dProject, setDProject] = useState("");
  const pageSize = 20;

  useEffect(() => {
    if (tab !== "details") return;
    setLoading(true);
    const p = new URLSearchParams({ page: String(dPage), pageSize: String(pageSize), status: "all" });
    if (dSearch) p.set("search", dSearch);
    if (dStartDate) p.set("startDate", dStartDate);
    if (dEndDate) p.set("endDate", dEndDate);
    fetch(`/api/expenses?${p}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setDTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [tab, dPage, dSearch, dStartDate, dEndDate]);

  const dTotalPages = Math.max(1, Math.ceil(dTotal / pageSize));

  // Client-side type/status filter
  const filtered = items.filter((item) => {
    if (dType !== "all" && item.type !== dType) return false;
    if (dStatus !== "all" && item.status !== dStatus) return false;
    if (dProject && !(item.project || "").toLowerCase().includes(dProject.toLowerCase())) return false;
    return true;
  });

  const EXPENSE_TYPES = ["travel", "procurement", "entertainment", "general"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("reports.title")}</h2>
        <div className="flex items-center gap-3">
          {tab === "summary" && (
            <>
              <button onClick={() => window.open(`/api/reports/export?year=${year}&type=department`)}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                {t("reports.exportDept")}
              </button>
              <button onClick={() => window.open(`/api/reports/export?year=${year}&type=personal`)}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                {t("reports.exportPersonal")}
              </button>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="rounded border px-3 py-2 text-sm">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{t("yearSelect").replace("{year}", String(y)).replace("{nextYear}", String(y + 1))}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-200">
        <button onClick={() => setTab("summary")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "summary" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>Summary</button>
        <button onClick={() => setTab("details")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "details" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>Details</button>
      </div>

      {tab === "summary" ? (
        /* ── Summary Tab ── */
        <>
          {company && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{t("reports.annualBudget")}</p>
                <p className="text-2xl font-bold text-blue-600">M{company.totalBudget.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{t("reports.actualExpense")}</p>
                <p className="text-2xl font-bold text-red-600">M{company.totalExpense.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{t("reports.budgetUsed")}</p>
                <p className="text-2xl font-bold text-orange-600">M{company.totalUsed.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{t("reports.remaining")}</p>
                <p className={`text-2xl font-bold ${company.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                  M{company.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {company && (
            <div className="rounded-lg bg-white shadow-sm mb-6 p-6">
              <h3 className="font-medium mb-4">{t("reports.companyMonthlyTrend")}</h3>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {company.monthlyExpenses.map((amt: number, i: number) => {
                  const max = Math.max(...company.monthlyExpenses, 1);
                  const h = (amt / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-600">M{(amt / 1000).toFixed(1)}k</span>
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(h, 2)}%` }} />
                      <span className="text-xs text-gray-400">{months[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white shadow-sm mb-6 overflow-x-auto">
            <div className="p-6 pb-0"><h3 className="font-medium mb-4">{t("reports.departmentMonthlyDetail")}</h3></div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">{t("reports.department")}</th>
                  {months.map((m: string) => <th key={m} className="px-2 py-2 text-right w-16">{m}</th>)}
                  <th className="px-3 py-2 text-right font-medium bg-blue-50">{t("reports.annualTotal")}</th>
                  <th className="px-3 py-2 text-right font-medium bg-green-50">{t("reports.budget")}</th>
                  <th className="px-3 py-2 text-right font-medium bg-orange-50">{t("reports.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {deptReport.map((d: any) => (
                  <tr key={d.departmentId} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-white">{d.departmentName}</td>
                    {d.monthlyExpenses.map((amt: number, i: number) => (
                      <td key={i} className={`px-2 py-2 text-right ${amt > 0 ? "" : "text-gray-300"}`}>
                        {amt > 0 ? `M${amt.toLocaleString()}` : "-"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium bg-blue-50/50">M{d.totalExpense.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right bg-green-50/50">M{d.budgetTotal.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-medium bg-orange-50/50 ${d.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                      M{d.remaining.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
            <div className="p-6 pb-0"><h3 className="font-medium mb-4">{t("reports.personalMonthlySummary")}</h3></div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">{t("reports.name")}</th>
                  <th className="px-3 py-2 text-left">{t("reports.dept")}</th>
                  {months.map((m: string) => <th key={m} className="px-2 py-2 text-right w-16">{m}</th>)}
                  <th className="px-3 py-2 text-right font-medium bg-blue-50">{t("reports.annualTotal")}</th>
                  <th className="px-3 py-2 text-right">{t("reports.count")}</th>
                </tr>
              </thead>
              <tbody>
                {personalSummaries.length === 0 ? (
                  <tr><td colSpan={4 + months.length} className="px-4 py-8 text-center text-sm text-gray-400">{t("reports.noData")}</td></tr>
                ) : (
                  personalSummaries.map((u: any) => (
                    <tr key={u.userId} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium sticky left-0 bg-white">{u.userName}</td>
                      <td className="px-3 py-2 text-gray-500">{u.departmentName}</td>
                      {u.monthlyBreakdown.map((amt: number, i: number) => (
                        <td key={i} className={`px-2 py-2 text-right ${amt > 0 ? "" : "text-gray-300"}`}>
                          {amt > 0 ? `M${amt.toLocaleString()}` : "-"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium bg-blue-50/50">M{u.totalAmount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{u.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* ── Details Tab ── */
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
              <input type="date" value={dStartDate} onChange={(e) => { setDStartDate(e.target.value); setDPage(1); }}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
              <input type="date" value={dEndDate} onChange={(e) => { setDEndDate(e.target.value); setDPage(1); }}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Type</label>
              <select value={dType} onChange={(e) => setDType(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm">
                <option value="all">All</option>
                {EXPENSE_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Status</label>
              <select value={dStatus} onChange={(e) => setDStatus(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm">
                <option value="all">All</option>
                {["draft","submitted","level1_approval","level2_approval","countersign","finance_review","approved","rejected","withdrawn","paid"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Project</label>
              <input type="text" value={dProject} onChange={(e) => setDProject(e.target.value)}
                placeholder="Search..."
                className="w-32 rounded border border-slate-200 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Search</label>
              <input type="text" value={dSearch} onChange={(e) => { setDSearch(e.target.value); setDPage(1); }}
                placeholder="Title / Applicant..."
                className="w-44 rounded border border-slate-200 px-2 py-1.5 text-sm" />
            </div>
            <button onClick={() => { setDSearch(""); setDStartDate(""); setDEndDate(""); setDType("all"); setDStatus("all"); setDProject(""); setDPage(1); }}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">Clear</button>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">{dTotal} records</span>
          </div>

          {/* Table */}
          <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Applicant</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No expenses found</td></tr>
                ) : filtered.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.expenseDate}</td>
                    <td className="px-3 py-2 font-medium">{item.title}</td>
                    <td className="px-3 py-2 text-gray-500">{item.project || "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{item.type}</td>
                    <td className="px-3 py-2 text-right font-medium">M{Number(item.amount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-500">{item.applicantName}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "approved" || item.status === "paid" ? "bg-green-100 text-green-700" :
                        item.status === "rejected" ? "bg-red-100 text-red-700" :
                        item.status === "draft" || item.status === "withdrawn" ? "bg-gray-100 text-gray-500" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {dTotal > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>{dTotal} records</span>
              <div className="flex gap-1">
                <button onClick={() => setDPage((p) => Math.max(1, p - 1))} disabled={dPage <= 1}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&larr;</button>
                {(() => {
                  const pages: number[] = [];
                  const maxShow = 5;
                  let start = Math.max(1, dPage - 2);
                  let end = Math.min(dTotalPages, start + maxShow - 1);
                  if (end - start + 1 < maxShow) start = Math.max(1, end - maxShow + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((n) => (
                    <button key={n} onClick={() => setDPage(n)}
                      className={`min-w-[28px] rounded border px-2 py-0.5 ${n === dPage ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}>{n}</button>
                  ));
                })()}
                <button onClick={() => setDPage((p) => Math.min(dTotalPages, p + 1))} disabled={dPage >= dTotalPages}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&rarr;</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
