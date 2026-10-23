"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const pathname = usePathname();
  const onGroupList = pathname === "/groups";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-text-primary underline-offset-4 hover:underline">
          Expense Splitter
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary">
            <Link
              href="/groups"
              aria-current={onGroupList ? "page" : undefined}
              className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline aria-[current=page]:text-text-primary"
            >
              Groups
            </Link>
          </nav>
          <AccountMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
