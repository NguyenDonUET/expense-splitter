import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteStoredGroup, getGroup, saveGroup } from "@/lib/db/groups";
import type { Group } from "@/lib/domain";
import { deleteGroupBlockReason } from "@/lib/group-actions";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

async function context(groupId: string) {
  const session = await auth();
  const ownerId = session?.user?.id;
  if (!ownerId) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const db = await getDb();
  if (!db) return { error: NextResponse.json({ error: "MongoDB is not configured. Set DATABASE_URL to save accounts." }, { status: 503 }) };
  return { db, ownerId, groupId };
}

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const ctx = await context(groupId);
  if ("error" in ctx) return ctx.error;
  const group = await getGroup(ctx.db, ctx.ownerId, groupId);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  return NextResponse.json(group);
}

export async function PUT(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const ctx = await context(groupId);
  if ("error" in ctx) return ctx.error;
  const group = (await request.json()) as Group;
  if (group.id !== groupId) return NextResponse.json({ error: "Group id does not match." }, { status: 400 });
  await saveGroup(ctx.db, ctx.ownerId, group);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const ctx = await context(groupId);
  if ("error" in ctx) return ctx.error;
  const group = await getGroup(ctx.db, ctx.ownerId, groupId);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  const reason = deleteGroupBlockReason(group);
  if (reason) return NextResponse.json({ error: reason }, { status: 409 });
  await deleteStoredGroup(ctx.db, ctx.ownerId, groupId);
  return NextResponse.json({ ok: true });
}
