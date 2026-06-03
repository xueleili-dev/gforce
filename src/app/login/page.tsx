"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n";

const TEST_ACCOUNTS = [
  { labelKey: "admin", email: "admin@gfs.com" },
  { labelKey: "lee_dept_head", email: "lee@gfs.com" },
  { labelKey: "lichaba_manager", email: "lichaba@gfs.com" },
  { labelKey: "morongoe_finance", email: "morongoe@gfs.com" },
  { labelKey: "user_employee", email: "user@gfs.com" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const { lang, t, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "CredentialsSignin" ? t("login.error") : "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError(t("login.emailRequired")); return; }
    if (password.length < 6) { setError(t("login.passwordMin")); return; }

    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: `${window.location.origin}/expenses` });
  }

  function fillAccount(acct: { email: string }) {
    setEmail(acct.email);
    setPassword("123456");
    setError("");
  }

  const testLabels: Record<string, string> = {
    admin: "Admin (" + t("roles.admin") + ")",
    lee_dept_head: "lee (" + t("roles.dept_head") + ")",
    lichaba_manager: "lichaba (" + t("roles.manager") + ")",
    morongoe_finance: "morongoe (" + t("roles.finance") + ")",
    user_employee: "user (" + t("roles.employee") + ")",
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding */}
      <div className="relative hidden w-[480px] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-10 lg:flex">
        <div className="pointer-events-none absolute left-[-80px] top-[-80px] h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute left-[200px] top-[300px] h-48 w-48 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-60px] left-[100px] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-blue-500 shadow-lg shadow-indigo-500/25">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-widest text-indigo-300/80 uppercase">EXPENSE MANAGEMENT</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-white">
            {t("login.hero1")}
            <br />
            <span className="bg-gradient-to-r from-indigo-300 to-blue-400 bg-clip-text text-transparent">{t("login.hero2")}</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            {t("login.heroDesc1")}
            {" "}
            {t("login.heroDesc2")}
          </p>
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center gap-2">
            <img src="/Logo-GF_LS.jpg" alt="Logo" className="h-10 w-auto rounded opacity-80" />
            <div>
              <p className="text-xs font-medium text-slate-300">GOLDEN FORCE PTY LTD</p>
            </div>
          </div>

          <div className="flex gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              {t("login.feature1")}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              {t("login.feature2")}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              {t("login.feature3")}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="mb-8 text-center lg:hidden">
            <img src="/Logo-GF_LS.jpg" alt="Logo" className="mx-auto h-16 w-auto" />
            <h1 className="mt-3 text-xl font-bold text-slate-800">{t("app.title")}</h1>
          </div>

          {/* Language switcher for login page */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="rounded px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200 transition-colors"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{t("login.welcome")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("login.subtitle")}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-slate-200/50">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-600">{t("login.email")}</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                    placeholder={t("login.emailPlaceholder")}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-slate-600">{t("login.password")}</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                    placeholder={t("login.passwordPlaceholder")}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7 1.73-3.89 6-7 11-7s9.27 3.11 11 7c-.45 1.01-1.02 1.93-1.7 2.75M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("login.loggingIn")}
                  </span>
                ) : t("login.login")}
              </button>
            </form>
          </div>

          {/* Test accounts */}
          <div className="mt-5 rounded-xl border border-slate-200/60 bg-white/80 p-5 shadow-sm">
            <p className="mb-3 text-xs font-medium tracking-wide text-slate-400 uppercase">{t("login.testAccounts")}</p>
            <div className="flex flex-wrap gap-2">
              {TEST_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  onClick={() => fillAccount(acct)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {testLabels[acct.labelKey]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">{t("login.testPassword")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900 text-sm text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
