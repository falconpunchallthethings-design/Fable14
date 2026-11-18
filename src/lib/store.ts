import { db } from "@/db";
import { npcCharacters, npcCollections, workspaceSettings } from "@/db/schema";
import { defaultCharacters, defaultCollections, LocationKind, normalizeCharacter } from "@/lib/characters";
import { eq, asc } from "drizzle-orm";

let seedPromise: Promise<void> | null = null;
export async function ensureWorkspace() {
  if (!seedPromise) seedPromise = (async () => {
    await db.transaction(async tx => {
      const [stateV3] = await tx.select().from(workspaceSettings).where(eq(workspaceSettings.key, "initialized_v3"));
      if (stateV3) return;
      for (const col of defaultCollections) {
        await tx
          .insert(npcCollections)
          .values({
            id: col.id,
            name: col.name,
            color: col.color,
            parentId: col.parentId ?? null,
            kind: col.kind ?? "region",
          })
          .onConflictDoUpdate({
            target: npcCollections.id,
            set: {
              name: col.name,
              color: col.color,
              parentId: col.parentId ?? null,
              kind: col.kind ?? "region",
            },
          });
      }
      const existingRows = await tx.select().from(npcCharacters);
      const existingMap = new Map(existingRows.map(r => [r.id, r.profile]));
      for (const starter of defaultCharacters) {
        const prev = existingMap.get(starter.id);
        const merged = prev
          ? normalizeCharacter({
              ...starter,
              ...prev,
              portrait: prev.portrait && !prev.portrait.startsWith("/images/") ? prev.portrait : "",
              collectionId:
                prev.collectionId === "rimel" || prev.collectionId === "frontier" || !prev.collectionId
                  ? starter.collectionId
                  : prev.collectionId,
              cr: prev.cr && prev.cr !== "0" ? prev.cr : starter.cr,
              combatClass: prev.combatClass && prev.combatClass !== "Ordinary civilian" ? prev.combatClass : starter.combatClass,
              hitDice: prev.hitDice || starter.hitDice,
              proficiencyBonus: prev.proficiencyBonus || starter.proficiencyBonus,
              savingThrows: prev.savingThrows || starter.savingThrows,
              wornEquipment: prev.wornEquipment || starter.wornEquipment,
              attack: prev.attack || starter.attack,
              sidearm: prev.sidearm || starter.sidearm,
              additionalActions: prev.additionalActions || starter.additionalActions,
              spellcasting: prev.spellcasting || starter.spellcasting,
              bonusActions: prev.bonusActions || starter.bonusActions,
              ancestryTraits: prev.ancestryTraits || starter.ancestryTraits,
              templateFeatures: prev.templateFeatures || starter.templateFeatures,
              classFeatures: prev.classFeatures || starter.classFeatures,
              limitedResources: prev.limitedResources || starter.limitedResources,
              combatTactics: prev.combatTactics || starter.combatTactics,
              questOffer: prev.questOffer || starter.questOffer,
              legendStars: typeof prev.legendStars === "number" && prev.legendStars > 0 ? prev.legendStars : starter.legendStars,
              legendDistinction: prev.legendDistinction || starter.legendDistinction,
              movement: prev.movement || starter.movement,
              resistances: prev.resistances || starter.resistances,
              threatResponse: prev.threatResponse || starter.threatResponse,
              faith: prev.faith && prev.faith !== "No strong affiliation" ? prev.faith : starter.faith,
              notes: prev.notes?.length ? prev.notes : starter.notes,
            })
          : starter;
        await tx
          .insert(npcCharacters)
          .values({ id: starter.id, profile: merged })
          .onConflictDoUpdate({
            target: npcCharacters.id,
            set: { profile: merged },
          });
      }
      for (const row of existingRows) {
        if (!defaultCharacters.some(d => d.id === row.id)) {
          const normalized = normalizeCharacter(row.profile);
          await tx.update(npcCharacters).set({ profile: normalized }).where(eq(npcCharacters.id, row.id));
        }
      }
      await tx.insert(workspaceSettings).values({ key: "initialized", value: "1" }).onConflictDoNothing();
      await tx.insert(workspaceSettings).values({ key: "initialized_v2", value: "1" }).onConflictDoNothing();
      await tx.insert(workspaceSettings).values({ key: "initialized_v3", value: "1" }).onConflictDoNothing();
    });
  })().catch(error => { seedPromise = null; throw error; });
  await seedPromise;
}

export async function getWorkspace() {
  await ensureWorkspace();
  const [rows, collections] = await Promise.all([
    db.select().from(npcCharacters).orderBy(asc(npcCharacters.updatedAt)),
    db.select().from(npcCollections),
  ]);
  const defaultOrder = new Map(defaultCharacters.map((c, idx) => [c.id, idx]));
  const sortedRows = [...rows].sort((a, b) => {
    const ia = defaultOrder.get(a.id) ?? 1000;
    const ib = defaultOrder.get(b.id) ?? 1000;
    if (ia !== ib) return ia - ib;
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });
  return {
    characters: sortedRows.map(row => normalizeCharacter(row.profile)),
    collections: collections.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      parentId: c.parentId ?? null,
      kind: (["region", "city", "sublocation"].includes(c.kind) ? c.kind : c.parentId ? "sublocation" : "region") as LocationKind,
    })),
  };
}
