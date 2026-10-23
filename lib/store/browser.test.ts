import { beforeEach, describe, expect, it } from "vitest";
import { GROUPS_STORAGE_KEY } from "@/lib/store/types";
import { createBrowserStore } from "@/lib/store/browser";
import { sampleGroups } from "@/lib/sample";
import type { Group } from "@/lib/domain";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("local GroupStore", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("seeds sample groups on the first visit", async () => {
    const store = createBrowserStore(storage);
    const groups = await store.list();
    expect(groups.map((group) => group.id)).toEqual(sampleGroups().map((group) => group.id));
    expect(storage.getItem(GROUPS_STORAGE_KEY)).toBeTruthy();
  });

  it("keeps edits on later visits", async () => {
    const store = createBrowserStore(storage);
    const [first] = await store.list();
    await store.save({ ...first, name: "Renamed trip" });
    const later = createBrowserStore(storage);
    const saved = await later.get(first.id);
    expect(saved?.name).toBe("Renamed trip");
  });

  it("does not reseed after every group is deleted", async () => {
    const store = createBrowserStore(storage);
    for (const group of await store.list()) {
      await store.remove(group.id);
    }
    expect(await store.list()).toEqual([]);
  });

  it("reset restores the sample file", async () => {
    const store = createBrowserStore(storage);
    const extra: Group = {
      id: "grp_extra",
      name: "Extra",
      description: "",
      currency: "USD",
      createdAt: "2026-01-01T00:00:00Z",
      members: [],
      expenses: [],
      settlements: [],
    };
    await store.list();
    await store.save(extra);
    await store.reset();
    const restored = await store.list();
    expect(restored.some((group) => group.id === "grp_extra")).toBe(false);
    expect(restored.map((group) => group.id)).toEqual(sampleGroups().map((group) => group.id));
  });
});
