"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;

  const load = (p = page) => {
    setLoading(true);
    fetch(`/api/notifications?page=${p}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.items || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/notifications", { method: "PATCH" }).finally(() => load(1));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">{t("notifications.title")}</h2>

      {loading ? (
        <p className="text-sm text-gray-400">{t("notifications.loading")}</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">{t("notifications.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (n.expenseId) router.push(`/expenses/${n.expenseId}`); }}
              className={`cursor-pointer rounded-lg border p-4 transition-shadow hover:shadow-md ${
                n.read ? "bg-white" : "bg-blue-50/60 border-blue-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {n.type === "new_submission" ? t("notifications.typeApproval") : t("notifications.typeResult")}
                    </span>
                    {!n.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  <p className="font-medium text-sm text-gray-800">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleDateString('en-US', {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{t("notifications.totalMessages").replace("{total}", String(total))}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }}
              disabled={page <= 1} className="rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              {t("notifications.prevPage")}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => { setPage(n); load(n); }}
                className={`min-w-[32px] rounded border px-2 py-1 ${n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }}
              disabled={page >= totalPages} className="rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              {t("notifications.nextPage")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
