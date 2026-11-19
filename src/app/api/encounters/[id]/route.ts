import { db } from "@/db";
import { npcEncounters } from "@/db/schema";
import { eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await db.delete(npcEncounters).where(eq(npcEncounters.id, id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not delete the encounter." }, { status: 500 });
  }
}
