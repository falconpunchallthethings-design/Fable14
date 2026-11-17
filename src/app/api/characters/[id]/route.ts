import { db } from "@/db";
import { npcCharacters } from "@/db/schema";
import { normalizeCharacter } from "@/lib/characters";
import { ensureWorkspace } from "@/lib/store";
import { eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await ensureWorkspace();
    const { id } = await context.params;
    const [existing] = await db.select().from(npcCharacters).where(eq(npcCharacters.id, id));
    if (!existing) return Response.json({ error: "Character not found." }, { status: 404 });
    const updates = await request.json();
    const profile = normalizeCharacter({ ...existing.profile, ...updates, id });
    await db.update(npcCharacters).set({ profile, updatedAt: new Date() }).where(eq(npcCharacters.id, id));
    return Response.json(profile);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save the character." }, { status: 400 });
  }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const result = await db.delete(npcCharacters).where(eq(npcCharacters.id, id)).returning({ id: npcCharacters.id });
    if (!result.length) return Response.json({ error: "Character not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not delete the character." }, { status: 500 }); }
}
