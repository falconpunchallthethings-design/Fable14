"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Dices, Eye, Flame, Heart, Minus, Pencil, Plus, RotateCcw, Search, Shield, Sparkles, Swords, UserPlus, WandSparkles, Wind, X } from "lucide-react";
import { Character, Collection, abilityNames, getCollectionPath, matchesCollectionFilter, modifier, signed } from "@/lib/characters";

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

const CONDITIONS = ["Concentrating", "Hex / Mark", "Armor of Agathys", "Charmed", "Frightened", "Prone", "Invisible", "Restrained"];

export default function CombatMode({
  characters, collections, combatantIds, activeId, onSelectActive,
  onToggleCombatant, onSetCombatants, onUpdateCharacter, onEditCharacter, onExitCombat, saving,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerLocation, setPickerLocation] = useState("all");
  const [initiatives, setInitiatives] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, string[]>>({});
  const [usedActions, setUsedActions] = useState<Record<string, string[]>>({});
  const [round, setRound] = useState(1);

  const combatants = combatantIds
    .map(id => characters.find(c => c.id === id))
    .filter((c): c is Character => Boolean(c));

  const active = combatants.find(c => c.id === activeId) || combatants[0] || characters[0];

  function adjustHp(c: Character, delta: number) {
    const nextHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
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

  function toggleActionUsed(charId: string, actionName: string) {
    setUsedActions(prev => {
      const current = prev[charId] || [];
      const next = current.includes(actionName) ? current.filter(x => x !== actionName) : [...current, actionName];
      return { ...prev, [charId]: next };
    });
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

  const activeConditions = active ? conditions[active.id] || [] : [];
  const activeUsed = active ? usedActions[active.id] || [] : [];

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
                <option value="all">All locations & folders</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.parentId ? `↳ ${col.name}` : col.name}
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
                      <strong>{c.name}</strong>
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
                  <div className="pill-hp" onClick={e => e.stopPropagation()}>
                    <Heart size={11} />
                    <strong>{c.hp}/{c.maxHp}</strong>
                    <button type="button" aria-label={`Damage ${c.name}`} disabled={c.hp <= 0 || saving} onClick={() => adjustHp(c, -1)}><Minus size={9} /></button>
                    <button type="button" aria-label={`Heal ${c.name}`} disabled={c.hp >= c.maxHp || saving} onClick={() => adjustHp(c, 1)}><Plus size={9} /></button>
                  </div>
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
        <article className="character-sheet combat-sheet" aria-label={`${active.name} combat sheet`}>
          <header className="combat-sheet-header">
            <div>
              <div className="sheet-eyebrow">
                <span className="tiny-dot" />
                {getCollectionPath(active.collectionId, collections)} · {active.ancestry} · {active.pronouns}
              </div>
              <div className="combat-name-row">
                <h2>{active.name}</h2>
                <span className="combat-class-badge">{active.combatClass || active.occupation}</span>
                <span className="combat-cr-badge">CR {active.cr}</span>
              </div>
            </div>
            <div className="combat-hp-workbench">
              <div className="combat-hp-readout">
                <span>HIT POINTS {active.hitDice ? `(${active.hitDice})` : ""}</span>
                <strong>{active.hp} <small>/ {active.maxHp} HP</small></strong>
              </div>
              <div className="combat-hp-buttons">
                <button className="button button-small button-white" disabled={active.hp <= 0 || saving} onClick={() => adjustHp(active, -5)}>-5</button>
                <button className="button button-small button-white" disabled={active.hp <= 0 || saving} onClick={() => adjustHp(active, -1)} aria-label="Damage 1 HP">-1</button>
                <button className="button button-small button-white" disabled={active.hp >= active.maxHp || saving} onClick={() => adjustHp(active, 1)} aria-label="Heal 1 HP">+1</button>
                <button className="button button-small button-white" disabled={active.hp >= active.maxHp || saving} onClick={() => adjustHp(active, 5)}>+5</button>
                <button className="button button-small button-white" disabled={active.hp === active.maxHp || saving} onClick={() => void onUpdateCharacter(active.id, { hp: active.maxHp })} title="Restore full HP">
                  <RotateCcw size={12} />Full
                </button>
                <button className="button button-small button-white" onClick={() => onEditCharacter(active)}>
                  <Pencil size={12} />Edit
                </button>
              </div>
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

          <div className="quick-stats combat-quick-stats">
            <div className="quick-stat">
              <span><Shield size={12} />Armour class</span>
              <strong>{active.ac}<small>{active.wornEquipment && active.wornEquipment !== "No armour or shield" ? active.wornEquipment : "AC"}</small></strong>
            </div>
            <div className="quick-stat">
              <span><Wind size={13} />Movement & senses</span>
              <strong className="combat-movement-value">{active.movement || active.speed}</strong>
            </div>
            <div className="quick-stat">
              <span><Eye size={13} />Passive Perception</span>
              <strong>{active.passive}<small>Prof {active.proficiencyBonus || "+2"}</small></strong>
            </div>
            <div className="quick-stat">
              <span>Saving throws</span>
              <strong className="combat-saves-value">{active.savingThrows || "None"}</strong>
            </div>
            <div className="quick-stat">
              <span>Resistances</span>
              <strong className="combat-saves-value">{active.resistances || "None"}</strong>
            </div>
          </div>

          <div className="session-content combat-sheet-grid">
            <div className="session-column">
              <section className="sheet-section">
                <h3><Swords size={14} />Ability scores & modifiers</h3>
                <div className="ability-scores combat-ability-scores">
                  {abilityNames.map(a => (
                    <div key={a}>
                      <span>{a}</span>
                      <strong>{active.abilities[a]}</strong>
                      <small>{signed(modifier(active.abilities[a]))}</small>
                    </div>
                  ))}
                </div>
                <div className="skills-line">
                  <span>Trained skills</span>
                  <p>{active.skills || "No trained skills"}</p>
                </div>
              </section>

              <section className="sheet-section wants-section">
                <h3><Shield size={14} />Ancestry & combat traits</h3>
                <p className="combat-trait-paragraph">
                  {active.ancestryTraits || "No special ancestry combat traits registered."}
                </p>
              </section>

              <section className="sheet-section wants-section">
                <h3><Flame size={14} />Combat demeanor & morale</h3>
                <dl className="reference-list">
                  <div>
                    <dt>Under threat</dt>
                    <dd>{active.threatResponse || "Avoids unnecessary fights if possible."}</dd>
                  </div>
                  <div>
                    <dt>In conflict</dt>
                    <dd>{active.conflict}</dd>
                  </div>
                  <div>
                    <dt>Stress response</dt>
                    <dd>{active.stress}</dd>
                  </div>
                  <div>
                    <dt>Voice in battle</dt>
                    <dd className="voice-cue">“{active.voice}.”</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="session-column right-session-column">
              <section className="sheet-section">
                <h3><Swords size={14} />Weapons & attacks</h3>
                <div className="combat-attack-card primary-attack-card">
                  <div className="attack-card-title">
                    <strong>{active.attack.split("·")[0].trim()}</strong>
                    <span>PRIMARY ATTACK</span>
                  </div>
                  <p>{active.attack.split("·").slice(1).join(" · ").trim() || active.attack}</p>
                </div>
                {active.sidearm && (
                  <div className="combat-attack-card sidearm-attack-card">
                    <div className="attack-card-title">
                      <strong>{active.sidearm.split("·")[0].trim()}</strong>
                      <span>SIDEARM / ALTERNATE</span>
                    </div>
                    <p>{active.sidearm.split("·").slice(1).join(" · ").trim() || active.sidearm}</p>
                  </div>
                )}
                {active.bonusActions && active.bonusActions !== "None" && (
                  <div className="combat-attack-card bonus-action-card">
                    <div className="attack-card-title">
                      <strong>Bonus actions & reactions</strong>
                      <span>ACTION ECONOMY</span>
                    </div>
                    <p>{active.bonusActions}</p>
                  </div>
                )}
              </section>

              <section className="sheet-section appearance-section">
                <h3><WandSparkles size={14} />Spells & additional actions</h3>
                {active.spellcasting ? (
                  <div className="combat-spellcasting-box">
                    <div className="spellcasting-header-line">
                      <Sparkles size={13} />
                      <strong>{active.spellcasting.split("—")[0].trim()}</strong>
                    </div>
                    {active.spellcasting.includes("—") && (
                      <p className="spellcasting-subtext">{active.spellcasting.split("—").slice(1).join("—").trim()}</p>
                    )}
                  </div>
                ) : null}

                {actionItems.length > 0 || spellItems.length > 0 ? (
                  <>
                    <span className="combat-sub-kicker">Click an action or spell to mark as used this encounter:</span>
                    <div className="combat-action-pills">
                      {Array.from(new Set([...actionItems, ...spellItems])).map(item => {
                        const used = activeUsed.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`combat-action-pill ${used ? "is-used" : ""}`}
                            onClick={() => toggleActionUsed(active.id, item)}
                            aria-pressed={used}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="combat-trait-paragraph">No spells or additional special actions registered.</p>
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
