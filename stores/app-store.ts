"use client";

import { create } from "zustand";
import type { Group } from "@/lib/domain";
import type { ExpenseFilters } from "@/lib/reports";
import { EMPTY_FILTERS } from "@/lib/reports";
import { createBrowserStore } from "@/lib/store/browser";
import { httpStore } from "@/lib/store/http";
import { GUEST_COOKIE, IMPORT_FLAG, type GroupStore, type StoreMode } from "@/lib/store/types";

const VIEWING_KEY = "expense-splitter:viewing-as";

export type SheetState =
  | { kind: "closed" }
  | { kind: "expense"; groupId: string; expenseId?: string }
  | { kind: "settle"; groupId: string; fromId?: string; toId?: string }
  | { kind: "group"; groupId?: string }
  | { kind: "members"; groupId: string };

interface AppState {
  ready: boolean;
  mode: StoreMode;
  groups: Group[];
  viewingAs: Record<string, string>;
  sheet: SheetState;
  filters: ExpenseFilters;
  message: string | null;
  error: string | null;
  importOffer: boolean;
  hydrate: () => Promise<void>;
  setViewingAs: (groupId: string, memberId: string) => void;
  openSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  setFilters: (filters: ExpenseFilters) => void;
  commit: (group: Group, message: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  resetSamples: () => Promise<void>;
  dismissImport: () => void;
  setMessage: (message: string | null) => void;
}

let persistence: GroupStore | null = null;

function readViewing(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEWING_KEY) || "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeViewing(viewingAs: Record<string, string>) {
  localStorage.setItem(VIEWING_KEY, JSON.stringify(viewingAs));
}

export function viewerId(group: Group, viewingAs: Record<string, string>): string {
  const chosen = viewingAs[group.id];
  if (chosen && group.members.some((member) => member.id === chosen)) return chosen;
  return group.members[0]?.id ?? "";
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  mode: "session",
  groups: [],
  viewingAs: {},
  sheet: { kind: "closed" },
  filters: EMPTY_FILTERS,
  message: null,
  error: null,
  importOffer: false,

  async hydrate() {
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const session = (await sessionResponse.json()) as { user?: { id?: string } } | null;
      const guest = document.cookie.split("; ").some((item) => item.startsWith(`${GUEST_COOKIE}=1`));
      let mode: StoreMode = "session";
      if (session?.user?.id) {
        mode = "remote";
        persistence = httpStore;
      } else if (guest) {
        mode = "session";
        persistence = createBrowserStore(sessionStorage);
      } else {
        mode = "local";
        persistence = createBrowserStore(localStorage);
      }
      const groups = await persistence.list();
      set({
        ready: true,
        mode,
        groups,
        viewingAs: readViewing(),
        error: null,
        importOffer: mode === "remote" && sessionStorage.getItem(IMPORT_FLAG) === "1",
      });
    } catch (error) {
      set({
        ready: true,
        mode: "session",
        groups: [],
        error: error instanceof Error ? error.message : "errors.loadGroups",
      });
    }
  },

  setViewingAs(groupId, memberId) {
    const viewingAs = { ...get().viewingAs, [groupId]: memberId };
    writeViewing(viewingAs);
    set({ viewingAs });
  },

  openSheet(sheet) {
    set({ sheet, message: null });
  },

  closeSheet() {
    set({ sheet: { kind: "closed" } });
  },

  setFilters(filters) {
    set({ filters });
  },

  async commit(group, message) {
    if (!persistence) throw new Error("errors.notReady");
    const previous = get().groups;
    const groups = previous.some((item) => item.id === group.id)
      ? previous.map((item) => (item.id === group.id ? group : item))
      : [group, ...previous];
    set({ groups, error: null });
    try {
      await persistence.save(group);
      set({ message });
    } catch (error) {
      const text = error instanceof Error ? error.message : "errors.saveFailed";
      set({ groups: previous, error: text });
      throw new Error(text);
    }
  },

  async removeGroup(groupId) {
    if (!persistence) throw new Error("errors.notReady");
    const previous = get().groups;
    set({ groups: previous.filter((group) => group.id !== groupId), error: null, sheet: { kind: "closed" } });
    try {
      await persistence.remove(groupId);
      set({ message: "status.groupDeleted" });
    } catch (error) {
      const text = error instanceof Error ? error.message : "errors.deleteFailed";
      set({ groups: previous, error: text });
      throw new Error(text);
    }
  },

  async resetSamples() {
    if (!persistence) return;
    await persistence.reset();
    const groups = await persistence.list();
    set({ groups, message: "status.samplesRestored", sheet: { kind: "closed" } });
  },

  dismissImport() {
    sessionStorage.removeItem(IMPORT_FLAG);
    set({ importOffer: false });
  },

  setMessage(message) {
    set({ message });
  },
}));
