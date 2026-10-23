"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Group } from "@/lib/domain";
import { addMember, removalBlockReason, removeMember } from "@/lib/group-actions";
import { avatarColorFor, createId } from "@/lib/ids";
import { currencySymbol } from "@/lib/money";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Button, controlClass, Field } from "@/components/ui";

export function GroupSheet({ group }: { group?: Group }) {
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [currency, setCurrency] = useState(group?.currency ?? "USD");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      setError("Enter a group name.");
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
      await commit(next, group ? "Group updated." : "Group created.");
      closeSheet();
      if (!group) router.push(`/groups/${next.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this group.");
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
      <Field id="group-name" label="Name">
        <input id="group-name" className={controlClass} value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field id="group-description" label="Description">
        <textarea id="group-description" className={`${controlClass} min-h-20 py-2`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field
        id="group-currency"
        label="Default currency"
        hint={group && group.expenses.length > 0 ? "Existing expenses keep the rate stored when they were logged." : undefined}
      >
        <select id="group-currency" className={controlClass} value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {currencySymbol(code)} {code}
            </option>
          ))}
        </select>
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {group ? "Save group" : "Create group"}
        </Button>
        <Button variant="quiet" onClick={closeSheet}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function MembersSheet({ group }: { group: Group }) {
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const viewer = viewerId(group, viewingAs);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    try {
      const next = addMember(
        group,
        { id: createId("mem"), name: name.trim(), email: email.trim() || undefined, avatarColor: avatarColorFor(group.members.length) },
        viewer || undefined,
      );
      await commit(next, `${name.trim()} added.`);
      setName("");
      setEmail("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that member.");
    }
  }

  async function remove(memberId: string) {
    try {
      await commit(removeMember(group, memberId, viewer || undefined), "Member removed.");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove that member.");
    }
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {group.members.map((member) => {
          const blocked = removalBlockReason(group, member.id);
          return (
            <li key={member.id} className="flex items-center justify-between gap-3">
              <span>
                {member.name}
                {member.email ? <span className="block text-sm text-text-secondary">{member.email}</span> : <span className="block text-sm text-text-secondary">Name only</span>}
              </span>
              <Button variant="ghost" disabled={Boolean(blocked)} title={blocked ?? "Remove this member"} onClick={() => void remove(member.id)}>
                Remove
              </Button>
            </li>
          );
        })}
      </ul>
      <Field id="member-name" label="Name">
        <input id="member-name" className={controlClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="member-email" label="Email" hint="Optional. Leave blank for someone without an account.">
        <input id="member-email" type="email" className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={() => void add()}>Add member</Button>
        <Button variant="quiet" onClick={closeSheet}>
          Done
        </Button>
      </div>
    </div>
  );
}
