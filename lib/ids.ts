const AVATAR_COLORS = ["#6366F1", "#F59E0B", "#EC4899", "#14B8A6", "#8B5CF6", "#F97316", "#06B6D4", "#84CC16", "#FB7185", "#5B8DEF"];

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

export function avatarColorFor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length] ?? "#6366F1";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
