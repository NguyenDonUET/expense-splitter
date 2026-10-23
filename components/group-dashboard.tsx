"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, Repeat } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { activityFeed, formatActivityItem, formatFullDate, formatRelative } from "@/lib/activity";
import { computeBalances, memberBalance, paidByMember, shareForMember } from "@/lib/balances";
import { categoryColor, categoryIcon, categoriesForGroup } from "@/lib/catalog";
import { downloadCsv, expensesToCsv } from "@/lib/csv";
import { deleteGroupBlockReason, memberName } from "@/lib/group-actions";
import { translateCategory } from "@/lib/i18n/t";
import { formatMoney, isDust, toMinor } from "@/lib/money";
import { categoryBreakdown, filteredExpenses, memberSpending, monthRange } from "@/lib/reports";
import { confirmOccurrence, dueRecurrences, nextOccurrenceDate, recurringTemplates, setRecurrencePaused } from "@/lib/recurring";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Avatar } from "@/components/avatar";
import { AppSelect } from "@/components/ui/app-select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupDashboard({ groupId }: { groupId: string }) {
  const { t, locale } = useI18n();
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
    if (group) document.title = t("meta.groupTitle", { name: group.name });
  }, [group, t]);

  if (!ready) {
    return (
      <main id="main" className="mx-auto grid max-w-content gap-4 px-4 py-8">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </main>
    );
  }

  if (!group) {
    return (
      <main id="main" className="mx-auto max-w-content px-4 py-10">
        <h1 className="text-2xl font-bold">{t("groups.missingTitle")}</h1>
        <p className="mt-2 text-text-secondary">{t("groups.missingBody")}</p>
        <Link href="/groups" className="mt-6 inline-flex min-h-11 items-center text-accent underline">
          {t("groups.back")}
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
  const series = recurringTemplates(group);
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
    await commit(confirmOccurrence(current, templateId, nextDate, viewer), "status.recurringAdded");
  }

  return (
    <main id="main" className="mx-auto grid max-w-content gap-8 px-4 py-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/groups">{t("nav.groups")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{group.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          {group.description ? <p className="mt-1 text-text-secondary">{group.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openSheet({ kind: "expense", groupId: group.id })} disabled={group.members.length === 0}>
            <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
            {t("dashboard.addExpense")}
          </Button>
          <Button variant="outline" onClick={() => openSheet({ kind: "settle", groupId: group.id })}>
            {t("dashboard.settleUp")}
          </Button>
        </div>
      </header>

      <label className="grid max-w-xs gap-1 text-sm font-medium">
        {t("dashboard.viewingAs")}
        <AppSelect
          value={viewer}
          onValueChange={(value) => setViewingAs(group.id, value)}
          items={group.members.map((member) => ({ value: member.id, label: member.name }))}
        />
      </label>

      <section aria-labelledby="balance-heading" className={`rounded-lg border p-5 ${settled ? "border-owed bg-owed-subtle" : mine.minor < 0 ? "border-owe bg-owe-subtle" : "border-border bg-surface"}`}>
        <h2 id="balance-heading" className="text-sm font-medium text-text-secondary">
          {t("dashboard.yourBalance")}
        </h2>
        {isDust(mine.minor) ? (
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <Check aria-hidden="true" /> {balances.pairs.length === 0 ? t("dashboard.allSettled") : t("dashboard.youreSettled")}
          </p>
        ) : (
          <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${mine.minor < 0 ? "text-owe" : "text-owed"}`}>
            {mine.minor < 0 ? "−" : "+"}
            {formatMoney(Math.abs(mine.amount), group.currency)}
            <span className="mt-1 block font-sans text-base font-medium text-text-primary">
              {mine.minor < 0 ? t("dashboard.youOwe") : t("dashboard.youAreOwed")}
            </span>
          </p>
        )}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-text-secondary">{t("dashboard.expenses")}</dt>
            <dd className="font-mono tabular-nums">{group.expenses.length}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t("dashboard.groupSpent")}</dt>
            <dd className="font-mono tabular-nums">{formatMoney(balances.totalSpent, group.currency)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t("dashboard.youPaid")}</dt>
            <dd className="font-mono tabular-nums">{formatMoney(paidByMember(group, viewer), group.currency)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t("dashboard.yourShare")}</dt>
            <dd className="font-mono tabular-nums">{formatMoney(shareForMember(group, viewer), group.currency)}</dd>
          </div>
        </dl>
      </section>

      {due.length > 0 ? (
        <section aria-label={t("dashboard.recurringDue")} className="grid gap-3">
          {due.map((item) => (
            <div key={item.template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
              <p>
                <Repeat aria-hidden="true" className="mr-2 inline" size={16} />
                {t("dashboard.isDue", { description: item.template.description, when: formatRelative(item.nextDate, locale) })}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => void acceptDue(item.template.id, item.nextDate)}>{t("dashboard.addThisOne")}</Button>
                <Button variant="outline" onClick={() => void commit(setRecurrencePaused(group, item.template.id, true), "status.recurringPaused")}>
                  {t("dashboard.pause")}
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {series.length > 0 ? (
        <section aria-labelledby="recurring-heading">
          <h2 id="recurring-heading" className="text-lg font-semibold">
            {t("dashboard.recurring")}
          </h2>
          <ul className="mt-3 grid gap-2">
            {series.map((template) => {
              const next = nextOccurrenceDate(group, template);
              const frequency = template.recurring ? t(`expense.${template.recurring}`) : "";
              return (
                <li key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-3">
                  <div>
                    <p className="font-medium">
                      <Repeat aria-hidden="true" className="mr-2 inline" size={16} />
                      {template.description}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {frequency}
                      {template.recurrencePaused ? ` · ${t("dashboard.paused")}` : next ? ` · ${t("dashboard.nextOn", { when: formatRelative(next, locale) })}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openSheet({ kind: "expense", groupId: group.id, expenseId: template.id })}>
                      {t("dashboard.editSeries")}
                    </Button>
                    {template.recurrencePaused ? (
                      <Button variant="outline" onClick={() => void commit(setRecurrencePaused(group, template.id, false), "status.recurringResumed")}>
                        {t("dashboard.resume")}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => void commit(setRecurrencePaused(group, template.id, true), "status.recurringPaused")}>
                        {t("dashboard.pause")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="settle-heading">
        <h2 id="settle-heading" className="text-lg font-semibold">
          {t("dashboard.settleUp")}
        </h2>
        {balances.pairs.length === 0 ? (
          <p className="mt-2 text-text-secondary">{t("dashboard.nothingToSettle")}</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {[...myPairs, ...otherPairs].map((pair) => {
              const mineDebt = pair.fromId === viewer;
              const text = mineDebt
                ? t("dashboard.youOwePerson", { name: memberName(group, pair.toId), amount: formatMoney(pair.amount, group.currency) })
                : pair.toId === viewer
                  ? t("dashboard.personOwesYou", { name: memberName(group, pair.fromId), amount: formatMoney(pair.amount, group.currency) })
                  : t("dashboard.personOwesPerson", {
                      from: memberName(group, pair.fromId),
                      to: memberName(group, pair.toId),
                      amount: formatMoney(pair.amount, group.currency),
                    });
              return (
                <li key={`${pair.fromId}-${pair.toId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                  <p>{text}</p>
                  <Button variant="outline" onClick={() => openSheet({ kind: "settle", groupId: group.id, fromId: pair.fromId, toId: pair.toId })}>
                    {t("dashboard.recordPayment")}
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
            {t("dashboard.members")}
          </h2>
          <Button variant="ghost" onClick={() => openSheet({ kind: "members", groupId: group.id })}>
            {t("dashboard.editMembers")}
          </Button>
        </div>
        <ul className="mt-3 grid gap-2">
          {balances.members
            .filter((item) => group.members.some((member) => member.id === item.memberId))
            .map((item) => {
              const member = group.members.find((person) => person.id === item.memberId);
              if (!member) return null;
              const label = isDust(item.minor)
                ? t("groups.settled")
                : item.minor > 0
                  ? t("dashboard.isOwed", { amount: formatMoney(item.amount, group.currency) })
                  : t("dashboard.owes", { amount: formatMoney(Math.abs(item.amount), group.currency) });
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
        {group.members.length === 0 ? <p className="mt-2 text-text-secondary">{t("dashboard.addPeople")}</p> : null}
      </section>

      <section aria-labelledby="filters-heading" className="grid gap-3">
        <h2 id="filters-heading" className="text-lg font-semibold">
          {t("dashboard.expenses")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            {t("dashboard.category")}
            <AppSelect
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
              items={[
                { value: "all", label: t("dashboard.allCategories") },
                ...categoriesForGroup(group.customCategories).map((category) => ({ value: category, label: translateCategory(t, category) })),
              ]}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t("dashboard.person")}
            <AppSelect
              value={filters.memberId}
              onValueChange={(value) => setFilters({ ...filters, memberId: value })}
              items={[{ value: "all", label: t("dashboard.anyone") }, ...group.members.map((member) => ({ value: member.id, label: member.name }))]}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t("dashboard.from")}
            <Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t("dashboard.to")}
            <Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setFilters({ ...filters, ...monthRange("this") })}>
            {t("dashboard.thisMonth")}
          </Button>
          <Button variant="outline" onClick={() => setFilters({ ...filters, ...monthRange("last") })}>
            {t("dashboard.lastMonth")}
          </Button>
          <Button variant="ghost" onClick={() => setFilters({ category: "all", memberId: "all", from: "", to: "" })}>
            {t("dashboard.clearFilters")}
          </Button>
        </div>
      </section>

      {breakdown.rows.length > 0 ? (
        <section aria-labelledby="category-heading">
          <h2 id="category-heading" className="text-lg font-semibold">
            {t("dashboard.spendingByCategory")}
          </h2>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">{t("dashboard.inThisView", { amount: formatMoney(breakdown.total, group.currency) })}</p>
          <ul className="mt-3 grid gap-3">
            {breakdown.rows.map((row) => {
              const Icon = categoryIcon(row.category);
              return (
                <li key={row.category} className="grid gap-1.5">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                    <span className="inline-flex size-8 items-center justify-center rounded-full" style={{ background: `${categoryColor(row.category)}22`, color: categoryColor(row.category) }}>
                      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
                    </span>
                    <span>{translateCategory(t, row.category)}</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(row.amount, group.currency)} · {row.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${row.percent}%`, background: categoryColor(row.category) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="report-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="report-heading" className="text-lg font-semibold">
            {t("dashboard.spendingSummary")}
          </h2>
          <Button
            variant="outline"
            onClick={() => downloadCsv(`${group.name.replaceAll(/\s+/g, "-").toLowerCase()}-expenses.csv`, expensesToCsv({ ...group, expenses }, t))}
          >
            {t("dashboard.exportCsv")}
          </Button>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <caption className="sr-only">{t("dashboard.summaryCaption")}</caption>
          <thead>
            <tr className="text-text-secondary">
              <th className="py-2 font-medium">{t("dashboard.member")}</th>
              <th className="py-2 font-medium">{t("dashboard.paid")}</th>
              <th className="py-2 font-medium">{t("dashboard.share")}</th>
              <th className="py-2 font-medium">{t("dashboard.vsShare")}</th>
            </tr>
          </thead>
          <tbody>
            {spending.map((row) => {
              const netMinor = toMinor(row.net, group.currency);
              const even = isDust(netMinor);
              const comparison = even
                ? t("dashboard.paidEven")
                : netMinor > 0
                  ? t("dashboard.paidMore", { amount: formatMoney(row.net, group.currency) })
                  : t("dashboard.paidLess", { amount: formatMoney(Math.abs(row.net), group.currency) });
              return (
                <tr key={row.memberId} className="border-t border-border-subtle">
                  <th scope="row" className="py-2 font-medium">
                    {memberName(group, row.memberId)}
                  </th>
                  <td className="py-2 font-mono tabular-nums">{formatMoney(row.paid, group.currency)}</td>
                  <td className="py-2 font-mono tabular-nums">{formatMoney(row.share, group.currency)}</td>
                  <td className={`py-2 text-sm ${even ? "text-text-secondary" : netMinor > 0 ? "text-owed" : "text-owe"}`}>{comparison}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {timeline.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-text-secondary">{t("dashboard.noExpenses")}</p>
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
                    <span className="block font-medium">
                      {item.expense.recurring || item.expense.recurringTemplateId ? (
                        <Repeat aria-hidden="true" className="mr-1.5 inline align-text-bottom" size={14} />
                      ) : null}
                      {item.expense.description}
                    </span>
                    <span className="block text-sm text-text-secondary">
                      {t("dashboard.paidLabel", { name: memberName(group, item.expense.paidBy) })}
                      {item.expense.splitType !== "equal" ? ` · ${t(`split.${item.expense.splitType}`)}` : ""}
                      {item.expense.recurring || item.expense.recurringTemplateId ? ` · ${t("dashboard.repeats")}` : ""}
                      <span className="hidden sm:inline">
                        {" "}
                        · {translateCategory(t, item.expense.category)}
                      </span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono font-semibold tabular-nums">{formatMoney(item.expense.amount, item.expense.currency)}</span>
                    {item.expense.currency !== group.currency ? (
                      <span className="block font-mono text-xs text-text-secondary tabular-nums">
                        {formatMoney(item.expense.amount * item.expense.exchangeRate, group.currency)}
                        {item.expense.exchangeRateIsUserSet ? ` · ${t("dashboard.yourRate")}` : ""}
                      </span>
                    ) : null}
                    <time className="block text-xs text-text-tertiary" dateTime={item.expense.date} title={formatFullDate(item.expense.date, locale)}>
                      {formatRelative(item.expense.date, locale)}
                    </time>
                  </span>
                </button>
              </li>
            ) : (
              <li key={item.settlement.id} className="rounded-md border border-owed bg-owed-subtle px-3 py-3">
                <p className="text-sm font-medium">{t("dashboard.settlement")}</p>
                <p>
                  {t("dashboard.paidTo", { from: memberName(group, item.settlement.from), to: memberName(group, item.settlement.to) })}{" "}
                  <span className="font-mono tabular-nums">{formatMoney(item.settlement.amount, item.settlement.currency)}</span>
                </p>
                <time className="text-xs text-text-secondary" dateTime={item.settlement.date} title={formatFullDate(item.settlement.date, locale)}>
                  {formatRelative(item.settlement.date, locale)}
                </time>
              </li>
            ),
          )}
        </ul>
      )}

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-lg font-semibold">
          {t("dashboard.activity")}
        </h2>
        {feed.length === 0 ? (
          <p className="mt-2 text-text-secondary">{t("dashboard.noActivity")}</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {feed.slice(0, activityCount).map((item) => {
              const settlement = item.kind === "settlement.recorded";
              const member = item.kind === "member.added" || item.kind === "member.removed";
              return (
                <li
                  key={item.id}
                  className={`rounded-md border-l-4 px-3 py-2 text-sm ${
                    settlement ? "border-owed bg-owed-subtle" : member ? "border-border bg-bg-secondary" : "border-accent bg-surface"
                  }`}
                >
                  <span>{formatActivityItem(group, item, t)}</span>{" "}
                  <time className="text-text-tertiary" dateTime={item.at} title={formatFullDate(item.at, locale)}>
                    {formatRelative(item.at, locale)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
        {feed.length > activityCount ? (
          <Button className="mt-3" variant="outline" onClick={() => setActivityCount((count) => count + 20)}>
            {t("dashboard.showMore")}
          </Button>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={() => openSheet({ kind: "group", groupId: group.id })}>
          {t("dashboard.editGroup")}
        </Button>
        {!confirmDelete ? (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            {t("dashboard.deleteGroup")}
          </Button>
        ) : (
          <div className="grid gap-2">
            <p>{deleteGroupBlockReason(group) ? t(deleteGroupBlockReason(group) as string) : t("dashboard.confirmDeleteGroup")}</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={Boolean(deleteGroupBlockReason(group))}
                onClick={() => {
                  if (deleteGroupBlockReason(group)) return;
                  router.push("/groups");
                  void removeGroup(group.id);
                }}
              >
                {t("dashboard.deleteGroup")}
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                {t("dashboard.cancel")}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
