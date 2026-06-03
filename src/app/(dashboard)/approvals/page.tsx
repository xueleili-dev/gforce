"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function ApprovalsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/approvals/pending")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAction(recordId: string, expenseId: string, action: string) {
    const comment = action !== "approve" ? prompt(t("approvals.commentPrompt")) || "" : "";
    const res = await fetch(`/api/approvals/${recordId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== recordId));
      window.dispatchEvent(new Event("pending-count-updated"));
      toast(action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Returned");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error || d.message || "Action failed", "error");
    }
  }

  const filtered = search
    ? items.filter(
        (item) =>
          item.expenseTitle.toLowerCase().includes(search.toLowerCase()) ||
          item.applicantName.toLowerCase().includes(search.toLowerCase()) ||
          item.departmentName.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t("approvals.title")}</h2>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("approvals.searchPlaceholder")}
            className="w-56 rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">{t("approvals.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">{search ? t("approvals.noMatch") : t("approvals.empty")}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span
                    className="font-medium cursor-pointer hover:text-blue-600"
                    onClick={() => router.push(`/expenses/${item.expenseId}`)}
                  >
                    {item.expenseTitle}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {item.applicantName} · {item.departmentName}
                  </span>
                </div>
                <span className="font-semibold">M{Number(item.amount).toLocaleString()}</span>
              </div>
              {item.description && (
                <p className="mb-2 text-sm text-gray-500 truncate">{item.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {item.expenseType} · {item.expenseDate}
                </span>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => handleAction(item.id, item.expenseId, "reject")}>
                    {t("approvals.reject")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAction(item.id, item.expenseId, "return")}>
                    {t("approvals.return")}
                  </Button>
                  <Button size="sm" onClick={() => handleAction(item.id, item.expenseId, "approve")}>
                    {t("approvals.approve")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
