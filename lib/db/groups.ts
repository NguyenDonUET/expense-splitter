import type { Db } from "mongodb";
import type { ActivityEvent, Expense, Group, Member, Settlement } from "@/lib/domain";

interface StoredGroup {
  _id: string;
  id: string;
  ownerId: string;
  name: string;
  description: string;
  currency: string;
  createdAt: string;
  customCategories?: string[];
}

function key(ownerId: string, id: string) {
  return `${ownerId}::${id}`;
}

function childDoc<T extends { id: string }>(ownerId: string, groupId: string, item: T) {
  return { ...item, _id: key(ownerId, item.id), ownerId, groupId };
}

async function replaceChildren<T extends { id: string }>(db: Db, collection: string, ownerId: string, groupId: string, items: T[]) {
  await db.collection(collection).deleteMany({ ownerId, groupId });
  if (items.length === 0) return;
  await db.collection<{ _id: string }>(collection).insertMany(items.map((item) => childDoc(ownerId, groupId, item)));
}

function clean<T extends { id: string }>(doc: T & { _id?: unknown; ownerId?: string; groupId?: string }): T {
  const rest = { ...doc };
  delete rest._id;
  delete rest.ownerId;
  delete rest.groupId;
  return rest;
}
function assemble(
  group: StoredGroup,
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[],
  activity: ActivityEvent[],
): Group {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    createdAt: group.createdAt,
    customCategories: group.customCategories,
    members,
    expenses,
    settlements,
    activity,
  };
}

async function childrenFor(db: Db, ownerId: string, groupIds: string[]) {
  const filter = { ownerId, groupId: { $in: groupIds } };
  const [members, expenses, settlements, activity] = await Promise.all([
    db.collection<Member & { groupId: string }>("members").find(filter).toArray(),
    db.collection<Expense & { groupId: string }>("expenses").find(filter).toArray(),
    db.collection<Settlement & { groupId: string }>("settlements").find(filter).toArray(),
    db.collection<ActivityEvent & { groupId: string }>("activity").find(filter).toArray(),
  ]);
  return { members, expenses, settlements, activity };
}

export async function listGroups(db: Db, ownerId: string): Promise<Group[]> {
  const stored = await db.collection<StoredGroup>("groups").find({ ownerId }).toArray();
  const ids = stored.map((group) => group.id);
  const related = await childrenFor(db, ownerId, ids);
  return stored.map((group) =>
    assemble(
      group,
      related.members.filter((item) => item.groupId === group.id).map(clean),
      related.expenses.filter((item) => item.groupId === group.id).map(clean),
      related.settlements.filter((item) => item.groupId === group.id).map(clean),
      related.activity.filter((item) => item.groupId === group.id).map(clean),
    ),
  );
}

export async function getGroup(db: Db, ownerId: string, id: string): Promise<Group | null> {
  const stored = await db.collection<StoredGroup>("groups").findOne({ _id: key(ownerId, id), ownerId });
  if (!stored) return null;
  const related = await childrenFor(db, ownerId, [id]);
  return assemble(stored, related.members.map(clean), related.expenses.map(clean), related.settlements.map(clean), related.activity.map(clean));
}

export async function saveGroup(db: Db, ownerId: string, group: Group) {
  await db.collection<StoredGroup>("groups").updateOne(
    { _id: key(ownerId, group.id) },
    {
      $set: {
        id: group.id,
        ownerId,
        name: group.name,
        description: group.description,
        currency: group.currency,
        createdAt: group.createdAt,
        customCategories: group.customCategories ?? [],
      },
    },
    { upsert: true },
  );
  await replaceChildren(db, "members", ownerId, group.id, group.members);
  await replaceChildren(db, "expenses", ownerId, group.id, group.expenses);
  await replaceChildren(db, "settlements", ownerId, group.id, group.settlements);
  await replaceChildren(db, "activity", ownerId, group.id, group.activity ?? []);
}

export async function deleteStoredGroup(db: Db, ownerId: string, id: string) {
  await Promise.all([
    db.collection<{ _id: string; ownerId: string }>("groups").deleteOne({ _id: key(ownerId, id), ownerId }),
    db.collection("members").deleteMany({ ownerId, groupId: id }),
    db.collection("expenses").deleteMany({ ownerId, groupId: id }),
    db.collection("settlements").deleteMany({ ownerId, groupId: id }),
    db.collection("activity").deleteMany({ ownerId, groupId: id }),
  ]);
}
