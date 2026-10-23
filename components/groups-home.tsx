"use client";

import Link from "next/link";
import { computeBalances, memberBalance } from "@/lib/balances";
import { formatMoney, isDust } from "@/lib/money";
import { useAppStore, viewerId } from "@/stores/app-store";

export function GroupList({ currentId }: { currentId?: string }) {
  const groups = useAppStore((state) => state.groups);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const openSheet = useAppStore((state) => state.openSheet);

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => openSheet({ kind: "group" })}
        className="min-h-11 rounded-md border border-dashed border-border px-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        New group
      </button>
      <ul className="grid gap-1">
        {groups.map((group) => {
          const viewer = viewerId(group, viewingAs);
          const balance = memberBalance(group, viewer);
          const totals = computeBalances(group);
          const active = group.id === currentId;
          const expenseLabel = `${group.expenses.length} ${group.expenses.length === 1 ? "expense" : "expenses"}`;
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
                    ? "Settled"
                    : balance.minor < 0
                      ? `You owe ${formatMoney(Math.abs(balance.amount), group.currency)}`
                      : `You are owed ${formatMoney(balance.amount, group.currency)}`}
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
  const ready = useAppStore((state) => state.ready);
  const mode = useAppStore((state) => state.mode);
  const resetSamples = useAppStore((state) => state.resetSamples);
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:py-16">
      <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
      <p className="mt-2 text-text-secondary">Pick a group to see who owes whom.</p>
      <div className="mt-6 lg:hidden">{ready ? <GroupList /> : <p>Loading groups...</p>}</div>
      <p className="mt-6 hidden text-text-secondary lg:block">Choose a group from the sidebar.</p>
      {mode !== "remote" ? (
        <button type="button" className="mt-6 text-sm text-text-secondary underline-offset-4 hover:underline lg:hidden" onClick={() => void resetSamples()}>
          Restore sample groups
        </button>
      ) : null}
    </main>
  );
}
