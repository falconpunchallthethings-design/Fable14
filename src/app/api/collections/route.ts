import { db } from "@/db";
import { npcCollections } from "@/db/schema";
import { ensureWorkspace } from "@/lib/store";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await ensureWorkspace();
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80) {
      return Response.json({ error: "Give your location or folder a name (up to 80 characters)." }, { status: 400 });
    }
    const parentId = typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null;
    if (parentId) {
      const [parent] = await db.select().from(npcCollections).where(eq(npcCollections.id, parentId));
      if (!parent) return Response.json({ error: "Parent location not found." }, { status: 400 });
    }
    const collection = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      color: /^#[a-f0-9]{6}$/i.test(body.color) ? body.color : "#a6b48c",
      parentId,
    };
    await db.insert(npcCollections).values(collection);
    return Response.json(collection, { status: 201 });
  } catch {
    return Response.json({ error: "Could not create the location folder." }, { status: 500 });
  }
}
