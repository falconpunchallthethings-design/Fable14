"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown, Coins, Copy, Ellipsis, Eye, Feather, Heart, Languages, Loader2, LockKeyhole, MapPin, Maximize2, MessageCircle, Minus, Pencil, Plus, Printer, ScrollText, Shield, Sparkles, Star, Swords, Target, Trash2, WandSparkles, Wind, X } from "lucide-react";
import { Character, CharacterNote, abilityNames, getProfileSections, modifier, signed } from "@/lib/characters";

export type SheetTab = "session" | "profile" | "notes";
type Props = {
  character: Character; collectionName: string; tab: SheetTab; onTab: (tab: SheetTab) => void;
  onUpdate: (updates: Partial<Character>) => Promise<boolean>; onEdit: () => void; onExport: () => void;
  onDuplicate: () => void; onDelete: () => void; onFocus: () => void; focused: boolean; saving: boolean;
  inCombat?: boolean; onToggleCombat?: () => void; onOpenCombatMode?: () => void;
};

export default function CharacterSheet({
  character: c, collectionName, tab, onTab, onUpdate, onEdit, onExport,
  onDuplicate, onDelete, onFocus, focused, saving, inCombat, onToggleCombat, onOpenCombatMode,
}: Props) {
  const [menu, setMenu] = useState(false);
  const additionalList = c.additionalActions
    ? c.additionalActions.split(/\s*;\s*|\s*·\s*/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <article className="character-sheet" aria-label={`${c.name} character sheet`}>
      <header className="character-header">
        {c.portrait ? (
          <div className="portrait-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.portrait} alt={`Portrait of ${c.name}`} className="hero-portrait" />
            <span className="portrait-dot" title="Ready for your next session" />
          </div>
        ) : null}
        <div className="character-heading">
          <div className="sheet-eyebrow"><span className="tiny-dot" />{collectionName || "UNINDEXED"}</div>
          <h2>{c.name}</h2>
          <p className="character-meta">{c.ancestry}<span>·</span>{c.age} years<span>·</span>{c.pronouns}{c.combatClass && c.combatClass !== "Ordinary civilian" ? <><span>·</span><strong className="meta-class">{c.combatClass}</strong></> : null}</p>
          <div className="character-tags">
            <span>{c.occupation}</span>
            <span><MapPin size={11} />{c.location}</span>
            {c.distinguishingFeature && <span>{c.distinguishingFeature}</span>}
          </div>
        </div>
        <div className="character-actions">
          <div className="character-icon-actions">
            {onToggleCombat && (
              <button
                className={`button button-small combat-toggle-chip ${inCombat ? "is-in-combat" : "button-white"}`}
                onClick={onToggleCombat}
                title={inCombat ? "Remove from active combat roster" : "Add to active combat roster"}
              >
                <Swords size={12} />
                {inCombat ? "In combat" : "Fight"}
              </button>
            )}
            <button className={`icon-button favorite-button ${c.favorite ? "is-favorite" : ""}`} onClick={() => void onUpdate({ favorite: !c.favorite })} title={c.favorite ? "Remove from favorites" : "Add to favorites"} aria-label={c.favorite ? "Remove from favorites" : "Add to favorites"}><Star size={18} fill={c.favorite ? "currentColor" : "none"} /></button>
            <div className="menu-anchor">
              <button className={`icon-button ${menu ? "pressed" : ""}`} aria-label="Character actions" onClick={() => setMenu(!menu)} aria-expanded={menu}><Ellipsis size={20} /></button>
              {menu && <><button className="menu-dismiss" aria-label="Close character actions" onClick={() => setMenu(false)} /><div className="dropdown-menu character-menu">
                {onOpenCombatMode && <button onClick={() => { setMenu(false); onOpenCombatMode(); }}><Swords size={14} />Open in combat mode</button>}
                <button onClick={() => { setMenu(false); onDuplicate(); }}><Copy size={14} />Duplicate character</button>
                <button onClick={() => { setMenu(false); window.print(); }}><Printer size={14} />Print / save as PDF</button>
                <button onClick={() => { setMenu(false); onFocus(); }}><Maximize2 size={14} />{focused ? "Leave session mode" : "Enter session mode"}</button>
                <div className="menu-divider" /><button className="danger-text" onClick={() => { setMenu(false); onDelete(); }}><Trash2 size={14} />Delete character</button>
              </div></>}
            </div>
          </div>
          <div className="sheet-action-buttons"><button className="button button-small button-white" onClick={onEdit}><Pencil size={13} />Edit</button><button className="button button-small button-white" onClick={onExport}><ArrowDownToLine size={13} />Export<ChevronDown size={12} /></button></div>
        </div>
      </header>
      <div className="sheet-tabbar">
        <div className="sheet-tabs" role="tablist" aria-label="Character views">
          <button className={tab === "session" ? "active" : ""} onClick={() => onTab("session")} role="tab" aria-selected={tab === "session"}><BookOpen size={14} />Session sheet</button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => onTab("profile")} role="tab" aria-selected={tab === "profile"}><ScrollText size={14} />Full profile</button>
          <button className={tab === "notes" ? "active" : ""} onClick={() => onTab("notes")} role="tab" aria-selected={tab === "notes"}><MessageCircle size={14} />Session notes<span className="tab-count">{c.notes.length}</span></button>
        </div>
        <button className="icon-button expand-sheet" title={focused ? "Exit session mode" : "Expand for session mode"} aria-label={focused ? "Exit session mode" : "Expand for session mode"} onClick={onFocus}>{focused ? <X size={15} /> : <Maximize2 size={15} />}</button>
      </div>
      {tab === "session" && <>
        <div className="quick-stats">
          <div className="quick-stat"><span><Shield size={12} />Armour class</span><strong>{c.ac}<small>AC</small></strong></div>
          <div className="quick-stat hp-stat"><span><Heart size={12} />Hit points</span><div className="hp-value"><strong>{c.hp}<small>/ {c.maxHp}</small></strong><div className="hp-controls"><button aria-label="Decrease hit points" disabled={c.hp <= 0 || saving} onClick={() => void onUpdate({ hp: c.hp - 1 })}><Minus size={10} /></button><button aria-label="Increase hit points" disabled={c.hp >= c.maxHp || saving} onClick={() => void onUpdate({ hp: c.hp + 1 })}><Plus size={10} /></button></div></div></div>
          <div className="quick-stat"><span><Wind size={13} />Speed</span><strong>{c.speed.replace(/\s*ft\.?/, "")}<small>ft</small></strong></div>
          <div className="quick-stat"><span><Eye size={13} />Perception</span><strong>{c.passive}<small>passive</small></strong></div>
          <div className="quick-stat cr-stat"><span>Challenge</span><strong>{c.cr}<small>CR</small></strong></div>
        </div>
        <div className="session-content" role="tabpanel">
          <div className="session-column">
            <section className="sheet-section"><h3><Feather size={14} />Roleplay cues</h3><div className="trait-tags">{c.traits.map(trait => <span key={trait}>{trait}</span>)}</div><dl className="reference-list"><div><dt>First impression</dt><dd>{c.impression}</dd></div><div><dt>Voice</dt><dd className="voice-cue">“{c.voice}.”</dd></div><div><dt>A little tell</dt><dd>{c.habit}</dd></div></dl></section>
            <section className="sheet-section wants-section"><h3><Target size={14} />Wants & worries</h3><div className="goal-callout"><span>RIGHT NOW, THEY WANT TO</span><p>{c.goal}</p></div><dl className="reference-list"><div><dt>Needs</dt><dd>{c.need}</dd></div><div><dt>Flaw</dt><dd>{c.flaw}</dd></div><div><dt>Under pressure</dt><dd>{c.stress}</dd></div>{c.threatResponse && <div><dt>In a fight</dt><dd>{c.threatResponse}</dd></div>}</dl></section>
          </div>
          <div className="session-column right-session-column">
            <section className="sheet-section">
              <h3><Swords size={14} />Combat & abilities</h3>
              <div className="ability-scores">{abilityNames.map(a => <div key={a}><span>{a}</span><strong>{c.abilities[a]}</strong><small>{signed(modifier(c.abilities[a]))}</small></div>)}</div>
              <div className="attack-line"><Swords size={13} /><p><strong>{c.attack.split("·")[0].trim()}</strong><span>{c.attack.split("·").slice(1).join(" · ").trim()}</span></p></div>
              {c.sidearm && (
                <div className="attack-line sidearm-line"><Swords size={12} /><p><strong>{c.sidearm.split("·")[0].trim()} <small>(sidearm)</small></strong><span>{c.sidearm.split("·").slice(1).join(" · ").trim()}</span></p></div>
              )}
              {c.spellcasting && (
                <div className="spellcasting-line">
                  <WandSparkles size={13} />
                  <p>
                    <strong>Spellcasting:</strong> {c.spellcasting}
                  </p>
                </div>
              )}
              {additionalList.length > 0 && (
                <div className="additional-actions-chips">
                  {additionalList.slice(0, 6).map(act => <span key={act}>{act.replace(/^Cast\s+/i, "")}</span>)}
                  {additionalList.length > 6 && <span className="more-chip">+{additionalList.length - 6} more</span>}
                </div>
              )}
              <div className="skills-line">
                <span>Skills</span><p>{c.skills || "No trained skills"}{c.savingThrows && c.savingThrows !== "No save proficiencies" ? ` · Saves: ${c.savingThrows}` : ""}</p>
              </div>
            </section>
            <section className="sheet-section appearance-section"><h3><ScrollText size={14} />Appearance & belongings</h3><p className="appearance-description">{c.appearance}</p><div className="belongings-line"><Coins size={13} /><strong>{c.money}</strong><span className="mini-divider" /><span>{c.equipment}</span></div><div className="language-line"><Languages size={13} /><span>{c.languages}</span><span className="mini-divider" /><span className="background-tag">{c.background}</span>{c.movement && c.movement !== "walk 30 ft." && <><span className="mini-divider" /><span className="background-tag">{c.movement}</span></>}</div></section>
          </div>
        </div>
        <div className="beneath-surface"><Sparkles size={15} /><span>BENEATH THE SURFACE</span><p>{c.secret}</p></div>
        <footer className="sheet-footer"><span><BookOpen size={13} />A whole person. Just the essentials.</span><div className="sheet-footer-links">{onOpenCombatMode && <button onClick={onOpenCombatMode}><Swords size={12} />Combat sheet</button>}<button onClick={() => onTab("profile")}>View full profile<ArrowRight size={13} /></button></div></footer>
      </>}
      {tab === "profile" && <div className="full-profile" role="tabpanel"><div className="full-profile-intro"><span className="section-kicker">THE COMPLETE CHARACTER</span><p>{c.tagline}</p></div><div className="profile-grid">{getProfileSections(c).map(section => <section className="profile-section" key={section.title}><h3>{section.title}</h3><dl>{section.fields.map(([label, value], i) => <div key={`${label}-${i}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div>{c.sourceText && <details className="original-source"><summary>Original imported source</summary><pre>{c.sourceText}</pre></details>}<p className="profile-seed">{c.seed ? `Generation seed: ${c.seed}` : "Made with Fable"}</p></div>}
      {tab === "notes" && <NotesPanel key={c.id} character={c} onUpdate={onUpdate} saving={saving} />}
    </article>
  );
}

function NotesPanel({ character, onUpdate, saving }: { character: Character; onUpdate: Props["onUpdate"]; saving: boolean }) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  async function addNote() {
    if (!text.trim()) return;
    const note: CharacterNote = { id: crypto.randomUUID(), text: text.trim(), date: new Date().toISOString() };
    if (await onUpdate({ notes: [...character.notes, note] })) setText("");
  }
  return <div className="notes-panel" role="tabpanel"><div className="notes-heading"><div><h3>The story so far</h3><p>Little moments, loose threads, and things to remember.</p></div><span><LockKeyhole size={11} />GM only</span></div><form className="note-composer" onSubmit={e => { e.preventDefault(); void addNote(); }}><textarea aria-label="New session note" placeholder={`What happened with ${character.name.split(" ")[0]}?`} value={text} onChange={e => setText(e.target.value)} maxLength={20000} rows={3} /><div><span>Saved with this character, ready for next time.</span><button className="button button-primary button-small" disabled={!text.trim() || saving} type="submit">{saving ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}Add note</button></div></form><div className="notes-list">{[...character.notes].reverse().map(note => <article className="note-card" key={note.id}><div className="note-meta"><span><span className="tiny-dot" />{new Date(note.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</span><div><button className="icon-button" title="Edit note" aria-label="Edit note" onClick={() => { setEditing(note.id); setEditText(note.text); }}><Pencil size={12} /></button><button className="icon-button" title="Delete note" aria-label="Delete note" disabled={saving} onClick={() => void onUpdate({ notes: character.notes.filter(n => n.id !== note.id) })}><Trash2 size={12} /></button></div></div>{editing === note.id ? <div className="note-edit"><textarea aria-label="Edit session note" value={editText} onChange={e => setEditText(e.target.value)} rows={3} /><div><button className="button button-small button-white" onClick={() => setEditing(null)}>Cancel</button><button className="button button-small button-primary" disabled={!editText.trim() || saving} onClick={async () => { if (await onUpdate({ notes: character.notes.map(n => n.id === note.id ? { ...n, text: editText.trim() } : n) })) setEditing(null); }}><Check size={12} />Save note</button></div></div> : <p>{note.text}</p>}</article>)}{!character.notes.length && <div className="notes-empty"><MessageCircle size={28} /><h4>A fresh page</h4><p>Add their first encounter, a promise made, or a secret revealed.</p></div>}</div></div>;
}
