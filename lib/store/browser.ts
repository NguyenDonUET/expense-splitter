import type { Group } from "@/lib/domain";
import { sampleGroups } from "@/lib/sample";
import { GROUPS_STORAGE_KEY, type GroupStore } from "@/lib/store/types";

function read(storage: Storage): Group[] | null {
  const raw = storage.getItem(GROUPS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Group[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, groups: Group[]) {
  storage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

export function createBrowserStore(storage: Storage): GroupStore {
  return {
    async list() {
      const existing = read(storage);
      if (existing) return existing;
      const seeded = sampleGroups();
      write(storage, seeded);
      return seeded;
    },
    async get(id) {
      return (read(storage) ?? []).find((group) => group.id === id) ?? null;
    },
    async save(group) {
      const groups = read(storage) ?? [];
      const index = groups.findIndex((item) => item.id === group.id);
      if (index === -1) groups.push(group);
      else groups[index] = group;
      write(storage, groups);
    },
    async remove(id) {
      write(storage, (read(storage) ?? []).filter((group) => group.id !== id));
    },
    async reset() {
      write(storage, sampleGroups());
    },
  };
}
