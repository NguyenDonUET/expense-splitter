"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/locale";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <SessionProvider>{children}</SessionProvider>
    </I18nProvider>
  );
}
