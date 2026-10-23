export function todayInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dateInputValue(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today keeps the current instant. Other days use local noon so the calendar day does not shift. */
export function dateToIso(day: string): string {
  const now = new Date();
  if (day === todayInput()) return now.toISOString();
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year ?? now.getFullYear(), (month ?? 1) - 1, date ?? 1, 12).toISOString();
}
