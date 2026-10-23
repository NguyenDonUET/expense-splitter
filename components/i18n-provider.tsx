"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localeCookieValue, type Locale } from "@/lib/i18n/locale";
import { catalogs, t, type Messages, type Translate } from "@/lib/i18n/t";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: Translate;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const messages = catalogs[locale];

  const translate = useCallback<Translate>((key, vars) => t(messages, key, vars), [messages]);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = localeCookieValue(next);
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, messages, t: translate, setLocale }),
    [locale, messages, setLocale, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

export function useT(): Translate {
  return useI18n().t;
}
