"use client";

import { Language } from "@irpc/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Hiligaynon copy is provisional until Moser reviews it.
const Context = createContext<{
  language: Language; setLanguage: (language: Language) => void;
  t: (english: string, hiligaynon: string) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>(Language.EN);
  useEffect(() => {
    const saved = localStorage.getItem("irpc.language");
    if (saved === Language.HIL || saved === Language.EN) update(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = language === Language.HIL ? "hil" : "en"; }, [language]);
  const setLanguage = (value: Language) => { update(value); localStorage.setItem("irpc.language", value); };
  return <Context.Provider value={{ language, setLanguage, t: (en, hil) => language === Language.HIL ? hil : en }}>{children}</Context.Provider>;
}

export function useLanguage() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return <label className="flex min-h-11 items-center gap-2 text-sm">
    <span className="sr-only">Language / Lengguwahe</span>
    <select className="min-h-11 max-w-full rounded-lg border border-line bg-white px-2 text-ink" value={language}
      onChange={event => setLanguage(event.target.value as Language)}>
      <option value={Language.EN}>English</option><option value={Language.HIL}>Hiligaynon</option>
    </select>
  </label>;
}
