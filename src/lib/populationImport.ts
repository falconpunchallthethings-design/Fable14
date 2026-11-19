// Reads the generator's "group/population" and "settlement" export formats and turns each member/NPC
// into the exact plaintext block the generator's own "Copy as text" produces — so the import can be run
// straight through parseCharacterText(), the same trusted parser used for single-character imports,
// instead of a second, parallel field-mapping path.

export type PopulationKind = "group" | "settlement";

export type ParsedPopulationItem = {
  key: string; // groupIndex (group files) or worldNpcId (settlement files) — stable id used to resolve connections
  name: string;
  subtitle: string; // occupation / role, shown in the review checklist
  text: string; // reconstructed plaintext, ready for parseCharacterText()
  sublocationName?: string; // settlement files only — which named place this NPC belongs to, if any
};

export type ConnectionHint = { fromKey: string; toKey: string; relationship: string; note?: string };

export type ParsedPopulationBatch = {
  kind: PopulationKind;
  title: string;
  regionName: string;
  cityName?: string; // settlement files only
  sublocationNames: string[]; // settlement files only — named places to create under the city
  items: ParsedPopulationItem[];
  connectionHints: ConnectionHint[];
};

type Row = { k: string; v: string; note?: string };
type Section = { title: string; rows: Row[] };

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function kindName(m: Record<string, unknown>): string {
  const race = asString(m.race);
  const subrace = m.subrace;
  if (!subrace || typeof subrace !== "string") return race;
  if (race === "Monstrous Adventurer") return subrace;
  if (subrace.includes(race) || subrace === "Drow") return subrace;
  if (race === "Dragonborn") return `Dragonborn (${subrace})`;
  return `${subrace} ${race}`;
}

function memberToText(m: Record<string, unknown>): string {
  const name = asString(m.name) || `Unnamed ${asString(m.race).toLowerCase()}`;
  const detail = [
    kindName(m),
    m.age !== undefined ? `${m.age} years (${asString(m.ageCategory).toLowerCase()})` : "",
    asString(m.pronouns),
    m.size ? `${m.size}, speed ${asString(m.speed)} ft` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const head = [name, detail, asString(m.raceNote), ""];
  const body: string[] = [];
  const sections = Array.isArray(m.sections) ? (m.sections as Section[]) : [];
  for (const s of sections) {
    if (!s || typeof s.title !== "string") continue;
    body.push(s.title);
    for (const r of s.rows || []) {
      if (!r || typeof r.k !== "string") continue;
      body.push(`  ${r.k}: ${r.v}${r.note ? ` (${r.note})` : ""}`);
    }
    body.push("");
  }
  return [...head, ...body, `Seed: ${asString(m.seed)}`].join("\n");
}

function subtitleFor(m: Record<string, unknown>): string {
  return asString(m.occupationDisplay) || asString(m.actualOccupation) || asString(m.groupRole) || "";
}

/** Returns which population format a parsed JSON object is, or null if it's neither (e.g. a plain
 *  single-character import or a Fable backup, both handled by the existing import path instead). */
export function detectPopulationJson(raw: unknown): PopulationKind | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.members) && (obj.venue || obj.hierarchy || obj.groupOrigin || obj.template)) return "group";
  if (obj.settlement && Array.isArray(obj.npcs)) return "settlement";
  return null;
}

export function parsePopulationFile(raw: Record<string, unknown>): ParsedPopulationBatch {
  const kind = detectPopulationJson(raw);
  if (kind === "settlement") {
    const settlement = raw.settlement as Record<string, unknown>;
    const npcs = raw.npcs as Record<string, unknown>[];
    const locations = Array.isArray(settlement.locations) ? (settlement.locations as Record<string, unknown>[]) : [];
    const locationByNpcId = new Map<string, string>();
    for (const loc of locations) {
      const displayName = asString(loc.displayName);
      if (!displayName) continue;
      if (typeof loc.proprietorNpcId === "string") locationByNpcId.set(loc.proprietorNpcId, displayName);
      for (const staffId of Array.isArray(loc.staffNpcIds) ? loc.staffNpcIds : []) {
        if (typeof staffId === "string" && !locationByNpcId.has(staffId)) locationByNpcId.set(staffId, displayName);
      }
    }
    const connectionHints: ConnectionHint[] = [];
    for (const loc of locations) {
      const displayName = asString(loc.displayName);
      const proprietor = typeof loc.proprietorNpcId === "string" ? loc.proprietorNpcId : null;
      const staff = Array.isArray(loc.staffNpcIds) ? loc.staffNpcIds.filter((s): s is string => typeof s === "string") : [];
      if (proprietor && staff.length) {
        for (const s of staff) {
          connectionHints.push({ fromKey: proprietor, toKey: s, relationship: "Supervises", note: `Runs ${displayName}` });
          connectionHints.push({ fromKey: s, toKey: proprietor, relationship: "Works under", note: `Staff at ${displayName}` });
        }
      }
    }
    return {
      kind: "settlement",
      title: asString(settlement.name, "Settlement"),
      regionName: asString(settlement.regionLabel) || asString(settlement.regionId) || "Unsorted",
      cityName: asString(settlement.name, "Settlement"),
      sublocationNames: Array.from(new Set(locations.map(l => asString(l.displayName)).filter(Boolean))),
      items: npcs.map((n, i) => ({
        key: asString(n.worldNpcId, String(i)),
        name: asString(n.name, "Unnamed"),
        subtitle: subtitleFor(n),
        text: memberToText(n),
        sublocationName: typeof n.worldNpcId === "string" ? locationByNpcId.get(n.worldNpcId) : undefined,
      })),
      connectionHints,
    };
  }
  // group / population file
  const members = raw.members as Record<string, unknown>[];
  const venue = (raw.venue as Record<string, unknown>) || {};
  const groupOrigin = raw.groupOrigin as Record<string, unknown> | undefined;
  const hierarchy = raw.hierarchy as Record<string, unknown> | undefined;
  const edges = Array.isArray(hierarchy?.edges) ? (hierarchy!.edges as Record<string, unknown>[]) : [];
  return {
    kind: "group",
    title: asString(raw.name, "Group"),
    regionName: (groupOrigin && asString(groupOrigin.label)) || asString(raw.demographicProfile) || "Unsorted",
    cityName: asString(venue.title) || asString(raw.name, "Group"),
    sublocationNames: [],
    items: members.map((m, i) => ({
      key: asString(m.groupIndex, String(i + 1)),
      name: asString(m.name, "Unnamed"),
      subtitle: subtitleFor(m),
      text: memberToText(m),
    })),
    connectionHints: edges
      .filter(e => e.from !== undefined && e.to !== undefined && typeof e.relation === "string")
      .map(e => ({ fromKey: String(e.from), toKey: String(e.to), relationship: e.relation as string, note: typeof e.basis === "string" ? e.basis : undefined })),
  };
}
