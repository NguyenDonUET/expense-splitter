"use client";

import { useT } from "@/components/i18n-provider";

export function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
    >
      {t("nav.skip")}
    </a>
  );
}
