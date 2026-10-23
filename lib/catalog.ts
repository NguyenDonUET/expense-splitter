export const PREDEFINED_CATEGORIES = [
  "Food & Drink",
  "Transport",
  "Accommodation",
  "Housing",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Groceries",
  "Other",
] as const;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "VND", "CAD", "AUD", "CHF", "CNY", "INR", "MXN"] as const;

export function isSupportedCurrency(value: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Drink": "#5b8def",
  Transport: "#36d29a",
  Accommodation: "#e3b341",
  Housing: "#8b94a6",
  Entertainment: "#f2606a",
  Shopping: "#c084fc",
  Utilities: "#22d3ee",
  Groceries: "#84cc16",
  Other: "#788294",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#5b8def";
}

export function categoriesForGroup(custom: string[] | undefined): string[] {
  const extras = (custom ?? []).filter((category) => !(PREDEFINED_CATEGORIES as readonly string[]).includes(category));
  return [...PREDEFINED_CATEGORIES, ...extras];
}
