"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useI18n } from "@/i18n";

export function UserHeader({
  userName,
  userEmail,
  userRole,
  onMenuToggle,
}: {
  userName: string;
  userEmail: string;
  userRole: string;
  onMenuToggle?: () => void;
}) {
  const { lang, t, setLang } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/notifications?count=true")
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between border-b bg-white px-4 md:px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label={t("header.menu")}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-sm font-medium text-slate-700 hidden sm:block">{t("header.internalSystem")}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language switcher */}
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={lang === "en" ? "Switch to Chinese" : "切换到英文"}
        >
          {lang === "en" ? "中文" : "EN"}
        </button>

        <Link
          href="/notifications"
          className="relative rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">{userName}</p>
          <p className="text-xs text-slate-400 hidden sm:block">
            {t(`roles.${userRole}`) || userRole} · {userEmail}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
          {userName?.charAt(0) || "?"}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 hidden sm:block"
        >
          {t("header.logout")}
        </button>
      </div>
    </header>
  );
}
