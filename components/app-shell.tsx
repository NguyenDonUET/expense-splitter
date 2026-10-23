"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ExpenseSheet } from "@/components/expense-sheet";
import { GroupSheet, MembersSheet } from "@/components/group-sheet";
import { GroupList } from "@/components/groups-home";
import { useT } from "@/components/i18n-provider";
import { SettleSheet } from "@/components/settle-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatError, formatStatus } from "@/lib/i18n/format-error";
import { IMPORT_FLAG } from "@/lib/store/types";
import { useAppStore } from "@/stores/app-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
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
  const [wide, setWide] = useState(false);
  const [mounted, setMounted] = useState(false);
  const groupId = pathname.split("/")[2];
  const activeGroup = groups.find((group) => group.id === (sheet.kind === "closed" ? groupId : sheet.groupId ?? groupId));
  const sheetGroup = groups.find((group) => sheet.kind !== "closed" && sheet.kind !== "group" && group.id === sheet.groupId);
  const editingGroup = sheet.kind === "group" && sheet.groupId ? groups.find((group) => group.id === sheet.groupId) : undefined;

  useEffect(() => {
    setMounted(true);
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const sync = () => setWide(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
    if (sheet.kind === "closed" || !wide || !dialogRef.current) return;
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
    sheet.kind === "expense"
      ? sheet.expenseId
        ? t("shell.editExpense")
        : t("shell.addExpense")
      : sheet.kind === "settle"
        ? t("shell.recordPayment")
        : sheet.kind === "members"
          ? t("shell.members")
          : sheet.kind === "group"
            ? sheet.groupId
              ? t("shell.editGroup")
              : t("shell.newGroup")
            : "";

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

  const sheetForm = (
    <>
      {sheet.kind === "group" ? <GroupSheet group={editingGroup} /> : null}
      {sheet.kind === "expense" && sheetGroup ? <ExpenseSheet key={sheet.expenseId ?? "new"} group={sheetGroup} /> : null}
      {sheet.kind === "settle" && sheetGroup ? <SettleSheet key={`${sheet.fromId}-${sheet.toId}`} group={sheetGroup} /> : null}
      {sheet.kind === "members" && sheetGroup ? <MembersSheet group={sheetGroup} /> : null}
    </>
  );

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-page">
      <aside className="hidden w-sidebar shrink-0 border-r border-border px-3 py-4 lg:block">
        <nav aria-label={t("nav.groups")}>
          {mounted && ready ? <GroupList currentId={groupId} /> : <p className="text-sm text-text-secondary">{t("shell.loadingGroups")}</p>}
        </nav>
        {mode !== "remote" ? (
          <Button type="button" variant="ghost" className="mt-6" onClick={() => void resetSamples()}>
            {t("shell.restoreSamples")}
          </Button>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1">
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {importOffer ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent-subtle px-4 py-3 text-sm">
              <p>{t("shell.importOffer")}</p>
              <div className="flex gap-2">
                <Button onClick={() => void copyGuestData()}>{t("shell.copyGroups")}</Button>
                <Button variant="outline" onClick={dismissImport}>
                  {t("shell.notNow")}
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{formatError(error, t)}</AlertDescription>
            </Alert>
          ) : null}
          {children}
          <div aria-live="polite" className="sr-only">
            {formatStatus(message, t)}
          </div>
        </div>
        {sheet.kind !== "closed" && wide ? (
          <aside
            ref={dialogRef}
            className="hidden w-[22rem] shrink-0 overflow-auto border-l border-border bg-surface p-4 xl:block"
            aria-labelledby="sheet-title"
          >
            <h2 id="sheet-title" className="text-lg font-semibold">
              {title}
            </h2>
            <div className="mt-4">{sheetForm}</div>
          </aside>
        ) : null}
        <Sheet open={sheet.kind !== "closed" && !wide} onOpenChange={(open) => !open && closeSheet()}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8">{sheetForm}</div>
          </SheetContent>
        </Sheet>
      </div>
      <nav aria-label={t("shell.mobile")} className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden">
        <Button type="button" variant="ghost" className="h-14 min-h-14 flex-1 rounded-none" onClick={() => router.push("/groups")}>
          {t("nav.groups")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-14 min-h-14 flex-1 rounded-none"
          disabled={!activeGroup}
          onClick={() => activeGroup && openSheet({ kind: "expense", groupId: activeGroup.id })}
        >
          <Plus aria-hidden="true" size={18} strokeWidth={1.75} />
          {t("shell.add")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-14 min-h-14 flex-1 rounded-none"
          disabled={!activeGroup}
          onClick={() => activeGroup && openSheet({ kind: "settle", groupId: activeGroup.id })}
        >
          {t("shell.settle")}
        </Button>
      </nav>
    </div>
  );
}
