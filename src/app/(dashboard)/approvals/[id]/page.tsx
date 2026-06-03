"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { ExpenseDetail } from "@/types";

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(recordId: string, action: string) {
    const comment = action !== "approve" ? prompt(t("approvals.commentPrompt")) || "" : "";
    await fetch(`/api/approvals/${recordId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    router.push("/approvals");
  }

  if (loading) return <p className="text-gray-500">{t("approvals.loading")}</p>;
  if (!expense) return <p className="text-gray-500">{t("expenseDetail.notFound")}</p>;

  const pendingRecord = expense.approvalRecords.find((r) => !r.action);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; {t("expenseDetail.back")}</button>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{expense.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{expense.applicantName} · {expense.departmentName} · {expense.expenseDate}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">M{Number(expense.amount).toLocaleString()}</p>
            <Badge status={expense.status} />
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">{t("expenseDetail.description")}</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{expense.description}</p>
        </div>
        {expense.attachments.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">{t("expenseDetail.attachments")}</h3>
            <div className="flex flex-wrap gap-2">
              {expense.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" className="text-sm text-blue-600 hover:underline">{a.filename}</a>
              ))}
            </div>
          </div>
        )}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">{t("expenseDetail.approvalProgress")}</h3>
          <div className="space-y-2 mb-4">
            {expense.approvalRecords.map((record) => (
              <div key={record.id} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full ${record.action === "approved" ? "bg-green-500" : record.action === "rejected" ? "bg-red-500" : "bg-gray-300"}`} />
                <span className="font-medium">{record.approverName}</span>
                <span className="text-gray-500">({t(`approvalLevels.${record.level}`)})</span>
                {record.action ? (
                  <span className={record.action === "approved" ? "text-green-600" : "text-red-600"}>
                    {t(`approvalLevels.${record.action}`)}
                  </span>
                ) : (
                  <span className="text-yellow-600">{t("expenseDetail.pending")}</span>
                )}
                {record.actedAt && <span className="text-gray-400 text-xs">{new Date(record.actedAt).toLocaleString('en-US')}</span>}
              </div>
            ))}
          </div>
          {pendingRecord && (
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="danger" onClick={() => handleAction(pendingRecord.id, "reject")}>{t("approvals.reject")}</Button>
              <Button variant="secondary" onClick={() => handleAction(pendingRecord.id, "return")}>{t("approvals.returnModify")}</Button>
              <Button onClick={() => handleAction(pendingRecord.id, "approve")}>{t("approvals.approve")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
