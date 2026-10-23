import type { Group } from "@/lib/domain";
import type { GroupStore } from "@/lib/store/types";

async function readBody<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "errors.serverRequest");
  return body;
}

export const httpStore: GroupStore = {
  async list() {
    return readBody<Group[]>(await fetch("/api/groups", { cache: "no-store" }));
  },
  async get(id) {
    const response = await fetch(`/api/groups/${id}`, { cache: "no-store" });
    if (response.status === 404) return null;
    return readBody<Group>(response);
  },
  async save(group) {
    const existing = await fetch(`/api/groups/${group.id}`, { cache: "no-store" });
    const response = await fetch(existing.ok ? `/api/groups/${group.id}` : "/api/groups", {
      method: existing.ok ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(group),
    });
    await readBody(response);
  },
  async remove(id) {
    await readBody(await fetch(`/api/groups/${id}`, { method: "DELETE" }));
  },
  async reset() {
    throw new Error("errors.resetRemote");
  },
};
