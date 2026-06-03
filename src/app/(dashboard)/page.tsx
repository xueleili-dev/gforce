"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const role = (session?.user as any)?.role || "employee";

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">{t("dashboard.title")}</h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          label={t("dashboard.thisMonthCount")}
          value={data.myMonthCount}
          href="/expenses"
          color="indigo"
        />
        <StatCard
          label={t("dashboard.thisMonthAmount")}
          value={`M${(Number(data.myMonthTotal) || 0).toLocaleString()}`}
          href="/expenses"
          color="blue"
        />
        {(role === "manager" || role === "dept_head" || role === "finance") && (
          <StatCard
            label={t("dashboard.pendingApproval")}
            value={data.pendingCount}
            href="/approvals"
            color={data.pendingCount > 0 ? "red" : "green"}
          />
        )}
        {role === "finance" && (
          <StatCard
            label={t("dashboard.pendingPayment")}
            value={data.pendingPaymentCount}
            href="/approvals"
            color="amber"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <QuickActions role={role} />
        <RecentExpenses items={data.recentExpenses || []} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: string | number;
  href: string;
  color: "indigo" | "blue" | "red" | "green" | "amber";
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${colors[color]}`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Link>
  );
}

function RecentExpenses({ items }: { items: any[] }) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl bg-white border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("dashboard.recentExpenses")}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{t("dashboard.noExpenses")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e: any) => (
            <li key={e.id}>
              <Link
                href={`/expenses/${e.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.expenseDate?.split("T")[0]}</p>
                </div>
                <span className="ml-2 shrink-0 text-sm font-medium text-gray-700">
                  M{Number(e.amount).toLocaleString()}
                </span>
                <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  ((): string => {
                    const colors: Record<string, string> = { draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700", level1_approval: "bg-yellow-100 text-yellow-700", level2_approval: "bg-yellow-100 text-yellow-700", countersign: "bg-purple-100 text-purple-700", finance_review: "bg-orange-100 text-orange-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", withdrawn: "bg-gray-100 text-gray-500", paid: "bg-emerald-100 text-emerald-700" };
                    return colors[e.status] || "bg-gray-100 text-gray-600";
                  })()
                }`}>
                  {t(`status.${e.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/expenses"
        className="mt-3 block text-center text-xs text-indigo-600 hover:text-indigo-800"
      >
        {t("dashboard.viewAll")} →
      </Link>
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  const { t } = useI18n();
  const actions = [
    { label: t("dashboard.newExpense"), href: "/expenses/new", icon: PlusIcon },
    { label: t("dashboard.myExpenses"), href: "/expenses", icon: ListIcon },
    ...(["manager", "dept_head", "finance"].includes(role)
      ? [{ label: t("dashboard.pendingApprovals"), href: "/approvals", icon: CheckIcon }]
      : []),
    { label: t("dashboard.expenseReports"), href: "/reports", icon: ChartIcon },
  ];

  return (
    <div className="rounded-xl bg-white border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("dashboard.quickActions")}</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
          >
            <action.icon />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
