"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useI18n } from "@/i18n";

type MenuItem = {
  href: string;
  i18nKey: string;
  roles: string[];
  section: "expense" | "materials" | "inspections";
};

const MENU_KEYS: MenuItem[] = [
  { href: "/expenses", i18nKey: "sidebar.myExpenses", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/expenses/new", i18nKey: "sidebar.newExpense", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/approvals", i18nKey: "sidebar.pendingApprovals", roles: ["manager", "dept_head", "finance"], section: "expense" },
  { href: "/reports", i18nKey: "sidebar.reports", roles: ["manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/budgets", i18nKey: "sidebar.budgets", roles: ["dept_head", "finance", "admin"], section: "expense" },
  { href: "/settings/users", i18nKey: "sidebar.userManagement", roles: ["admin"], section: "expense" },
  { href: "/settings/departments", i18nKey: "sidebar.departmentManagement", roles: ["admin"], section: "expense" },
  { href: "/notifications", i18nKey: "sidebar.notifications", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/settings/account", i18nKey: "sidebar.settings", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  // Material Management section
  { href: "/materials", i18nKey: "material.overview", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/inbound", i18nKey: "material.addStock", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/outbound", i18nKey: "material.outbound", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/orders", i18nKey: "material.orders", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/customers", i18nKey: "material.customers", roles: ["dept_head", "admin"], section: "materials" },
  { href: "/materials/categories", i18nKey: "material.categories", roles: ["dept_head", "admin"], section: "materials" },
  // Inspections section (admin + engineers)
  { href: "/inspections", i18nKey: "sidebar.inspections", roles: ["admin"], section: "inspections" },
];

export function Sidebar({
  userRole,
  isEngineer,
  pendingCount,
  isOpen,
  onClose,
}: {
  userRole: string;
  isEngineer?: boolean;
  pendingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const visibleItems = MENU_KEYS.filter((item) => {
    if (item.section === "inspections") {
      return userRole === "admin" || userRole === "dept_head" || userRole === "manager" || isEngineer === true;
    }
    return item.roles.includes(userRole);
  });
  const expenseItems = visibleItems.filter((i) => i.section === "expense");
  const materialItems = visibleItems.filter((i) => i.section === "materials");
  const inspectionItems = visibleItems.filter((i) => i.section === "inspections");

  function renderLink(item: MenuItem) {
    const showBadge = item.href === "/approvals" && pendingCount !== undefined && pendingCount > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`mb-0.5 flex items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
          pathname === item.href || (item.href !== "/materials" && pathname.startsWith(item.href))
            ? "bg-slate-700 text-white"
            : "text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
      >
        <span>{t(item.i18nKey)}</span>
        {showBadge && (
          <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 min-w-[20px] h-5 text-[11px] font-bold text-white leading-none">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </Link>
    );
  }

  const nav = (
    <div className="flex h-full w-56 flex-col bg-slate-800 text-white">
      <div className="border-b border-slate-700 px-4 py-4">
        <p className="text-sm font-bold tracking-wide whitespace-nowrap">GOLDEN FORCE PTY LTD</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-0.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {String(t("sidebar.title")).toUpperCase()}
        </p>
        {expenseItems.map(renderLink)}

        {materialItems.length > 0 && (
          <>
            <div className="mt-3 mb-1 border-t border-slate-700 pt-3">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t("material.sidebarTitle")}
              </p>
            </div>
            {materialItems.map(renderLink)}
          </>
        )}

        {inspectionItems.length > 0 && (
          <>
            <div className="mt-3 mb-1 border-t border-slate-700 pt-3">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Inspections
              </p>
            </div>
            {inspectionItems.map(renderLink)}
          </>
        )}

        <div className="border-t border-slate-700 mt-2 pt-2">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            {t("sidebar.logout")}
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0">{nav}</div>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full">{nav}</div>
        </div>
      )}
    </>
  );
}
