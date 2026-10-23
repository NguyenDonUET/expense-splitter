"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { useT } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const onGroupList = pathname === "/groups";
  const t = useT();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-text-primary underline-offset-4 hover:underline">
          {t("nav.brand")}
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary">
            <Button asChild variant="ghost" aria-current={onGroupList ? "page" : undefined}>
              <Link href="/groups">{t("nav.groups")}</Link>
            </Button>
          </nav>
          <AccountMenu />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
