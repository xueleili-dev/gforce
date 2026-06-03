"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { ExpenseListItem } from "@/types";

export default function ExpensesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);

    fetch(`/api/expenses?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [status, search, startDate, endDate, minAmount, maxAmount, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function clearFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setPage(1);
  }

  const hasFilters = search || startDate || endDate || minAmount || maxAmount;

  const STATUS_TABS = [
    { key: "all", label: t("expenses.all") },
    { key: "draft", label: t("expenses.draft") },
    { key: "submitted", label: t("expenses.pending") },
    { key: "approved,paid", label: t("expenses.approved") },
    { key: "rejected", label: t("expenses.rejected") },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("expenses.title")}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { window.open(`/api/expenses/export?status=${status}`); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t("expenses.exportCsv")}
          </button>
          <Button onClick={() => router.push("/expenses/new")}>{t("expenses.newExpense")}</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1); }}
            className={`rounded-full px-3 py-1 text-sm ${status === tab.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("expenses.searchPlaceholder")}
            className="w-48 rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
          <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            hasFilters ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t("expenses.filter")}
          {hasFilters && <span className="ml-1">●</span>}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t("expenses.startDate")}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t("expenses.endDate")}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t("expenses.minAmount")}</label>
            <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="w-28 rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">{t("expenses.maxAmount")}</label>
            <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder={t("expenses.any")} className="w-28 rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              {t("expenses.clearFilter")}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{t("expenses.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">{t("expenses.empty")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/expenses/${item.id}`)}
              className="cursor-pointer rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-sm text-gray-500">{item.type} · {item.expenseDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={item.status} />
                  <span className="font-semibold">M{Number(item.amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{t("expenses.totalRecords").replace("{total}", String(total))}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              {t("expenses.prevPage")}
            </button>
            {(() => {
              const pages: number[] = [];
              const maxShow = 5;
              let start = Math.max(1, page - Math.floor(maxShow / 2));
              let end = Math.min(totalPages, start + maxShow - 1);
              if (end - start + 1 < maxShow) start = Math.max(1, end - maxShow + 1);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`min-w-[32px] rounded border px-2 py-1 ${n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}>
                  {n}
                </button>
              ));
            })()}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              {t("expenses.nextPage")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
