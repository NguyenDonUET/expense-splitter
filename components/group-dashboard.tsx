"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, Repeat } from "lucide-react";
import { activityFeed, formatFullDate, formatRelative } from "@/lib/activity";
import { computeBalances, memberBalance, paidByMember, shareForMember } from "@/lib/balances";
import { categoryColor, categoriesForGroup } from "@/lib/catalog";
import { downloadCsv, expensesToCsv } from "@/lib/csv";
import { deleteGroupBlockReason, memberName } from "@/lib/group-actions";
import { isDust } from "@/lib/money";
import { formatMoney } from "@/lib/money";
import { categoryBreakdown, filteredExpenses, memberSpending, monthRange } from "@/lib/reports";
import { confirmOccurrence, dueRecurrences, setRecurrencePaused } from "@/lib/recurring";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui";

export function GroupDashboard({ groupId }: { groupId: string }) {
  const group = useAppStore((state) => state.groups.find((item) => item.id === groupId));
  const ready = useAppStore((state) => state.ready);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const setViewingAs = useAppStore((state) => state.setViewingAs);
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const openSheet = useAppStore((state) => state.openSheet);
  const commit = useAppStore((state) => state.commit);
  const removeGroup = useAppStore((state) => state.removeGroup);
  const router = useRouter();
  const [activityCount, setActivityCount] = useState(8);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setFilters({ category: "all", memberId: "all", from: "", to: "" });
    setActivityCount(8);
  }, [groupId, setFilters]);

  useEffect(() => {
    if (group) document.title = `${group.name} · Expense Splitter`;
  }, [group]);

  if (!ready) {
    return (
      <main id="main" className="mx-auto grid max-w-content gap-4 px-4 py-8">
        <div className="h-28 animate-pulse rounded-lg bg-bg-tertiary" />
        <div className="h-16 animate-pulse rounded-lg bg-bg-tertiary" />
        <div className="h-40 animate-pulse rounded-lg bg-bg-tertiary" />
      </main>
    );
  }

  if (!group) {
    return (
      <main id="main" className="mx-auto max-w-content px-4 py-10">
        <h1 className="text-2xl font-bold">Group not found</h1>
        <p className="mt-2 text-text-secondary">It may have been deleted in this browser.</p>
        <Link href="/groups" className="mt-6 inline-flex min-h-11 items-center text-accent underline">
          Back to groups
        </Link>
      </main>
    );
  }

  const viewer = viewerId(group, viewingAs);
  const balances = computeBalances(group);
  const mine = memberBalance(group, viewer);
  const settled = isDust(mine.minor) && balances.pairs.length === 0;
  const expenses = filteredExpenses(group, filters);
  const breakdown = categoryBreakdown(group, expenses);
  const spending = memberSpending(group, expenses);
  const feed = activityFeed(group);
  const due = dueRecurrences(group);
  const myPairs = balances.pairs.filter((pair) => pair.fromId === viewer || pair.toId === viewer);
  const otherPairs = balances.pairs.filter((pair) => pair.fromId !== viewer && pair.toId !== viewer);
  const timeline = [
    ...expenses.map((expense) => ({ kind: "expense" as const, at: expense.date, expense })),
    ...group.settlements
      .filter((settlement) => {
        const day = settlement.date.slice(0, 10);
        if (filters.category !== "all") return false;
        if (filters.from && day < filters.from) return false;
        if (filters.to && day > filters.to) return false;
        if (filters.memberId !== "all" && settlement.from !== filters.memberId && settlement.to !== filters.memberId) return false;
        return true;
      })
      .map((settlement) => ({ kind: "settlement" as const, at: settlement.date, settlement })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const current = group;

  async function acceptDue(templateId: string, nextDate: string) {
    await commit(confirmOccurrence(current, templateId, nextDate), "Recurring expense added.");
  }

  return (
    <main id="main" className="mx-auto grid max-w-content gap-8 px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-text-secondary">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/groups" className="underline-offset-4 hover:underline">
              Groups
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{group.name}</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          {group.description ? <p className="mt-1 text-text-secondary">{group.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openSheet({ kind: "expense", groupId: group.id })} disabled={group.members.length === 0}>
            <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
            Add expense
          </Button>
          <Button variant="quiet" onClick={() => openSheet({ kind: "settle", groupId: group.id })}>
            Settle up
          </Button>
        </div>
      </header>

      <label className="grid max-w-xs gap-1 text-sm font-medium">
        Viewing as
        <select
          className="min-h-11 rounded-md border border-border bg-surface px-3"
          value={viewer}
          onChange={(event) => setViewingAs(group.id, event.target.value)}
        >
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <section aria-labelledby="balance-heading" className={`rounded-lg border p-5 ${settled ? "border-owed bg-owed-subtle" : mine.minor < 0 ? "border-owe bg-owe-subtle" : "border-border bg-surface"}`}>
        <h2 id="balance-heading" className="text-sm font-medium text-text-secondary">
          Your balance
        </h2>
        {isDust(mine.minor) ? (
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <Check aria-hidden="true" /> {balances.pairs.length === 0 ? "All settled up" : "You're settled"}
          </p>
        ) : (
          <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${mine.minor < 0 ? "text-owe" : "text-owed"}`}>
            {mine.minor < 0 ? "−" : "+"}
            {formatMoney(Math.abs(mine.amount), group.currency)}
            <span className="mt-1 block font-sans text-base font-medium text-text-primary">
              {mine.minor < 0 ? "You owe" : "You are owed"}
            </span>
          </p>
        )}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-text-secondary">Expenses</dt>
            <dd className="font-mono tabular-nums">{group.expenses.length}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Group spent</dt>
            <dd className="font-mono tabular-nums">{formatMoney(balances.totalSpent, group.currency)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">You paid</dt>
            <dd className="font-mono tabular-nums">{formatMoney(paidByMember(group, viewer), group.currency)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Your share</dt>
            <dd className="font-mono tabular-nums">{formatMoney(shareForMember(group, viewer), group.currency)}</dd>
          </div>
        </dl>
      </section>

      {due.length > 0 ? (
        <section aria-label="Recurring expenses due" className="grid gap-3">
          {due.map((item) => (
            <div key={item.template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
              <p>
                <Repeat aria-hidden="true" className="mr-2 inline" size={16} />
                {item.template.description} is due {formatRelative(item.nextDate)}.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => void acceptDue(item.template.id, item.nextDate)}>Add this one</Button>
                <Button variant="quiet" onClick={() => void commit(setRecurrencePaused(group, item.template.id, true), "Recurring expense paused.")}>
                  Pause
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="settle-heading">
        <h2 id="settle-heading" className="text-lg font-semibold">
          Settle up
        </h2>
        {balances.pairs.length === 0 ? (
          <p className="mt-2 text-text-secondary">Nothing to settle. The group is square.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {[...myPairs, ...otherPairs].map((pair) => {
              const mineDebt = pair.fromId === viewer;
              const text = mineDebt
                ? `You owe ${memberName(group, pair.toId)} ${formatMoney(pair.amount, group.currency)}`
                : pair.toId === viewer
                  ? `${memberName(group, pair.fromId)} owes you ${formatMoney(pair.amount, group.currency)}`
                  : `${memberName(group, pair.fromId)} owes ${memberName(group, pair.toId)} ${formatMoney(pair.amount, group.currency)}`;
              return (
                <li key={`${pair.fromId}-${pair.toId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                  <p>{text}</p>
                  <Button variant="quiet" onClick={() => openSheet({ kind: "settle", groupId: group.id, fromId: pair.fromId, toId: pair.toId })}>
                    Record payment
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="members-heading" className="text-lg font-semibold">
            Members
          </h2>
          <Button variant="ghost" onClick={() => openSheet({ kind: "members", groupId: group.id })}>
            Edit members
          </Button>
        </div>
        <ul className="mt-3 grid gap-2">
          {balances.members
            .filter((item) => group.members.some((member) => member.id === item.memberId))
            .map((item) => {
              const member = group.members.find((person) => person.id === item.memberId);
              if (!member) return null;
              const label = isDust(item.minor) ? "Settled" : item.minor > 0 ? `Is owed ${formatMoney(item.amount, group.currency)}` : `Owes ${formatMoney(Math.abs(item.amount), group.currency)}`;
              return (
                <li key={member.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={member.name} color={member.avatarColor} />
                    <span>{member.name}</span>
                  </span>
                  <span className={`font-mono text-sm tabular-nums ${item.minor > 0 ? "text-owed" : item.minor < 0 ? "text-owe" : "text-text-secondary"}`}>
                    {item.minor > 0 ? "+" : item.minor < 0 ? "−" : ""} {label}
                  </span>
                </li>
              );
            })}
        </ul>
        {group.members.length === 0 ? <p className="mt-2 text-text-secondary">Add the people who share this group, including anyone without an account.</p> : null}
      </section>

      <section aria-labelledby="filters-heading" className="grid gap-3">
        <h2 id="filters-heading" className="text-lg font-semibold">
          Expenses
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Category
            <select className="min-h-11 rounded-md border border-border bg-surface px-3" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="all">All categories</option>
              {categoriesForGroup(group.customCategories).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Person
            <select className="min-h-11 rounded-md border border-border bg-surface px-3" value={filters.memberId} onChange={(event) => setFilters({ ...filters, memberId: event.target.value })}>
              <option value="all">Anyone</option>
              {group.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            From
            <input type="date" className="min-h-11 rounded-md border border-border bg-surface px-3" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            To
            <input type="date" className="min-h-11 rounded-md border border-border bg-surface px-3" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={() => setFilters({ ...filters, ...monthRange("this") })}>
            This month
          </Button>
          <Button variant="quiet" onClick={() => setFilters({ ...filters, ...monthRange("last") })}>
            Last month
          </Button>
          <Button variant="ghost" onClick={() => setFilters({ category: "all", memberId: "all", from: "", to: "" })}>
            Clear filters
          </Button>
        </div>
      </section>

      {breakdown.rows.length > 0 ? (
        <section aria-labelledby="category-heading">
          <h2 id="category-heading" className="text-lg font-semibold">
            Spending by category
          </h2>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">{formatMoney(breakdown.total, group.currency)} in this view</p>
          <ul className="mt-3 grid gap-2">
            {breakdown.rows.map((row) => (
              <li key={row.category} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: categoryColor(row.category) }} />
                <span>{row.category}</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(row.amount, group.currency)} · {row.percent.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="report-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="report-heading" className="text-lg font-semibold">
            Spending summary
          </h2>
          <Button
            variant="quiet"
            onClick={() => downloadCsv(`${group.name.replaceAll(/\s+/g, "-").toLowerCase()}-expenses.csv`, expensesToCsv({ ...group, expenses }))}
          >
            Export CSV
          </Button>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <caption className="sr-only">What each member paid and their share for the current filters</caption>
          <thead>
            <tr className="text-text-secondary">
              <th className="py-2 font-medium">Member</th>
              <th className="py-2 font-medium">Paid</th>
              <th className="py-2 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {spending.map((row) => (
              <tr key={row.memberId} className="border-t border-border-subtle">
                <th scope="row" className="py-2 font-medium">
                  {memberName(group, row.memberId)}
                </th>
                <td className="py-2 font-mono tabular-nums">{formatMoney(row.paid, group.currency)}</td>
                <td className="py-2 font-mono tabular-nums">{formatMoney(row.share, group.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {timeline.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-text-secondary">
          No expenses yet. Add your first one.
        </p>
      ) : (
        <ul className="grid gap-2">
          {timeline.map((item) =>
            item.kind === "expense" ? (
              <li key={item.expense.id}>
                <button
                  type="button"
                  onClick={() => openSheet({ kind: "expense", groupId: group.id, expenseId: item.expense.id })}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border bg-surface px-3 py-3 text-left"
                >
                  <Avatar name={memberName(group, item.expense.paidBy)} color={group.members.find((member) => member.id === item.expense.paidBy)?.avatarColor ?? "#5b8def"} />
                  <span>
                    <span className="block font-medium">{item.expense.description}</span>
                    <span className="block text-sm text-text-secondary">
                      {memberName(group, item.expense.paidBy)} paid
                      {item.expense.splitType !== "equal" ? ` · ${item.expense.splitType}` : ""}
                      {item.expense.recurring ? " · repeats" : ""}
                      <span className="hidden sm:inline"> · {item.expense.category}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono font-semibold tabular-nums">{formatMoney(item.expense.amount, item.expense.currency)}</span>
                    {item.expense.currency !== group.currency ? (
                      <span className="block font-mono text-xs text-text-secondary tabular-nums">
                        {formatMoney(item.expense.amount * item.expense.exchangeRate, group.currency)}
                        {item.expense.exchangeRateIsUserSet ? " · your rate" : ""}
                      </span>
                    ) : null}
                    <time className="block text-xs text-text-tertiary" dateTime={item.expense.date} title={formatFullDate(item.expense.date)}>
                      {formatRelative(item.expense.date)}
                    </time>
                  </span>
                </button>
              </li>
            ) : (
              <li key={item.settlement.id} className="rounded-md border border-owed bg-owed-subtle px-3 py-3">
                <p className="text-sm font-medium">Settlement</p>
                <p>
                  {memberName(group, item.settlement.from)} paid {memberName(group, item.settlement.to)}{" "}
                  <span className="font-mono tabular-nums">{formatMoney(item.settlement.amount, item.settlement.currency)}</span>
                </p>
                <time className="text-xs text-text-secondary" dateTime={item.settlement.date} title={formatFullDate(item.settlement.date)}>
                  {formatRelative(item.settlement.date)}
                </time>
              </li>
            ),
          )}
        </ul>
      )}

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-lg font-semibold">
          Activity
        </h2>
        <ul className="mt-3 grid gap-2">
          {feed.slice(0, activityCount).map((item) => (
            <li key={item.id} className="text-sm">
              <span>{item.summary}</span>{" "}
              <time className="text-text-tertiary" dateTime={item.at} title={formatFullDate(item.at)}>
                {formatRelative(item.at)}
              </time>
            </li>
          ))}
        </ul>
        {feed.length > activityCount ? (
          <Button className="mt-3" variant="quiet" onClick={() => setActivityCount((count) => count + 20)}>
            Show more
          </Button>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="quiet" onClick={() => openSheet({ kind: "group", groupId: group.id })}>
          Edit group
        </Button>
        {!confirmDelete ? (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete group
          </Button>
        ) : (
          <div className="grid gap-2">
            <p>{deleteGroupBlockReason(group) ?? "Delete this group and its history?"}</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={Boolean(deleteGroupBlockReason(group))}
                onClick={() => {
                  if (deleteGroupBlockReason(group)) return;
                  router.push("/groups");
                  void removeGroup(group.id);
                }}
              >
                Delete group
              </Button>
              <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
