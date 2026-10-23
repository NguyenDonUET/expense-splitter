import type { Group } from "@/lib/domain";
import { memberName } from "@/lib/group-actions";

function cell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function expensesToCsv(group: Group): string {
  const headers = [
    "date",
    "description",
    "amount",
    "currency",
    "category",
    "paid by",
    "split type",
    ...group.members.map((member) => `${member.name} share`),
  ];
  const rows = [...group.expenses]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((expense) =>
      [
        expense.date.slice(0, 10),
        expense.description,
        expense.amount,
        expense.currency,
        expense.category,
        memberName(group, expense.paidBy),
        expense.splitType,
        ...group.members.map((member) => expense.splits.find((split) => split.memberId === member.id)?.amount ?? ""),
      ].map(cell),
    );
  return [headers.map(cell).join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
