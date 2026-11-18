"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Dices, Flame, Heart, Pencil, Plus, RotateCcw, Search, Shield, Sparkles, Swords, UserPlus, WandSparkles, X } from "lucide-react";
import { Character, Collection, abilityNames, formatLegendBadge, getCollectionPath, matchesCollectionFilter, modifier, signed } from "@/lib/characters";
import { lookupSkill, lookupSpell, parseSpellSlotsFromCharacter } from "@/lib/compendium";

type Props = {
  characters: Character[];
  collections: Collection[];
  combatantIds: string[];
  activeId: string;
  onSelectActive: (id: string) => void;
  onToggleCombatant: (id: string) => void;
  onSetCombatants: (ids: string[]) => void;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => Promise<boolean>;
  onEditCharacter: (c: Character) => void;
  onExitCombat: () => void;
  saving: boolean;
};

const CONDITIONS = ["Concentrating", "Hex / Mark", "Armor of Agathys", "Mage Armor", "Charmed", "Frightened", "Prone", "Invisible", "Restrained"];

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
  characters, collections, combatantIds, activeId, onSelectActive,
  onToggleCombatant, onSetCombatants, onUpdateCharacter, onEditCharacter, onExitCombat, saving,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerLocation, setPickerLocation] = useState("all");
  const [initiatives, setInitiatives] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, string[]>>({});
  const [expendedSlots, setExpendedSlots] = useState<Record<string, Record<string, number>>>({});
  const [hpInput, setHpInput] = useState("");
  const [inspected, setInspected] = useState<{ kind: "spell" | "skill"; name: string; meta: string; summary: string; level?: number } | null>(null);
  const [round, setRound] = useState(1);

  const combatants = combatantIds
    .map(id => characters.find(c => c.id === id))
    .filter((c): c is Character => Boolean(c));

  const active = combatants.find(c => c.id === activeId) || combatants[0] || characters[0];

  function applyHpChange(c: Character, rawValue: string) {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const isHeal = trimmed.startsWith("+");
    const numeric = parseInt(trimmed.replace(/^[+-]/, ""), 10);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const delta = isHeal ? numeric : -numeric;
    const nextHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
    setHpInput("");
    if (nextHp !== c.hp) void onUpdateCharacter(c.id, { hp: nextHp });
  }

  function rollAllInitiatives() {
    const next: Record<string, number> = { ...initiatives };
    for (const c of combatants) {
      const dexMod = modifier(c.abilities.DEX);
      const d20 = Math.floor(Math.random() * 20) + 1;
      next[c.id] = d20 + dexMod;
    }
    setInitiatives(next);
    const sorted = [...combatants].sort((a, b) => (next[b.id] ?? 0) - (next[a.id] ?? 0));
    if (sorted.length) {
      onSetCombatants(sorted.map(c => c.id));
      onSelectActive(sorted[0].id);
    }
  }

  function nextTurn() {
    if (!combatants.length) return;
    const idx = combatants.findIndex(c => c.id === active?.id);
    const nextIdx = (idx + 1) % combatants.length;
    if (nextIdx === 0 && combatants.length > 0) setRound(r => r + 1);
    onSelectActive(combatants[nextIdx].id);
  }

  function prevTurn() {
    if (!combatants.length) return;
    const idx = combatants.findIndex(c => c.id === active?.id);
    const prevIdx = (idx - 1 + combatants.length) % combatants.length;
    onSelectActive(combatants[prevIdx].id);
  }

  function toggleCondition(charId: string, cond: string) {
    setConditions(prev => {
      const current = prev[charId] || [];
      const next = current.includes(cond) ? current.filter(x => x !== cond) : [...current, cond];
      return { ...prev, [charId]: next };
    });
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

  const actionItems = active?.additionalActions
    ? active.additionalActions.split(/\s*;\s*|\s*·\s*/).map(s => s.replace(/^Cast\s+/i, "").trim()).filter(Boolean)
    : [];

  const spellMatch = active?.spellcasting.match(/spells:\s*([^.)]+)/i);
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

  const slotGroups = active
    ? parseSpellSlotsFromCharacter(active.limitedResources, active.spellcasting, active.combatClass)
    : [];

  const activeConditions = active ? conditions[active.id] || [] : [];
  const activeLegend = active ? formatLegendBadge(active.legendStars) : null;
  const skillTokens = active?.skills ? active.skills.split(/\s*,\s*/).filter(Boolean) : [];

  const featureEntries = active
    ? [
        ...parseFeatureEntries(active.templateFeatures),
        ...parseFeatureEntries(active.classFeatures),
        ...parseFeatureEntries(active.ancestryTraits),
      ].filter((entry, idx, arr) => arr.findIndex(x => x.name.toLowerCase() === entry.name.toLowerCase()) === idx)
    : [];

  const tacticsEntries = active ? parseFeatureEntries(active.combatTactics, true) : [];

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
            <button className="button button-small button-white" onClick={() => setPickerOpen(!pickerOpen)}>
              <UserPlus size={13} />
              Select fighters ({combatants.length})
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

        {pickerOpen && (
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
              <button className="button button-small button-white" onClick={() => setPickerOpen(false)}>
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

        <div className="combatants-strip" role="tablist" aria-label="Active combatants">
          {combatants.map((c, idx) => {
            const isCurrent = active?.id === c.id;
            const isBloodied = c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);
            const isDown = c.hp <= 0;
            const charConds = conditions[c.id] || [];
            const initVal = initiatives[c.id];
            const cLegend = formatLegendBadge(c.legendStars);
            return (
              <div
                key={c.id}
                role="tab"
                aria-selected={isCurrent}
                tabIndex={0}
                className={`combatant-pill ${isCurrent ? "is-active-turn" : ""} ${isDown ? "is-down" : isBloodied ? "is-bloodied" : ""}`}
                onClick={() => onSelectActive(c.id)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectActive(c.id); } }}
              >
                <div className="combatant-pill-top">
                  <span className="combatant-init" title="Initiative order">
                    {initVal !== undefined ? `Init ${initVal}` : `#${idx + 1}`}
                  </span>
                  <strong className="combatant-name">{c.name}</strong>
                  {cLegend && <span className="pill-legend-stars" title={cLegend.isLegend ? "Legend" : "Notable distinction"}>{cLegend.starsText}</span>}
                  <span className="combatant-cr">CR {c.cr}</span>
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
                </div>
                {(isDown || isBloodied || charConds.length > 0) && (
                  <div className="combatant-pill-tags">
                    {isDown && <span className="cond-tag down-tag">0 HP · Down</span>}
                    {!isDown && isBloodied && <span className="cond-tag bloodied-tag">Bloodied</span>}
                    {charConds.slice(0, 2).map(cond => <span key={cond} className="cond-tag">{cond}</span>)}
                  </div>
                )}
              </div>
            );
          })}
          {!combatants.length && (
            <div className="combatants-empty">
              <p>No fighters selected yet. Click <strong>Select fighters</strong> above to choose which NPCs are in this encounter.</p>
            </div>
          )}
        </div>
      </div>

      {active && (
        <article className="character-sheet combat-sheet mm-statblock" aria-label={`${active.name} combat stat block`}>
          <header className="combat-sheet-header mm-header">
            <div className="mm-title-block">
              <div className="sheet-eyebrow">
                <span className="tiny-dot" />
                <span>{getCollectionPath(active.collectionId, collections)}</span>
                {activeLegend && (
                  <span className={`legend-badge ${activeLegend.isLegend ? "is-full-legend" : "is-partial-legend"}`}>
                    <span className="legend-stars" aria-hidden="true">{activeLegend.starsText}</span>
                    {activeLegend.isLegend && <strong>Legend</strong>}
                  </span>
                )}
              </div>
              <div className="combat-name-row">
                <h2>{active.name}</h2>
                <span className="combat-class-badge">{active.combatClass || active.occupation}</span>
                <span className="combat-cr-badge">CR {active.cr}</span>
              </div>
              <p className="mm-subtitle">
                Medium or Small humanoid ({active.ancestry}, {active.pronouns}) · {active.occupation}
                {active.faith && !/^no strong affiliation/i.test(active.faith) ? ` · Follows ${active.faith}` : ""}
              </p>
            </div>

            <div className="combat-hp-workbench">
              <div className="combat-hp-readout">
                <span>HIT POINTS {active.hitDice ? `(${active.hitDice})` : ""}</span>
                <strong>{active.hp} <small>/ {active.maxHp} HP</small></strong>
              </div>
              <form
                className="combat-hp-form"
                onSubmit={e => {
                  e.preventDefault();
                  applyHpChange(active, hpInput);
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
                  disabled={active.hp === active.maxHp || saving}
                  onClick={() => void onUpdateCharacter(active.id, { hp: active.maxHp })}
                  title="Restore full hit points"
                >
                  <RotateCcw size={12} />Full
                </button>
                <button type="button" className="button button-small button-white" onClick={() => onEditCharacter(active)}>
                  <Pencil size={12} />Edit
                </button>
              </form>
            </div>
          </header>

          <div className="combat-conditions-bar">
            <span className="cond-bar-label">Conditions & states:</span>
            {CONDITIONS.map(cond => {
              const on = activeConditions.includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  className={`condition-chip ${on ? "active" : ""}`}
                  onClick={() => toggleCondition(active.id, cond)}
                  aria-pressed={on}
                >
                  {cond}
                </button>
              );
            })}
          </div>

          {/* Monster Manual Core Stat Strip */}
          <div className="mm-core-strip">
            <div className="mm-core-line">
              <strong>Armor Class</strong> <span>{active.ac} ({active.wornEquipment || "unarmoured"})</span>
              <span className="mm-dot">·</span>
              <strong>Hit Points</strong> <span>{active.hp} / {active.maxHp}{active.hitDice ? ` (${active.hitDice})` : ""}</span>
              <span className="mm-dot">·</span>
              <strong>Speed</strong> <span>{active.movement || active.speed}</span>
            </div>
            <div className="ability-scores mm-ability-table">
              {abilityNames.map(a => (
                <div key={a}>
                  <span>{a}</span>
                  <strong>{active.abilities[a]} ({signed(modifier(active.abilities[a]))})</strong>
                </div>
              ))}
            </div>
            <div className="mm-props-grid">
              <div><strong>Saving Throws</strong> {active.savingThrows || "None"}</div>
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
                                meta: `${info.ability} check · Proficiency bonus (${active.proficiencyBonus || "+2"}) included`,
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
              {active.resistances && active.resistances !== "None registered" && (
                <div><strong>Resistances & Defenses</strong> {active.resistances}</div>
              )}
              <div><strong>Senses</strong> passive Perception {active.passive}</div>
              <div><strong>Languages</strong> {active.languages}</div>
              <div><strong>Challenge</strong> {active.cr} (Proficiency Bonus {active.proficiencyBonus || "+2"})</div>
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
                      onClick={() => expendOneSlotForLevel(active.id, inspected.level!, slotGroups)}
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
                    <dd>{active.traits.join(" · ")} — <em>“{active.voice}.”</em></dd>
                  </div>
                  <div>
                    <dt>Under threat</dt>
                    <dd>{active.threatResponse || "Avoids unnecessary fights if possible."}</dd>
                  </div>
                  <div>
                    <dt>In conflict</dt>
                    <dd>{active.conflict} (Stress: {active.stress})</dd>
                  </div>
                  {active.faith && (
                    <div>
                      <dt>Primary god</dt>
                      <dd><Compass size={11} style={{ display: "inline", marginRight: 4 }} />{active.faith}</dd>
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
                    <strong><em>{active.attack.split("·")[0].trim()}.</em></strong>{" "}
                    <em>Weapon Attack:</em> {active.attack.split("·").slice(1).join(" · ").trim() || active.attack}
                  </p>
                  {active.sidearm && active.sidearm.split("·")[0].trim().toLowerCase() !== active.attack.split("·")[0].trim().toLowerCase() && (
                    <p className="mm-trait-entry">
                      <strong><em>{active.sidearm.split("·")[0].trim()} (Sidearm).</em></strong>{" "}
                      <em>Alternate Attack:</em> {active.sidearm.split("·").slice(1).join(" · ").trim() || active.sidearm}
                    </p>
                  )}
                  {active.bonusActions && active.bonusActions !== "None" && (
                    <p className="mm-trait-entry">
                      <strong><em>Bonus Actions / Reactions.</em></strong> {active.bonusActions}
                    </p>
                  )}
                </div>
              </section>

              <section className="sheet-section appearance-section">
                <h3><WandSparkles size={14} />Spellcasting & Spell Slots</h3>
                {active.spellcasting ? (
                  <div className="combat-spellcasting-box">
                    <div className="spellcasting-header-line">
                      <Sparkles size={13} />
                      <strong>{active.spellcasting.split("—")[0].trim()}</strong>
                    </div>
                  </div>
                ) : null}

                {slotGroups.length > 0 && (
                  <div className="spell-slots-tracker" aria-label="Spell slots tracker">
                    <div className="spell-slots-header">
                      <span>SPELL SLOTS (CLICK PIP TO EXPEND / RESTORE)</span>
                      <button type="button" className="slot-reset-btn" onClick={() => resetAllSlots(active.id)}>
                        <RotateCcw size={10} />Reset slots
                      </button>
                    </div>
                    <div className="spell-slots-grid">
                      {slotGroups.map(group => {
                        const used = expendedSlots[active.id]?.[group.label] || 0;
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
                                    onClick={() => toggleSlotPip(active.id, group.label, i, group.count)}
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
                  <strong>{active.equipment}</strong>
                </div>
              </section>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
