"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import { computeBalances, memberBalance } from "@/lib/balances";
import { formatMoney, isDust } from "@/lib/money";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupList({ currentId }: { currentId?: string }) {
  const t = useT();
  const groups = useAppStore((state) => state.groups);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const openSheet = useAppStore((state) => state.openSheet);

  return (
    <div className="grid gap-3">
      <Button type="button" variant="outline" className="justify-start border-dashed" onClick={() => openSheet({ kind: "group" })}>
        {t("groups.newGroup")}
      </Button>
      <ul className="grid gap-1">
        {groups.map((group) => {
          const viewer = viewerId(group, viewingAs);
          const balance = memberBalance(group, viewer);
          const totals = computeBalances(group);
          const active = group.id === currentId;
          const expenseLabel =
            group.expenses.length === 1
              ? t("groups.expenseOne", { count: group.expenses.length })
              : t("groups.expenseMany", { count: group.expenses.length });
          return (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                aria-current={active ? "page" : undefined}
                className={`grid gap-0.5 rounded-md px-3 py-2 underline-offset-4 hover:bg-bg-tertiary ${active ? "bg-bg-tertiary" : ""}`}
              >
                <span className="font-medium">{group.name}</span>
                <span className="text-xs text-text-secondary">
                  {expenseLabel} · {formatMoney(totals.totalSpent, group.currency)}
                </span>
                <span className={`font-mono text-xs tabular-nums ${balance.minor < 0 ? "text-owe" : balance.minor > 0 ? "text-owed" : "text-text-tertiary"}`}>
                  {isDust(balance.minor)
                    ? t("groups.settled")
                    : balance.minor < 0
                      ? t("groups.youOweAmount", { amount: formatMoney(Math.abs(balance.amount), group.currency) })
                      : t("groups.youAreOwedAmount", { amount: formatMoney(balance.amount, group.currency) })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GroupsHome() {
  const t = useT();
  const ready = useAppStore((state) => state.ready);
  const mode = useAppStore((state) => state.mode);
  const resetSamples = useAppStore((state) => state.resetSamples);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t("groups.title")}</h1>
      <p className="mt-2 text-text-secondary">{t("groups.pick")}</p>
      <div className="mt-6 lg:hidden">{mounted && ready ? <GroupList /> : <Skeleton className="h-40" />}</div>
      <p className="mt-6 hidden text-text-secondary lg:block">{t("groups.chooseSidebar")}</p>
      {mode !== "remote" ? (
        <Button type="button" variant="ghost" className="mt-6 lg:hidden" onClick={() => void resetSamples()}>
          {t("shell.restoreSamples")}
        </Button>
      ) : null}
    </main>
  );
}
