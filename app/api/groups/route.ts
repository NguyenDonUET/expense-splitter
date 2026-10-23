import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listGroups, saveGroup } from "@/lib/db/groups";
import { getDb } from "@/lib/mongo";
import type { Group } from "@/lib/domain";

export const runtime = "nodejs";

async function ownerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unavailable() {
  return NextResponse.json({ error: "errors.mongoSave" }, { status: 503 });
}

export async function GET() {
  const id = await ownerId();
  if (!id) return NextResponse.json({ error: "errors.signInRequired" }, { status: 401 });
  const db = await getDb();
  if (!db) return unavailable();
  return NextResponse.json(await listGroups(db, id));
}

export async function POST(request: Request) {
  const id = await ownerId();
  if (!id) return NextResponse.json({ error: "errors.signInRequired" }, { status: 401 });
  const db = await getDb();
  if (!db) return unavailable();
  const group = (await request.json()) as Group;
  if (!group?.id || !group.name) return NextResponse.json({ error: "errors.groupNameRequired" }, { status: 400 });
  await saveGroup(db, id, group);
  return NextResponse.json({ ok: true });
}
