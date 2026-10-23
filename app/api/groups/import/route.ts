import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveGroup } from "@/lib/db/groups";
import type { Group } from "@/lib/domain";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "errors.signInRequired" }, { status: 401 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "errors.mongoSave" }, { status: 503 });
  const body = (await request.json()) as { groups?: Group[] };
  const groups = Array.isArray(body.groups) ? body.groups : [];
  for (const group of groups) {
    if (!group?.id || !group.name || !Array.isArray(group.members) || !Array.isArray(group.expenses)) continue;
    await saveGroup(db, session.user.id, group);
  }
  return NextResponse.json({ ok: true, count: groups.length });
}
