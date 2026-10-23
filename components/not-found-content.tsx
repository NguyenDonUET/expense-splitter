"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";

export function NotFoundContent() {
  const t = useT();
  return (
    <main id="main" className="mx-auto grid max-w-content gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t("notFound.title")}</h1>
      <p className="text-text-secondary">{t("notFound.body")}</p>
      <Link href="/" className="btn-accent inline-flex min-h-11 w-fit items-center rounded-md px-4 text-sm font-semibold">
        {t("notFound.home")}
      </Link>
    </main>
  );
}
