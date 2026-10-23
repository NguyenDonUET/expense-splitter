import type { ActivityEvent, Group } from "@/lib/domain";
import { memberName } from "@/lib/group-actions";

export interface FeedItem {
  id: string;
  at: string;
  summary: string;
  kind: ActivityEvent["kind"];
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
      summary: `${memberName(group, expense.paidBy)} added “${expense.description}”`,
    });
  }

  for (const settlement of group.settlements) {
    if (logged.has(`settlement.recorded:${settlement.id}`)) continue;
    synthetic.push({
      id: `syn_${settlement.id}`,
      at: settlement.date,
      kind: "settlement.recorded",
      summary: `${memberName(group, settlement.from)} paid ${memberName(group, settlement.to)}`,
    });
  }

  const fromLog: FeedItem[] = (group.activity ?? []).map((event) => ({
    id: event.id,
    at: event.at,
    kind: event.kind,
    summary: event.summary,
  }));

  return [...fromLog, ...synthetic].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function formatRelative(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 45) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso));
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(date);
}
