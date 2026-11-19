import { db } from "@/db";
import { npcEncounters } from "@/db/schema";
import { EncounterTemplate } from "@/lib/characters";
import { ensureWorkspace } from "@/lib/store";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    await ensureWorkspace();
    const rows = await db.select().from(npcEncounters).orderBy(asc(npcEncounters.updatedAt));
    return Response.json(rows.map(r => r.encounter));
  } catch {
    return Response.json({ error: "Could not load encounters." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureWorkspace();
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "Please name this encounter setup." }, { status: 400 });
    }
    const encounter: EncounterTemplate = {
      id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID(),
      name: body.name.trim().slice(0, 120),
      description: typeof body.description === "string" ? body.description.trim().slice(0, 400) : "",
      combatantIds: Array.isArray(body.combatantIds) ? body.combatantIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 60) : [],
      customCombatants: Array.isArray(body.customCombatants)
        ? body.customCombatants.slice(0, 30).map((pc: Record<string, unknown>) => ({
            id: typeof pc.id === "string" && pc.id ? pc.id : crypto.randomUUID(),
            name: typeof pc.name === "string" && pc.name.trim() ? pc.name.trim().slice(0, 80) : "Player Character",
            isPc: true as const,
            classOrRole: typeof pc.classOrRole === "string" ? pc.classOrRole.slice(0, 80) : "PC",
            ac: Number.isFinite(Number(pc.ac)) ? Number(pc.ac) : 15,
            hp: Number.isFinite(Number(pc.hp)) ? Number(pc.hp) : 30,
            maxHp: Number.isFinite(Number(pc.maxHp)) ? Math.max(1, Number(pc.maxHp)) : 30,
            initiative: Number.isFinite(Number(pc.initiative)) ? Number(pc.initiative) : 12,
          }))
        : [],
      initiatives: body.initiatives && typeof body.initiatives === "object" ? (body.initiatives as Record<string, number>) : {},
    };
    await db
      .insert(npcEncounters)
      .values({ id: encounter.id, encounter, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: npcEncounters.id,
        set: { encounter, updatedAt: new Date() },
      });
    return Response.json(encounter, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save the encounter setup." }, { status: 400 });
  }
}
