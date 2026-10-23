import type { Expense, Group, RecurringFrequency } from "@/lib/domain";
import { createId } from "@/lib/ids";

export function addFrequency(iso: string, frequency: RecurringFrequency): string {
  const date = new Date(iso);
  if (frequency === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCDate(date.getUTCDate() + (frequency === "weekly" ? 7 : 14));
  return date.toISOString();
}

export function recurringTemplates(group: Group): Expense[] {
  return group.expenses.filter((expense) => expense.recurring && !expense.recurringTemplateId);
}

export function latestOccurrence(group: Group, template: Expense): Expense {
  const copies = group.expenses.filter((expense) => expense.recurringTemplateId === template.id);
  return [template, ...copies].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? template;
}

export interface DueRecurrence {
  template: Expense;
  nextDate: string;
}

export function dueRecurrences(group: Group, now = new Date()): DueRecurrence[] {
  const due: DueRecurrence[] = [];
  for (const template of recurringTemplates(group)) {
    if (!template.recurring || template.recurrencePaused) continue;
    const latest = latestOccurrence(group, template);
    const nextDate = addFrequency(latest.date, template.recurring);
    if (new Date(nextDate).getTime() <= now.getTime()) due.push({ template, nextDate });
  }
  return due;
}

export function confirmOccurrence(group: Group, templateId: string, nextDate: string): Group {
  const template = group.expenses.find((expense) => expense.id === templateId);
  if (!template?.recurring) return group;
  const occurrence: Expense = {
    ...structuredClone(template),
    id: createId("exp"),
    date: nextDate,
    recurringTemplateId: template.id,
    recurrencePaused: undefined,
  };
  return { ...group, expenses: [occurrence, ...group.expenses] };
}

export function setRecurrencePaused(group: Group, templateId: string, paused: boolean): Group {
  return {
    ...group,
    expenses: group.expenses.map((expense) => (expense.id === templateId ? { ...expense, recurrencePaused: paused } : expense)),
  };
}
