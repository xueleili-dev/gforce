"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { ExpenseDetail } from "@/types";

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action: "delete" | "withdraw") {
    setActionError("");
    setActionLoading(true);

    const methodMap = { delete: "DELETE", withdraw: "PUT" };
    const bodyMap = { delete: undefined, withdraw: JSON.stringify({ action: "withdraw" }) };

    const res = await fetch(`/api/expenses/${id}`, {
      method: methodMap[action],
      headers: { "Content-Type": "application/json" },
      body: bodyMap[action],
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || data.error?.message || t("expenseDetail.operationFailed"));
      setActionLoading(false);
      return;
    }

    router.push("/expenses");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">{t("expenses.loading")}</span>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">{t("expenseDetail.notFound")}</p>
        <button onClick={() => router.push("/expenses")} className="mt-2 text-sm text-indigo-600 hover:underline">{t("expenseDetail.backToList")}</button>
      </div>
    );
  }

  const canEdit = expense.status === "draft";
  const canDelete = expense.status === "draft";
  const canWithdraw = ["submitted", "level1_approval", "level2_approval", "countersign", "finance_review"].includes(expense.status);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">&larr; {t("expenseDetail.back")}</button>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-slate-800 truncate">{expense.title}</h2>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {t(`expenseTypes.${expense.type}`)}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {expense.applicantName} · {expense.departmentName} · {expense.expenseDate}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-2xl font-bold text-red-600">
                M{Number(expense.amount).toLocaleString()}
              </p>
              <Badge status={expense.status} />
            </div>
          </div>

          {expense.currentApproverName && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm">
              <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-indigo-700">
                {t("expenseDetail.currentApprover")}<span className="font-medium">{expense.currentApproverName}</span>
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t("expenseDetail.description")}</h3>
          <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{expense.description}</p>
        </div>

        <div className="px-6 py-4 border-t">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{t("expenseDetail.approvalProgress")}</h3>
          {expense.approvalRecords.length === 0 ? (
            <p className="text-sm text-gray-400">{t("expenseDetail.noApprovalRecords")}</p>
          ) : (
            <div className="relative">
              {expense.approvalRecords.map((record, i) => {
                const isLast = i === expense.approvalRecords.length - 1;
                const isActive = !record.action;

                return (
                  <div key={record.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 w-3 h-3 rounded-full border-2 shrink-0 ${
                        record.action === "approved" ? "bg-green-500 border-green-500" :
                        record.action === "rejected" ? "bg-red-500 border-red-500" :
                        record.action === "returned" ? "bg-orange-500 border-orange-500" :
                        record.action === "cancelled" ? "bg-gray-300 border-gray-300" :
                        "bg-white border-indigo-400"
                      }`} />
                      {!isLast && <div className="w-0.5 h-full min-h-[24px] bg-gray-200 my-1" />}
                    </div>
                    <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{record.approverName}</span>
                        <span className="text-xs text-gray-400">{t(`approvalLevels.${record.level}`)}</span>
                        {record.action && (
                          <span className={`text-xs font-medium ${
                            record.action === "approved" ? "text-green-600" :
                            record.action === "rejected" ? "text-red-600" :
                            record.action === "returned" ? "text-orange-600" :
                            "text-gray-400"
                          }`}>{t(`approvalLevels.${record.action}`)}</span>
                        )}
                        {isActive && (
                          <span className="text-xs font-medium text-indigo-600">{t("expenseDetail.pending")}</span>
                        )}
                      </div>
                      {record.comment && (
                        <p className="mt-1 text-sm text-gray-500 bg-gray-50 rounded px-3 py-1.5 italic">
                          {record.comment}
                        </p>
                      )}
                      {record.actedAt && (
                        <p className="mt-1 text-xs text-gray-400">{new Date(record.actedAt).toLocaleString('en-US')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {expense.attachments.length > 0 && (
          <div className="px-6 py-4 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t("expenseDetail.attachments")}</h3>
            <div className="flex flex-wrap gap-2">
              {expense.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {a.filename}
                </a>
              ))}
            </div>
          </div>
        )}

        {(canEdit || canDelete || canWithdraw) && (
          <div className="px-6 py-4 border-t bg-slate-50/50 rounded-b-xl">
            {actionError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {actionError}
              </div>
            )}
            <div className="flex gap-2">
              {canEdit && (
                <button onClick={() => router.push(`/expenses/${id}/edit`)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                  {t("expenseDetail.edit")}
                </button>
              )}
              {canWithdraw && (
                <button onClick={() => { if (confirm(t("expenseDetail.confirmWithdraw"))) handleAction("withdraw"); }}
                  disabled={actionLoading}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
                  {actionLoading ? t("expenseDetail.processing") : t("expenseDetail.withdraw")}
                </button>
              )}
              {canDelete && (
                <button onClick={() => { if (confirm(t("expenseDetail.confirmDelete"))) handleAction("delete"); }}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                  {actionLoading ? t("expenseDetail.processing") : t("expenseDetail.delete")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
