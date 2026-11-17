import { db } from "@/db";
import { npcCharacters } from "@/db/schema";
import { normalizeCharacter } from "@/lib/characters";
import { ensureWorkspace, getWorkspace } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await getWorkspace()); }
  catch (error) { console.error(error); return Response.json({ error: "The library could not be loaded. Please try again." }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    await ensureWorkspace();
    const profile = normalizeCharacter(await request.json());
    profile.id = crypto.randomUUID();
    await db.insert(npcCharacters).values({ id: profile.id, profile });
    return Response.json(profile, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create the character." }, { status: 400 });
  }
}
