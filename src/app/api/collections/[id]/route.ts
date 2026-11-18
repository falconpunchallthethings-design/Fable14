import { db } from "@/db";
import { npcCharacters, npcCollections } from "@/db/schema";
import { ensureWorkspace } from "@/lib/store";
import { eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await ensureWorkspace();
    const { id } = await context.params;
    const [existing] = await db.select().from(npcCollections).where(eq(npcCollections.id, id));
    if (!existing) return Response.json({ error: "Location not found." }, { status: 404 });

    const body = await request.json();
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : existing.name;
    const color = /^#[a-f0-9]{6}$/i.test(body.color) ? body.color : existing.color;
    const kind = ["region", "city", "sublocation"].includes(body.kind) ? body.kind : existing.kind;
    let parentId = body.parentId === undefined ? existing.parentId : (typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null);
    if (kind === "region" || parentId === id) parentId = null;

    const updated = { id, name, color, parentId, kind };
    await db.update(npcCollections).set({ name, color, parentId, kind }).where(eq(npcCollections.id, id));
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Could not update the location." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await ensureWorkspace();
    const { id } = await context.params;
    const [existing] = await db.select().from(npcCollections).where(eq(npcCollections.id, id));
    if (!existing) return Response.json({ error: "Location not found." }, { status: 404 });

    const fallbackParent = existing.parentId ?? null;
    await db
      .update(npcCollections)
      .set({
        parentId: fallbackParent,
        kind: fallbackParent ? "city" : "region",
      })
      .where(eq(npcCollections.parentId, id));

    const chars = await db.select().from(npcCharacters);
    for (const row of chars) {
      if (row.profile.collectionId === id) {
        const updatedProfile = { ...row.profile, collectionId: fallbackParent || "" };
        await db.update(npcCharacters).set({ profile: updatedProfile }).where(eq(npcCharacters.id, row.id));
      }
    }

    await db.delete(npcCollections).where(eq(npcCollections.id, id));
    return Response.json({ ok: true, fallbackId: fallbackParent || "" });
  } catch {
    return Response.json({ error: "Could not delete the location." }, { status: 500 });
  }
}
