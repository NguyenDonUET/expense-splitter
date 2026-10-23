"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ExpenseSheet } from "@/components/expense-sheet";
import { GroupSheet, MembersSheet } from "@/components/group-sheet";
import { GroupList } from "@/components/groups-home";
import { SettleSheet } from "@/components/settle-sheet";
import { Button } from "@/components/ui";
import { IMPORT_FLAG } from "@/lib/store/types";
import { useAppStore } from "@/stores/app-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAppStore((state) => state.hydrate);
  const ready = useAppStore((state) => state.ready);
  const sheet = useAppStore((state) => state.sheet);
  const groups = useAppStore((state) => state.groups);
  const closeSheet = useAppStore((state) => state.closeSheet);
  const openSheet = useAppStore((state) => state.openSheet);
  const message = useAppStore((state) => state.message);
  const error = useAppStore((state) => state.error);
  const mode = useAppStore((state) => state.mode);
  const importOffer = useAppStore((state) => state.importOffer);
  const dismissImport = useAppStore((state) => state.dismissImport);
  const resetSamples = useAppStore((state) => state.resetSamples);
  const dialogRef = useRef<HTMLDivElement>(null);
  const groupId = pathname.split("/")[2];
  const activeGroup = groups.find((group) => group.id === (sheet.kind === "closed" ? groupId : sheet.groupId ?? groupId));
  const sheetGroup = groups.find((group) => sheet.kind !== "closed" && sheet.kind !== "group" && group.id === sheet.groupId);
  const editingGroup = sheet.kind === "group" && sheet.groupId ? groups.find((group) => group.id === sheet.groupId) : undefined;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "n" && !typing && activeGroup) {
        openSheet({ kind: "expense", groupId: activeGroup.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGroup, openSheet]);

  useEffect(() => {
    if (sheet.kind === "closed" || !dialogRef.current) return;
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])")];
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSheet();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [sheet, closeSheet]);

  const title =
    sheet.kind === "expense" ? (sheet.expenseId ? "Edit expense" : "Add expense") : sheet.kind === "settle" ? "Record a payment" : sheet.kind === "members" ? "Members" : sheet.kind === "group" ? (sheet.groupId ? "Edit group" : "New group") : "";

  async function copyGuestData() {
    const raw = sessionStorage.getItem("expense-splitter:groups");
    const groupsToCopy = raw ? JSON.parse(raw) : [];
    const response = await fetch("/api/groups/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groups: groupsToCopy }),
    });
    if (!response.ok) return;
    sessionStorage.removeItem(IMPORT_FLAG);
    dismissImport();
    await hydrate();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-page">
      <aside className="hidden w-sidebar shrink-0 border-r border-border px-3 py-4 lg:block">
        <nav aria-label="Groups">{ready ? <GroupList currentId={groupId} /> : <p className="text-sm text-text-secondary">Loading groups...</p>}</nav>
        {mode !== "remote" ? (
          <button type="button" className="mt-6 text-sm text-text-secondary underline-offset-4 hover:underline" onClick={() => void resetSamples()}>
            Restore sample groups
          </button>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1">
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {importOffer ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent-subtle px-4 py-3 text-sm">
              <p>Copy the groups from this browser session into your account?</p>
              <div className="flex gap-2">
                <Button onClick={() => void copyGuestData()}>Copy groups</Button>
                <Button variant="quiet" onClick={dismissImport}>
                  Not now
                </Button>
              </div>
            </div>
          ) : null}
          {error ? <p className="px-4 pt-4 text-sm text-error">{error}</p> : null}
          {children}
          <div aria-live="polite" className="sr-only">
            {message}
          </div>
        </div>
        {sheet.kind !== "closed" ? (
          <div className="fixed inset-0 z-40 xl:static xl:z-auto xl:w-[22rem] xl:shrink-0">
            <button type="button" tabIndex={-1} className="absolute inset-0 bg-[#0A0D13]/50 xl:hidden" aria-label="Close dialog" onClick={closeSheet} />
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sheet-title"
              className="absolute inset-y-0 right-0 w-full overflow-auto bg-surface p-4 shadow-lg xl:static xl:h-full xl:border-l xl:border-border xl:shadow-none"
            >
              <h2 id="sheet-title" className="text-lg font-semibold">
                {title}
              </h2>
              <div className="mt-4">
                {sheet.kind === "group" ? <GroupSheet group={editingGroup} /> : null}
                {sheet.kind === "expense" && sheetGroup ? <ExpenseSheet key={sheet.expenseId ?? "new"} group={sheetGroup} /> : null}
                {sheet.kind === "settle" && sheetGroup ? <SettleSheet key={`${sheet.fromId}-${sheet.toId}`} group={sheetGroup} /> : null}
                {sheet.kind === "members" && sheetGroup ? <MembersSheet group={sheetGroup} /> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden">
        <button type="button" className="min-h-14 flex-1 text-sm font-medium" onClick={() => router.push("/groups")}>
          Groups
        </button>
        <button
          type="button"
          className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 text-sm font-semibold"
          disabled={!activeGroup}
          onClick={() => activeGroup && openSheet({ kind: "expense", groupId: activeGroup.id })}
        >
          <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
          Add
        </button>
        <button
          type="button"
          className="min-h-14 flex-1 text-sm font-medium"
          disabled={!activeGroup}
          onClick={() => activeGroup && openSheet({ kind: "settle", groupId: activeGroup.id })}
        >
          Settle
        </button>
      </nav>
    </div>
  );
}
