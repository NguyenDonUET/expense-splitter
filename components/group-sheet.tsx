"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Group } from "@/lib/domain";
import { addMember, removalBlockReason, removeMember } from "@/lib/group-actions";
import { formatError } from "@/lib/i18n/format-error";
import { avatarColorFor, createId } from "@/lib/ids";
import { currencySymbol } from "@/lib/money";
import { useAppStore, viewerId } from "@/stores/app-store";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function GroupSheet({ group }: { group?: Group }) {
  const t = useT();
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [currency, setCurrency] = useState(group?.currency ?? "USD");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      setError(t("groupForm.enterName"));
      return;
    }
    const next: Group = group
      ? { ...group, name: name.trim(), description: description.trim(), currency }
      : {
          id: createId("grp"),
          name: name.trim(),
          description: description.trim(),
          currency,
          createdAt: new Date().toISOString(),
          members: [],
          expenses: [],
          settlements: [],
        };
    setSaving(true);
    try {
      await commit(next, group ? "status.groupUpdated" : "status.groupCreated");
      closeSheet();
      if (!group) router.push(`/groups/${next.id}`);
    } catch (caught) {
      setError(formatError(caught, t, "errors.saveGroup"));
      setSaving(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field id="group-name" label={t("groupForm.name")}>
        <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field id="group-description" label={t("groupForm.description")}>
        <Textarea id="group-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field
        id="group-currency"
        label={t("groupForm.defaultCurrency")}
        hint={group && group.expenses.length > 0 ? t("groupForm.currencyHint") : undefined}
      >
        <AppSelect
          id="group-currency"
          value={currency}
          onValueChange={setCurrency}
          items={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: `${currencySymbol(code)} ${code}` }))}
        />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {group ? t("groupForm.saveGroup") : t("groupForm.createGroup")}
        </Button>
        <Button variant="outline" onClick={closeSheet}>
          {t("groupForm.cancel")}
        </Button>
      </div>
    </form>
  );
}

export function MembersSheet({ group }: { group: Group }) {
  const t = useT();
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const viewer = viewerId(group, viewingAs);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) {
      setError(t("groupForm.enterMemberName"));
      return;
    }
    try {
      const next = addMember(
        group,
        { id: createId("mem"), name: name.trim(), email: email.trim() || undefined, avatarColor: avatarColorFor(group.members.length) },
        viewer || undefined,
      );
      await commit(next, t("status.memberAdded", { name: name.trim() }));
      setName("");
      setEmail("");
      setError(null);
    } catch (caught) {
      setError(formatError(caught, t, "errors.addMember"));
    }
  }

  async function remove(memberId: string) {
    try {
      await commit(removeMember(group, memberId, viewer || undefined), "status.memberRemoved");
      setError(null);
    } catch (caught) {
      setError(formatError(caught, t, "errors.removeMember"));
    }
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {group.members.map((member) => {
          const blocked = removalBlockReason(group, member.id);
          const blockedLabel = blocked ? t(blocked, { name: member.name }) : null;
          return (
            <li key={member.id} className="flex items-center justify-between gap-3">
              <span>
                {member.name}
                {member.email ? <span className="block text-sm text-text-secondary">{member.email}</span> : <span className="block text-sm text-text-secondary">{t("groupForm.nameOnly")}</span>}
              </span>
              <Button variant="ghost" disabled={Boolean(blocked)} title={blockedLabel ?? t("groupForm.removeMember")} onClick={() => void remove(member.id)}>
                {t("groupForm.remove")}
              </Button>
            </li>
          );
        })}
      </ul>
      <Field id="member-name" label={t("groupForm.name")}>
        <Input id="member-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="member-email" label={t("groupForm.email")} hint={t("groupForm.emailHint")}>
        <Input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={() => void add()}>{t("groupForm.addMember")}</Button>
        <Button variant="outline" onClick={closeSheet}>
          {t("groupForm.done")}
        </Button>
      </div>
    </div>
  );
}
