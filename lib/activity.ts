import type { ActivityEvent, Group } from "@/lib/domain";
import { memberName } from "@/lib/group-actions";
import type { Locale } from "@/lib/i18n/locale";
import { intlLocale } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/t";

export interface FeedItem {
  id: string;
  at: string;
  summary: string;
  kind: ActivityEvent["kind"];
  expenseId?: string;
  settlementId?: string;
  memberId?: string;
  actorId?: string;
  label?: string;
}

/** Stored activity, plus synthetic entries for sample records that predate the log. */
export function activityFeed(group: Group): FeedItem[] {
  const logged = new Set(
    (group.activity ?? []).map((event) => `${event.kind}:${event.expenseId ?? event.settlementId ?? event.memberId ?? ""}`),
  );
  const synthetic: FeedItem[] = [];

  for (const expense of group.expenses) {
    if (logged.has(`expense.added:${expense.id}`) || logged.has(`expense.edited:${expense.id}`)) continue;
    synthetic.push({
      id: `syn_${expense.id}`,
      at: expense.date,
      kind: "expense.added",
      expenseId: expense.id,
      actorId: expense.paidBy,
      label: expense.description,
      summary: `${memberName(group, expense.paidBy)} added “${expense.description}”`,
    });
  }

  for (const settlement of group.settlements) {
    if (logged.has(`settlement.recorded:${settlement.id}`)) continue;
    synthetic.push({
      id: `syn_${settlement.id}`,
      at: settlement.date,
      kind: "settlement.recorded",
      settlementId: settlement.id,
      summary: `${memberName(group, settlement.from)} paid ${memberName(group, settlement.to)}`,
    });
  }

  const fromLog: FeedItem[] = (group.activity ?? []).map((event) => ({
    id: event.id,
    at: event.at,
    kind: event.kind,
    summary: event.summary,
    expenseId: event.expenseId,
    settlementId: event.settlementId,
    memberId: event.memberId,
    actorId: event.actorId,
    label: event.label,
  }));

  return [...fromLog, ...synthetic].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function formatActivityItem(group: Group, item: FeedItem, translate: Translate): string {
  const someone = translate("common.someone");
  const actor = memberName(group, item.actorId, someone);
  if (item.kind === "expense.added" || item.kind === "expense.edited" || item.kind === "expense.deleted") {
    const expense = group.expenses.find((entry) => entry.id === item.expenseId);
    const description = expense?.description ?? item.label;
    if (!description) return item.summary;
    const key =
      item.kind === "expense.added" ? "activity.expenseAdded" : item.kind === "expense.edited" ? "activity.expenseEdited" : "activity.expenseDeleted";
    return translate(key, { name: actor, description });
  }
  if (item.kind === "settlement.recorded") {
    const settlement = group.settlements.find((entry) => entry.id === item.settlementId);
    if (!settlement) return item.summary;
    return translate("activity.settlementRecorded", {
      from: memberName(group, settlement.from, someone),
      to: memberName(group, settlement.to, someone),
    });
  }
  if (item.kind === "member.added" || item.kind === "member.removed") {
    const member = group.members.find((entry) => entry.id === item.memberId);
    const name = member?.name ?? item.label;
    if (!name) return item.summary;
    const key = item.kind === "member.added" ? "activity.memberAdded" : "activity.memberRemoved";
    return translate(key, { name, group: group.name });
  }
  return item.summary;
}

export function formatRelative(iso: string, locale: Locale = "en", now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);
  const tag = intlLocale(locale);
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  if (abs < 45) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(iso));
}

export function formatFullDate(iso: string, locale: Locale = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "full", timeStyle: "short" }).format(date);
}
