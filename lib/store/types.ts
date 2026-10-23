import type { Group } from "@/lib/domain";

export interface GroupStore {
  list(): Promise<Group[]>;
  get(id: string): Promise<Group | null>;
  save(group: Group): Promise<void>;
  remove(id: string): Promise<void>;
  reset(): Promise<void>;
}

export type StoreMode = "local" | "session" | "remote";

export const GROUPS_STORAGE_KEY = "expense-splitter:groups";
export const IMPORT_FLAG = "expense-splitter:offer-import";
export const GUEST_COOKIE = "es_guest";
