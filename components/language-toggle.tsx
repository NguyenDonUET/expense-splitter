"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocale(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label={t("nav.language")}>
          {locale === "vi" ? "VI" : "EN"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => choose("en")} aria-current={locale === "en" ? "true" : undefined}>
          {t("nav.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose("vi")} aria-current={locale === "vi" ? "true" : undefined}>
          {t("nav.vietnamese")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
