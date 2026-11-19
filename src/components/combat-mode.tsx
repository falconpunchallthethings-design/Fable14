"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, BookmarkCheck, BookOpen, Check, ChevronLeft, ChevronRight, Clock, Compass, Dices, Eye, Flame, FolderOpen, Heart, Pencil, Plus, RotateCcw, Save, Search, Shield, Sparkles, Swords, Trash2, UserPlus, Users, WandSparkles, X } from "lucide-react";
import { Character, Collection, ConditionEntry, CustomCombatant, EncounterTemplate, abilityNames, formatLegendBadge, getCollectionPath, matchesCollectionFilter, modifier, signed } from "@/lib/characters";
import { lookupSkill, lookupSpell, parseSpellSlotsFromCharacter } from "@/lib/compendium";

type Props = {
  characters: Character[];
  collections: Collection[];
  combatantIds: string[];
  customCombatants: CustomCombatant[];
  onSetCustomCombatants: React.Dispatch<React.SetStateAction<CustomCombatant[]>>;
  initiatives: Record<string, number>;
  onSetInitiatives: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  encounters: EncounterTemplate[];
  onSaveEncounter: (enc: Omit<EncounterTemplate, "id"> & { id?: string }) => Promise<boolean>;
  onDeleteEncounter: (id: string) => Promise<boolean>;
  onLoadEncounter: (enc: EncounterTemplate) => void;
  activeId: string;
  onSelectActive: (id: string) => void;
  onToggleCombatant: (id: string) => void;
  onSetCombatants: (ids: string[]) => void;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => Promise<boolean>;
  onEditCharacter: (c: Character) => void;
  onExitCombat: () => void;
  saving: boolean;
};

const CONDITIONS = ["Concentrating", "Hex / Mark", "Armor of Agathys", "Mage Armor", "Charmed", "Frightened", "Prone", "Invisible", "Restrained", "Paralyzed", "Bless / Bane"];

function parseFeatureEntries(raw: string, dotOnly = false): { name: string; desc: string }[] {
  if (!raw || !raw.trim() || /^none/i.test(raw.trim())) return [];
  return raw
    .split(dotOnly ? /\s*·\s*/ : /\s*·\s*|\s*;\s*/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const colonIdx = part.indexOf(":");
      const dashIdx = part.indexOf("—");
      const splitIdx = colonIdx > 0 && (dashIdx < 0 || colonIdx < dashIdx) ? colonIdx : dashIdx;
      if (splitIdx > 0 && splitIdx < 45) {
        return {
          name: part.slice(0, splitIdx).trim(),
          desc: part.slice(splitIdx + 1).trim(),
        };
      }
      return { name: part, desc: "" };
    });
}

export default function CombatMode({
  characters, collections, combatantIds, customCombatants, onSetCustomCombatants,
  initiatives, onSetInitiatives, encounters, onSaveEncounter, onDeleteEncounter, onLoadEncounter,
  activeId, onSelectActive, onToggleCombatant, onSetCombatants, onUpdateCharacter, onEditCharacter, onExitCombat, saving,
}: Props) {
  const [drawer, setDrawer] = useState<"none" | "fighters" | "addPc" | "encounters">("none");
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerLocation, setPickerLocation] = useState("all");

  // Add PC form state
  const [pcName, setPcName] = useState("");
  const [pcRole, setPcRole] = useState("Player Character");
  const [pcAc, setPcAc] = useState(16);
  const [pcHp, setPcHp] = useState(35);
  const [pcInit, setPcInit] = useState(14);

  // Save encounter template state
  const [encounterName, setEncounterName] = useState("");
  const [encounterDesc, setEncounterDesc] = useState("");

  // Condition durations state: Record<combatantId, ConditionEntry[]>
  const [conditions, setConditions] = useState<Record<string, ConditionEntry[]>>({});
  const [defaultDuration, setDefaultDuration] = useState<number>(3); // 0 = indefinite, >0 = rounds
  const [expiredNotice, setExpiredNotice] = useState<string>("");

  const [expendedSlots, setExpendedSlots] = useState<Record<string, Record<string, number>>>({});
  const [hpInput, setHpInput] = useState("");
  const [inspected, setInspected] = useState<{ kind: "spell" | "skill"; name: string; meta: string; summary: string; level?: number } | null>(null);
  const [round, setRound] = useState(1);

  type UnifiedCombatant =
    | { kind: "npc"; id: string; name: string; ac: number; hp: number; maxHp: number; cr: string; character: Character }
    | { kind: "pc"; id: string; name: string; ac: number; hp: number; maxHp: number; cr: string; pc: CustomCombatant };

  const combatants: UnifiedCombatant[] = combatantIds
    .map((id): UnifiedCombatant | null => {
      const npc = characters.find(c => c.id === id);
      if (npc) return { kind: "npc", id: npc.id, name: npc.name, ac: npc.ac, hp: npc.hp, maxHp: npc.maxHp, cr: npc.cr, character: npc };
      const pc = customCombatants.find(p => p.id === id);
      if (pc) return { kind: "pc", id: pc.id, name: pc.name, ac: pc.ac, hp: pc.hp, maxHp: pc.maxHp, cr: "PC", pc };
      return null;
    })
    .filter((x): x is UnifiedCombatant => x !== null);

  const activeParticipant = combatants.find(c => c.id === activeId) || combatants[0];
  const firstNpcInEncounter = combatants.find((c): c is Extract<UnifiedCombatant, { kind: "npc" }> => c.kind === "npc")?.character;
  const activeNpc = activeParticipant?.kind === "npc" ? activeParticipant.character : firstNpcInEncounter || characters.find(c => c.id === activeId) || characters[0];
  const activePc = activeParticipant?.kind === "pc" ? activeParticipant.pc : null;
  const currentId = activeParticipant?.id || activeNpc?.id || "";

  function applyHpChangeToParticipant(rawValue: string) {
    const trimmed = rawValue.trim();
    if (!trimmed || !activeParticipant) return;
    const isHeal = trimmed.startsWith("+");
    const numeric = parseInt(trimmed.replace(/^[+-]/, ""), 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const delta = isHeal ? numeric : -numeric;
    const nextHp = Math.max(0, Math.min(activeParticipant.maxHp, activeParticipant.hp + delta));
    setHpInput("");
    if (activeParticipant.kind === "npc") {
      if (nextHp !== activeParticipant.hp) void onUpdateCharacter(activeParticipant.id, { hp: nextHp });
    } else {
      onSetCustomCombatants(prev => prev.map(p => p.id === activeParticipant.id ? { ...p, hp: nextHp } : p));
    }
  }

  function restoreFullHp() {
    if (!activeParticipant) return;
    if (activeParticipant.kind === "npc") {
      void onUpdateCharacter(activeParticipant.id, { hp: activeParticipant.maxHp });
    } else {
      onSetCustomCombatants(prev => prev.map(p => p.id === activeParticipant.id ? { ...p, hp: p.maxHp } : p));
    }
  }

  function setCombatantInitiative(id: string, value: number) {
    onSetInitiatives(prev => ({ ...prev, [id]: value }));
    onSetCustomCombatants(prev => prev.map(p => p.id === id ? { ...p, initiative: value } : p));
  }

  function sortLineupByInitiative() {
    const sorted = [...combatants].sort((a, b) => (initiatives[b.id] ?? 0) - (initiatives[a.id] ?? 0));
    if (sorted.length) {
      onSetCombatants(sorted.map(c => c.id));
      onSelectActive(sorted[0].id);
    }
  }

  function rollAllInitiatives() {
    const next: Record<string, number> = { ...initiatives };
    for (const c of combatants) {
      if (c.kind === "npc") {
        const dexMod = modifier(c.character.abilities.DEX);
        const d20 = Math.floor(Math.random() * 20) + 1;
        next[c.id] = d20 + dexMod;
      } else if (next[c.id] === undefined) {
        next[c.id] = c.pc.initiative;
      }
    }
    onSetInitiatives(next);
    const sorted = [...combatants].sort((a, b) => (next[b.id] ?? 0) - (next[a.id] ?? 0));
    if (sorted.length) {
      onSetCombatants(sorted.map(c => c.id));
      onSelectActive(sorted[0].id);
    }
  }

  function moveCombatantOrder(id: string, direction: -1 | 1) {
    const idx = combatantIds.indexOf(id);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= combatantIds.length) return;
    const copy = [...combatantIds];
    const [item] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, item);
    onSetCombatants(copy);
  }

  function advanceRoundAndTickConditions() {
    setRound(r => r + 1);
    const expiredList: string[] = [];
    const next: Record<string, ConditionEntry[]> = {};
    for (const [cid, list] of Object.entries(conditions)) {
      const cName = combatants.find(x => x.id === cid)?.name || "Combatant";
      const kept: ConditionEntry[] = [];
      for (const entry of list) {
        if (entry.remainingRounds === null) {
          kept.push(entry);
        } else if (entry.remainingRounds > 1) {
          kept.push({ ...entry, remainingRounds: entry.remainingRounds - 1 });
        } else {
          expiredList.push(`${entry.name} (${cName})`);
        }
      }
      if (kept.length) next[cid] = kept;
    }
    setConditions(next);
    if (expiredList.length > 0) {
      setExpiredNotice(`Expired at start of round: ${expiredList.join(", ")}`);
    } else {
      setExpiredNotice("");
    }
  }

  function nextTurn() {
    if (!combatants.length) return;
    const idx = combatants.findIndex(c => c.id === activeParticipant?.id);
    const nextIdx = (idx + 1) % combatants.length;
    if (nextIdx === 0 && combatants.length > 0) {
      advanceRoundAndTickConditions();
    }
    onSelectActive(combatants[nextIdx].id);
  }

  function prevTurn() {
    if (!combatants.length) return;
    const idx = combatants.findIndex(c => c.id === activeParticipant?.id);
    const prevIdx = (idx - 1 + combatants.length) % combatants.length;
    onSelectActive(combatants[prevIdx].id);
  }

  function toggleCondition(charId: string, condName: string) {
    setConditions(prev => {
      const current = prev[charId] || [];
      const exists = current.some(x => x.name === condName);
      const next = exists
        ? current.filter(x => x.name !== condName)
        : [...current, { name: condName, remainingRounds: defaultDuration > 0 ? defaultDuration : null }];
      return { ...prev, [charId]: next };
    });
  }

  function addCustomPc(e: React.FormEvent) {
    e.preventDefault();
    if (!pcName.trim()) return;
    const newPc: CustomCombatant = {
      id: `pc-${crypto.randomUUID().slice(0, 8)}`,
      name: pcName.trim(),
      isPc: true,
      classOrRole: pcRole.trim() || "Player Character",
      ac: Number(pcAc) || 15,
      hp: Number(pcHp) || 30,
      maxHp: Math.max(1, Number(pcHp) || 30),
      initiative: Number(pcInit) || 12,
    };
    onSetCustomCombatants(prev => [...prev, newPc]);
    onSetInitiatives(prev => ({ ...prev, [newPc.id]: newPc.initiative }));
    onSetCombatants([...combatantIds, newPc.id]);
    onSelectActive(newPc.id);
    setPcName("");
    setDrawer("none");
  }

  async function handleSaveEncounter(e: React.FormEvent) {
    e.preventDefault();
    if (!encounterName.trim()) return;
    const ok = await onSaveEncounter({
      name: encounterName.trim(),
      description: encounterDesc.trim(),
      combatantIds,
      customCombatants: customCombatants.filter(p => combatantIds.includes(p.id)),
      initiatives,
    });
    if (ok) {
      setEncounterName("");
      setEncounterDesc("");
    }
  }

  function toggleSlotPip(charId: string, slotLabel: string, pipIndex: number, maxCount: number) {
    setExpendedSlots(prev => {
      const charSlots = prev[charId] || {};
      const currentUsed = charSlots[slotLabel] || 0;
      const nextUsed = pipIndex < currentUsed ? pipIndex : Math.min(maxCount, pipIndex + 1);
      return {
        ...prev,
        [charId]: { ...charSlots, [slotLabel]: nextUsed },
      };
    });
  }

  function expendOneSlotForLevel(charId: string, spellLevel: number, slotGroups: { label: string; count: number }[]) {
    if (spellLevel <= 0 || !slotGroups.length) return;
    const prefix = `${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}`;
    const group = slotGroups.find(g => g.label.toLowerCase().startsWith(prefix)) || slotGroups[0];
    if (!group) return;
    setExpendedSlots(prev => {
      const charSlots = prev[charId] || {};
      const used = charSlots[group.label] || 0;
      if (used >= group.count) return prev;
      return {
        ...prev,
        [charId]: { ...charSlots, [group.label]: used + 1 },
      };
    });
  }

  function resetAllSlots(charId: string) {
    setExpendedSlots(prev => ({ ...prev, [charId]: {} }));
  }

  const pickerFiltered = characters.filter(
    c =>
      matchesCollectionFilter(c.collectionId, pickerLocation, collections) &&
      `${c.name} ${c.ancestry} ${c.combatClass} ${c.occupation} ${c.location}`
        .toLowerCase()
        .includes(pickerQuery.toLowerCase())
  );

  const actionItems = activeNpc?.additionalActions
    ? activeNpc.additionalActions.split(/\s*;\s*|\s*·\s*/).map(s => s.replace(/^Cast\s+/i, "").trim()).filter(Boolean)
    : [];

  const spellMatch = activeNpc?.spellcasting.match(/spells:\s*([^.)]+)/i);
  const spellItems = spellMatch
    ? spellMatch[1].split(/\s*,\s*|\s*;\s*/).map(s => s.replace(/^Cast\s+/i, "").trim()).filter(Boolean)
    : [];

  const allSpellsAndActions = Array.from(new Set([...actionItems, ...spellItems]));
  const spellsByLevel = new Map<number, { raw: string; info: ReturnType<typeof lookupSpell> }[]>();
  for (const item of allSpellsAndActions) {
    const info = lookupSpell(item);
    const lvl = /\(at-will\)/i.test(item) ? 0 : info.level;
    const list = spellsByLevel.get(lvl) || [];
    if (!list.some(x => x.info.name.toLowerCase() === info.name.toLowerCase())) {
      list.push({ raw: item, info });
      spellsByLevel.set(lvl, list);
    }
  }
  const sortedLevels = Array.from(spellsByLevel.keys()).sort((a, b) => a - b);

  const slotGroups = activeNpc
    ? parseSpellSlotsFromCharacter(activeNpc.limitedResources, activeNpc.spellcasting, activeNpc.combatClass)
    : [];

  const activeConditions = currentId ? conditions[currentId] || [] : [];
  const activeLegend = activeNpc ? formatLegendBadge(activeNpc.legendStars) : null;
  const skillTokens = activeNpc?.skills ? activeNpc.skills.split(/\s*,\s*/).filter(Boolean) : [];

  const featureEntries = activeNpc
    ? [
        ...parseFeatureEntries(activeNpc.templateFeatures),
        ...parseFeatureEntries(activeNpc.classFeatures),
        ...parseFeatureEntries(activeNpc.ancestryTraits),
      ].filter((entry, idx, arr) => arr.findIndex(x => x.name.toLowerCase() === entry.name.toLowerCase()) === idx)
    : [];

  const tacticsEntries = activeNpc ? parseFeatureEntries(activeNpc.combatTactics, true) : [];

  return (
    <section className="combat-workspace" aria-label="Combat mode">
      <div className="combat-roster-bar">
        <div className="combat-roster-header">
          <div className="combat-roster-title">
            <span className="combat-badge"><Swords size={13} />COMBAT MODE</span>
            <strong>Active encounter · Round {round}</strong>
            <span className="combat-count">{combatants.length} {combatants.length === 1 ? "combatant" : "combatants"}</span>
          </div>
          <div className="combat-roster-controls">
            <button className={`button button-small ${drawer === "fighters" ? "button-primary" : "button-white"}`} onClick={() => setDrawer(drawer === "fighters" ? "none" : "fighters")}>
              <UserPlus size={13} />
              Select fighters ({combatants.length})
            </button>
            <button className={`button button-small ${drawer === "addPc" ? "button-primary" : "button-white"}`} onClick={() => setDrawer(drawer === "addPc" ? "none" : "addPc")}>
              <Users size={13} />
              Add PC
            </button>
            <button className={`button button-small ${drawer === "encounters" ? "button-primary" : "button-white"}`} onClick={() => setDrawer(drawer === "encounters" ? "none" : "encounters")}>
              <FolderOpen size={13} />
              Encounters ({encounters.length})
            </button>
            <button className="button button-small button-white" onClick={sortLineupByInitiative} disabled={!combatants.length} title="Sort turn order by current initiative numbers">
              <ArrowDownWideNarrow size={13} />
              Sort Init
            </button>
            <button className="button button-small button-white" onClick={rollAllInitiatives} disabled={!combatants.length}>
              <Dices size={13} />
              Roll initiative
            </button>
            <div className="turn-stepper">
              <button className="icon-button" onClick={prevTurn} aria-label="Previous combatant" disabled={!combatants.length}>
                <ArrowLeft size={14} />
              </button>
              <button className="button button-small button-primary" onClick={nextTurn} disabled={!combatants.length}>
                Next turn
                <ArrowRight size={13} />
              </button>
            </div>
            <button className="button button-small button-white" onClick={onExitCombat}>
              <BookOpen size={13} />
              Back to library
            </button>
          </div>
        </div>

        {expiredNotice && (
          <div className="expired-condition-banner" role="status">
            <Clock size={13} />
            <span>{expiredNotice}</span>
            <button type="button" onClick={() => setExpiredNotice("")} aria-label="Dismiss expired notice"><X size={12} /></button>
          </div>
        )}

        {/* Drawer 1: Select NPCs */}
        {drawer === "fighters" && (
          <div className="combat-picker-drawer" role="region" aria-label="Select fighting NPCs">
            <div className="combat-picker-toolbar">
              <div className="library-search combat-picker-search">
                <Search size={14} />
                <input
                  value={pickerQuery}
                  onChange={e => setPickerQuery(e.target.value)}
                  placeholder="Filter NPCs by name, class, or location…"
                  aria-label="Filter combat NPCs"
                />
                {pickerQuery && <button onClick={() => setPickerQuery("")} aria-label="Clear fighter search"><X size={12} /></button>}
              </div>
              <select
                className="combat-location-select"
                aria-label="Filter fighters by location"
                value={pickerLocation}
                onChange={e => setPickerLocation(e.target.value)}
              >
                <option value="all">All regions, cities & sublocations</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.kind === "city" ? `↳ ${col.name}` : col.kind === "sublocation" ? `  ↳ ${col.name}` : col.name}
                  </option>
                ))}
              </select>
              <button
                className="button button-small button-white"
                onClick={() => {
                  const ids = Array.from(new Set([...combatantIds, ...pickerFiltered.map(c => c.id)]));
                  onSetCombatants(ids);
                }}
              >
                Add visible ({pickerFiltered.length})
              </button>
              <button className="button button-small button-white" onClick={() => setDrawer("none")}>
                <Check size={12} />Done
              </button>
            </div>
            <div className="combat-picker-grid">
              {pickerFiltered.map(c => {
                const checked = combatantIds.includes(c.id);
                const cLegend = formatLegendBadge(c.legendStars);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`combat-picker-item ${checked ? "is-checked" : ""}`}
                    onClick={() => onToggleCombatant(c.id)}
                    aria-pressed={checked}
                  >
                    <span className="picker-check">{checked ? <Check size={11} /> : <Plus size={11} />}</span>
                    <div className="picker-item-info">
                      <strong>{c.name} {cLegend ? <span className="picker-legend">{cLegend.starsText}</span> : null}</strong>
                      <span>CR {c.cr} · AC {c.ac} · {c.hp}/{c.maxHp} HP · {c.combatClass || c.occupation}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer 2: Add Player Character (PC) to battle order */}
        {drawer === "addPc" && (
          <div className="combat-picker-drawer" role="region" aria-label="Add Player Character to battle order">
            <form className="add-pc-inline-form" onSubmit={addCustomPc}>
              <label className="form-field">
                <span>Player Character name</span>
                <input
                  aria-label="Player Character name"
                  placeholder="e.g. Lyra Voss (PC)"
                  value={pcName}
                  onChange={e => setPcName(e.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Class & level</span>
                <input
                  aria-label="PC class and level"
                  placeholder="e.g. Rogue · Level 5"
                  value={pcRole}
                  onChange={e => setPcRole(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>AC</span>
                <input
                  type="number"
                  aria-label="PC AC"
                  value={pcAc}
                  onChange={e => setPcAc(Number(e.target.value))}
                />
              </label>
              <label className="form-field">
                <span>Max HP</span>
                <input
                  type="number"
                  aria-label="PC HP"
                  value={pcHp}
                  onChange={e => setPcHp(Number(e.target.value))}
                />
              </label>
              <label className="form-field">
                <span>Initiative</span>
                <input
                  type="number"
                  aria-label="PC Initiative"
                  value={pcInit}
                  onChange={e => setPcInit(Number(e.target.value))}
                />
              </label>
              <div className="add-pc-form-actions">
                <button type="submit" className="button button-small button-primary" disabled={!pcName.trim()}>
                  <Plus size={12} />Add PC to turn order
                </button>
                <button type="button" className="button button-small button-white" onClick={() => setDrawer("none")}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Drawer 3: Save / Reload Encounter Templates */}
        {drawer === "encounters" && (
          <div className="combat-picker-drawer" role="region" aria-label="Saved encounter setups">
            <div className="encounters-drawer-layout">
              <div className="saved-encounters-list">
                <span className="input-label">Saved encounter templates ({encounters.length})</span>
                {encounters.map(enc => (
                  <div key={enc.id} className="saved-encounter-card">
                    <div className="saved-encounter-info">
                      <strong>{enc.name}</strong>
                      <span>
                        {enc.combatantIds.length} combatants
                        {enc.customCombatants?.length ? ` (${enc.customCombatants.length} PCs)` : ""}
                        {enc.description ? ` · ${enc.description}` : ""}
                      </span>
                    </div>
                    <div className="saved-encounter-actions">
                      <button
                        type="button"
                        className="button button-small button-primary"
                        onClick={() => {
                          onLoadEncounter(enc);
                          setRound(1);
                          setDrawer("none");
                        }}
                      >
                        <BookmarkCheck size={12} />Load lineup
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete encounter ${enc.name}`}
                        onClick={() => void onDeleteEncounter(enc.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form className="save-encounter-form" onSubmit={e => void handleSaveEncounter(e)}>
                <span className="input-label">Save current lineup ({combatants.length} combatants) as template</span>
                <input
                  aria-label="Encounter template name"
                  placeholder="e.g. Goblin ambush, 4 PCs + 3 goblins + boss"
                  value={encounterName}
                  onChange={e => setEncounterName(e.target.value)}
                  required
                />
                <input
                  aria-label="Encounter description"
                  placeholder="Optional tactical notes or location…"
                  value={encounterDesc}
                  onChange={e => setEncounterDesc(e.target.value)}
                />
                <button type="submit" className="button button-small button-primary" disabled={!encounterName.trim() || saving}>
                  <Save size={12} />Save encounter setup
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Turn Order & Initiative Strip */}
        <div className="combatants-strip" role="tablist" aria-label="Active combatants">
          {combatants.map((c, idx) => {
            const isCurrent = activeParticipant?.id === c.id;
            const isBloodied = c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);
            const isDown = c.hp <= 0;
            const charConds = conditions[c.id] || [];
            const initVal = initiatives[c.id] ?? (c.kind === "pc" ? c.pc.initiative : undefined);
            const cLegend = c.kind === "npc" ? formatLegendBadge(c.character.legendStars) : null;
            return (
              <div
                key={c.id}
                role="tab"
                aria-selected={isCurrent}
                tabIndex={0}
                className={`combatant-pill ${isCurrent ? "is-active-turn" : ""} ${c.kind === "pc" ? "is-pc-pill" : ""} ${isDown ? "is-down" : isBloodied ? "is-bloodied" : ""}`}
                onClick={() => onSelectActive(c.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectActive(c.id); } }}
              >
                <div className="combatant-pill-top">
                  <div className="init-badge-editor" onClick={e => e.stopPropagation()}>
                    <span>Init</span>
                    <input
                      type="number"
                      aria-label={`Initiative for ${c.name}`}
                      value={initVal ?? ""}
                      placeholder={`#${idx + 1}`}
                      onChange={e => setCombatantInitiative(c.id, Number(e.target.value))}
                    />
                  </div>
                  <strong className="combatant-name">{c.name}</strong>
                  {c.kind === "pc" ? (
                    <span className="pc-pill-badge">PC</span>
                  ) : (
                    <>
                      {cLegend && <span className="pill-legend-stars" title={cLegend.isLegend ? "Legend" : "Notable distinction"}>{cLegend.starsText}</span>}
                      <span className="combatant-cr">CR {c.cr}</span>
                    </>
                  )}
                  <button
                    type="button"
                    className="combatant-remove"
                    title={`Remove ${c.name} from fight`}
                    aria-label={`Remove ${c.name} from fight`}
                    onClick={e => { e.stopPropagation(); onToggleCombatant(c.id); }}
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="combatant-pill-stats">
                  <span className="pill-ac"><Shield size={11} />AC {c.ac}</span>
                  <span className="pill-hp"><Heart size={11} /><strong>{c.hp}/{c.maxHp} HP</strong></span>
                  <div className="pill-order-arrows" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Move ${c.name} earlier in turn order`}
                      disabled={idx === 0}
                      onClick={() => moveCombatantOrder(c.id, -1)}
                      title="Move earlier in turn order"
                    >
                      <ChevronLeft size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${c.name} later in turn order`}
                      disabled={idx === combatants.length - 1}
                      onClick={() => moveCombatantOrder(c.id, 1)}
                      title="Move later in turn order"
                    >
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
                {(isDown || isBloodied || charConds.length > 0) && (
                  <div className="combatant-pill-tags">
                    {isDown && <span className="cond-tag down-tag">0 HP · Down</span>}
                    {!isDown && isBloodied && <span className="cond-tag bloodied-tag">Bloodied</span>}
                    {charConds.map(cond => (
                      <span key={cond.name} className="cond-tag">
                        {cond.name}{cond.remainingRounds !== null ? ` (${cond.remainingRounds}r)` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!combatants.length && (
            <div className="combatants-empty">
              <p>No fighters selected yet. Click <strong>Select fighters</strong> or <strong>Add PC</strong> above to set up the battle order.</p>
            </div>
          )}
        </div>
      </div>

      {/* If active participant is a Player Character (PC), show PC Turn Workbench */}
      {activePc && (
        <div className="pc-active-banner" role="region" aria-label={`${activePc.name} player character turn`}>
          <div className="pc-active-info">
            <span className="pc-turn-kicker">PLAYER CHARACTER TURN</span>
            <h3>{activePc.name} <span>· {activePc.classOrRole} · AC {activePc.ac}</span></h3>
          </div>
          <div className="combat-hp-workbench">
            <div className="combat-hp-readout">
              <span>PC HIT POINTS</span>
              <strong>{activePc.hp} <small>/ {activePc.maxHp} HP</small></strong>
            </div>
            <form
              className="combat-hp-form"
              onSubmit={e => {
                e.preventDefault();
                applyHpChangeToParticipant(hpInput);
              }}
            >
              <input
                type="text"
                className="combat-hp-input"
                aria-label="PC hit points lost or healed"
                placeholder="HP lost (or +heal)"
                value={hpInput}
                onChange={e => setHpInput(e.target.value)}
              />
              <button type="submit" className="button button-small button-primary" disabled={!hpInput.trim()}>
                Apply
              </button>
              <button type="button" className="button button-small button-white" onClick={restoreFullHp}>
                <RotateCcw size={12} />Full
              </button>
            </form>
          </div>
        </div>
      )}

      {activeNpc && (
        <article className="character-sheet combat-sheet mm-statblock" aria-label={`${activeNpc.name} combat stat block`}>
          <header className="combat-sheet-header mm-header">
            <div className="mm-title-block">
              <div className="sheet-eyebrow">
                <span className="tiny-dot" />
                <span>{getCollectionPath(activeNpc.collectionId, collections)}</span>
                {activeLegend && (
                  <span className={`legend-badge ${activeLegend.isLegend ? "is-full-legend" : "is-partial-legend"}`}>
                    <span className="legend-stars" aria-hidden="true">{activeLegend.starsText}</span>
                    {activeLegend.isLegend && <strong>Legend</strong>}
                  </span>
                )}
              </div>
              <div className="combat-name-row">
                <h2>{activeNpc.name}</h2>
                <span className="combat-class-badge">{activeNpc.combatClass || activeNpc.occupation}</span>
                <span className="combat-cr-badge">CR {activeNpc.cr}</span>
              </div>
              <p className="mm-subtitle">
                Medium or Small humanoid ({activeNpc.ancestry}, {activeNpc.pronouns}) · {activeNpc.occupation}
                {activeNpc.faith && !/^no strong affiliation/i.test(activeNpc.faith) ? ` · Follows ${activeNpc.faith}` : ""}
              </p>
            </div>

            {!activePc && (
              <div className="combat-hp-workbench">
                <div className="combat-hp-readout">
                  <span>HIT POINTS {activeNpc.hitDice ? `(${activeNpc.hitDice})` : ""}</span>
                  <strong>{activeNpc.hp} <small>/ {activeNpc.maxHp} HP</small></strong>
                </div>
                <form
                  className="combat-hp-form"
                  onSubmit={e => {
                    e.preventDefault();
                    applyHpChangeToParticipant(hpInput);
                  }}
                >
                  <input
                    type="text"
                    inputMode="text"
                    className="combat-hp-input"
                    aria-label="Hit points lost or healed"
                    placeholder="HP lost (or +heal)"
                    value={hpInput}
                    onChange={e => setHpInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="button button-small button-primary"
                    disabled={!hpInput.trim() || saving}
                    title="Enter a number (e.g. 12) for damage lost, or prefix with + (e.g. +8) to heal"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="button button-small button-white"
                    disabled={activeNpc.hp === activeNpc.maxHp || saving}
                    onClick={restoreFullHp}
                    title="Restore full hit points"
                  >
                    <RotateCcw size={12} />Full
                  </button>
                  <button type="button" className="button button-small button-white" onClick={() => onEditCharacter(activeNpc)}>
                    <Pencil size={12} />Edit
                  </button>
                </form>
              </div>
            )}
          </header>

          {/* Conditions Bar with Duration in Rounds */}
          <div className="combat-conditions-bar">
            <span className="cond-bar-label">Conditions & duration:</span>
            <select
              className="condition-duration-select"
              aria-label="Condition duration in rounds"
              value={defaultDuration}
              onChange={e => setDefaultDuration(Number(e.target.value))}
              title="Rounds before newly applied conditions auto-clear"
            >
              <option value={0}>∞ Indefinite</option>
              <option value={1}>1 round</option>
              <option value={2}>2 rounds</option>
              <option value={3}>3 rounds</option>
              <option value={5}>5 rounds</option>
              <option value={10}>10 rounds (1 min)</option>
            </select>
            {CONDITIONS.map(cond => {
              const found = activeConditions.find(x => x.name === cond);
              const on = Boolean(found);
              return (
                <button
                  key={cond}
                  type="button"
                  className={`condition-chip ${on ? "active" : ""}`}
                  onClick={() => toggleCondition(currentId, cond)}
                  aria-pressed={on}
                >
                  {cond}
                  {found && found.remainingRounds !== null && (
                    <span className="cond-rounds-badge">{found.remainingRounds}r</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monster Manual Core Stat Strip */}
          <div className="mm-core-strip">
            <div className="mm-core-line">
              <strong>Armor Class</strong> <span>{activeNpc.ac} ({activeNpc.wornEquipment || "unarmoured"})</span>
              <span className="mm-dot">·</span>
              <strong>Hit Points</strong> <span>{activeNpc.hp} / {activeNpc.maxHp}{activeNpc.hitDice ? ` (${activeNpc.hitDice})` : ""}</span>
              <span className="mm-dot">·</span>
              <strong>Speed</strong> <span>{activeNpc.movement || activeNpc.speed}</span>
            </div>
            <div className="ability-scores mm-ability-table">
              {abilityNames.map(a => (
                <div key={a}>
                  <span>{a}</span>
                  <strong>{activeNpc.abilities[a]} ({signed(modifier(activeNpc.abilities[a]))})</strong>
                </div>
              ))}
            </div>
            <div className="mm-props-grid">
              <div><strong>Saving Throws</strong> {activeNpc.savingThrows || "None"}</div>
              <div className="mm-skills-prop">
                <strong>Skills</strong>{" "}
                {skillTokens.length > 0 ? (
                  skillTokens.map(sk => (
                    <button
                      key={sk}
                      type="button"
                      className="mm-skill-btn"
                      onClick={() => {
                        const info = lookupSkill(sk);
                        setInspected(prev =>
                          prev?.name === `${info.name} (${info.bonus})`
                            ? null
                            : {
                                kind: "skill",
                                name: `${info.name} (${info.bonus})`,
                                meta: `${info.ability} check · Proficiency bonus (${activeNpc.proficiencyBonus || "+2"}) included`,
                                summary: info.summary,
                              }
                        );
                      }}
                    >
                      {sk}
                    </button>
                  ))
                ) : (
                  <span>None</span>
                )}
              </div>
              {activeNpc.resistances && activeNpc.resistances !== "None registered" && (
                <div><strong>Resistances & Defenses</strong> {activeNpc.resistances}</div>
              )}
              <div><strong>Senses</strong> passive Perception {activeNpc.passive}</div>
              <div><strong>Languages</strong> {activeNpc.languages}</div>
              <div><strong>Challenge</strong> {activeNpc.cr} (Proficiency Bonus {activeNpc.proficiencyBonus || "+2"})</div>
            </div>
          </div>

          {inspected && (
            <div className="mm-inspector-banner" role="region" aria-label="Compendium description">
              <div className="mm-inspector-header">
                <div>
                  <span className="mm-inspector-badge">{inspected.kind === "spell" ? "SPELL COMPENDIUM" : "SKILL CHECK"}</span>
                  <strong>{inspected.name}</strong>
                  <span className="mm-inspector-meta">{inspected.meta}</span>
                </div>
                <div className="mm-inspector-actions">
                  {inspected.kind === "spell" && inspected.level && inspected.level > 0 && slotGroups.length > 0 && (
                    <button
                      type="button"
                      className="button button-small button-primary"
                      onClick={() => expendOneSlotForLevel(activeNpc.id, inspected.level!, slotGroups)}
                    >
                      Cast (expend slot)
                    </button>
                  )}
                  <button type="button" className="icon-button" aria-label="Close description" onClick={() => setInspected(null)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <p>{inspected.summary}</p>
            </div>
          )}

          <div className="session-content combat-sheet-grid">
            {/* Left Column: Monster Manual Traits + Adventure Module Combat Tactics & Personality */}
            <div className="session-column">
              <section className="sheet-section">
                <h3><Shield size={14} />Traits, Ancestry & Class Features</h3>
                {featureEntries.length > 0 ? (
                  <div className="mm-traits-list">
                    {featureEntries.map(entry => (
                      <p key={entry.name} className="mm-trait-entry">
                        <strong><em>{entry.name}.</em></strong>{" "}
                        <span>{entry.desc || "Active character trait."}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="combat-trait-paragraph">No special ancestry or class traits registered.</p>
                )}
              </section>

              <section className="sheet-section wants-section">
                <h3><Flame size={14} />Combat Tactics & Roleplay</h3>
                {tacticsEntries.length > 0 && (
                  <div className="mm-tactics-box">
                    {tacticsEntries.map(t => (
                      <div key={t.name} className="mm-tactic-line">
                        <strong>{t.name}:</strong> <span>{t.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
                <dl className="reference-list mm-demeanor-list">
                  <div>
                    <dt>Personality</dt>
                    <dd>{activeNpc.traits.join(" · ")} — <em>“{activeNpc.voice}.”</em></dd>
                  </div>
                  <div>
                    <dt>Under threat</dt>
                    <dd>{activeNpc.threatResponse || "Avoids unnecessary fights if possible."}</dd>
                  </div>
                  <div>
                    <dt>In conflict</dt>
                    <dd>{activeNpc.conflict} (Stress: {activeNpc.stress})</dd>
                  </div>
                  {activeNpc.faith && (
                    <div>
                      <dt>Primary god</dt>
                      <dd><Compass size={11} style={{ display: "inline", marginRight: 4 }} />{activeNpc.faith}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            {/* Right Column: Actions, Spell Slots & Interactive Spells by Level */}
            <div className="session-column right-session-column">
              <section className="sheet-section">
                <h3><Swords size={14} />Actions & Weapons</h3>
                <div className="mm-actions-list">
                  <p className="mm-trait-entry">
                    <strong><em>{activeNpc.attack.split("·")[0].trim()}.</em></strong>{" "}
                    <em>Weapon Attack:</em> {activeNpc.attack.split("·").slice(1).join(" · ").trim() || activeNpc.attack}
                  </p>
                  {activeNpc.sidearm && activeNpc.sidearm.split("·")[0].trim().toLowerCase() !== activeNpc.attack.split("·")[0].trim().toLowerCase() && (
                    <p className="mm-trait-entry">
                      <strong><em>{activeNpc.sidearm.split("·")[0].trim()} (Sidearm).</em></strong>{" "}
                      <em>Alternate Attack:</em> {activeNpc.sidearm.split("·").slice(1).join(" · ").trim() || activeNpc.sidearm}
                    </p>
                  )}
                  {activeNpc.bonusActions && activeNpc.bonusActions !== "None" && (
                    <p className="mm-trait-entry">
                      <strong><em>Bonus Actions / Reactions.</em></strong> {activeNpc.bonusActions}
                    </p>
                  )}
                </div>
              </section>

              <section className="sheet-section appearance-section">
                <h3><WandSparkles size={14} />Spellcasting & Spell Slots</h3>
                {activeNpc.spellcasting ? (
                  <div className="combat-spellcasting-box">
                    <div className="spellcasting-header-line">
                      <Sparkles size={13} />
                      <strong>{activeNpc.spellcasting.split("—")[0].trim()}</strong>
                    </div>
                  </div>
                ) : null}

                {slotGroups.length > 0 && (
                  <div className="spell-slots-tracker" aria-label="Spell slots tracker">
                    <div className="spell-slots-header">
                      <span>SPELL SLOTS (CLICK PIP TO EXPEND / RESTORE)</span>
                      <button type="button" className="slot-reset-btn" onClick={() => resetAllSlots(activeNpc.id)}>
                        <RotateCcw size={10} />Reset slots
                      </button>
                    </div>
                    <div className="spell-slots-grid">
                      {slotGroups.map(group => {
                        const used = expendedSlots[activeNpc.id]?.[group.label] || 0;
                        return (
                          <div key={group.label} className="spell-slot-group">
                            <span className="slot-group-label">{group.label.replace(/-level slots?/i, "")}</span>
                            <div className="slot-pips">
                              {Array.from({ length: group.count }).map((_, i) => {
                                const isExpended = i < used;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    className={`slot-pip ${isExpended ? "is-expended" : ""}`}
                                    aria-label={`${group.label} slot ${i + 1} ${isExpended ? "expended" : "available"}`}
                                    aria-pressed={isExpended}
                                    onClick={() => toggleSlotPip(activeNpc.id, group.label, i, group.count)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sortedLevels.length > 0 ? (
                  <div className="mm-spell-levels">
                    <span className="combat-sub-kicker">Click any spell or skill to view its 5e effect & range:</span>
                    {sortedLevels.map(lvl => {
                      const items = spellsByLevel.get(lvl) || [];
                      const levelHeading =
                        lvl === 0
                          ? "Cantrips (at will)"
                          : `${lvl}${lvl === 1 ? "st" : lvl === 2 ? "nd" : lvl === 3 ? "rd" : "th"} level`;
                      return (
                        <div key={lvl} className="mm-spell-level-row">
                          <span className="mm-spell-level-label">{levelHeading}:</span>
                          <div className="mm-spell-buttons">
                            {items.map(({ raw, info }) => {
                              const isSelected = inspected?.name.toLowerCase() === info.name.toLowerCase();
                              return (
                                <button
                                  key={raw}
                                  type="button"
                                  className={`combat-action-pill ${isSelected ? "is-selected" : ""}`}
                                  onClick={() => {
                                    const lvlLabel = info.level === 0 ? "Cantrip" : `${info.level}${info.level === 1 ? "st" : info.level === 2 ? "nd" : info.level === 3 ? "rd" : "th"}-level`;
                                    setInspected(prev =>
                                      prev?.name === info.name
                                        ? null
                                        : {
                                            kind: "spell",
                                            name: info.name,
                                            meta: `${lvlLabel} ${info.school} · ${info.castingTime} · Range ${info.range} · ${info.duration}`,
                                            summary: info.summary,
                                            level: info.level,
                                          }
                                    );
                                  }}
                                >
                                  {info.name.toLowerCase()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="combat-trait-paragraph">No spells or special actions registered.</p>
                )}

                <div className="belongings-line combat-gear-line">
                  <span>Carried gear:</span>
                  <strong>{activeNpc.equipment}</strong>
                </div>
              </section>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
