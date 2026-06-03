"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import dict, { type Lang, t as translate, ta as translateArray } from "./dictionaries";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

type I18nCtx = {
  lang: Lang;
  t: (path: string) => string;
  ta: (path: string) => string[];
  setLang: (lang: Lang) => void;
};

const Ctx = createContext<I18nCtx>({ lang: "en", t: (p) => p, ta: () => [], setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = getCookie("lang");
    if (saved === "en" || saved === "zh") {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCookie("lang", l);
  }, []);

  const t = useCallback((path: string) => translate(lang, path), [lang]);
  const ta = useCallback((path: string) => translateArray(lang, path), [lang]);

  return <Ctx.Provider value={{ lang, t, ta, setLang }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
