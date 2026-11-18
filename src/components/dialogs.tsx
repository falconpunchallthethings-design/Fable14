"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Building2, Castle, Check, CornerDownRight, Copy, Eye, FileJson, FileText, Globe, ImagePlus, Loader2, LockKeyhole, MapPin, Pencil, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Character, Collection, LocationKind, abilityNames, blankCharacter, matchesCollectionFilter } from "@/lib/characters";
import { downloadFile, filename, toKankaHtml, toMarkdown } from "@/lib/exports";

export function Modal({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timeout = window.setTimeout(() => {
      const element = ref.current?.querySelector<HTMLElement>("input:not([type='file']), textarea, select, button");
      element?.focus();
    }, 50);
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="file"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') || []);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => { window.clearTimeout(timeout); document.body.style.overflow = overflow; document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }}><div className={`modal ${wide ? "modal-wide" : ""}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}><header className="modal-header"><div>{eyebrow && <span className="section-kicker">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header>{children}</div></div>;
}

async function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Invalid image format."));
      img.onload = () => {
        const maxW = 360;
        const maxH = 420;
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result)); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function buildOrderedLocations(collections: Collection[]): { col: Collection; depth: number }[] {
  const result: { col: Collection; depth: number }[] = [];
  const visited = new Set<string>();
  function visit(col: Collection, depth: number) {
    if (visited.has(col.id)) return;
    visited.add(col.id);
    result.push({ col, depth });
    for (const child of collections.filter(c => c.parentId === col.id)) {
      visit(child, depth + 1);
    }
  }
  for (const root of collections.filter(c => !c.parentId)) {
    visit(root, 0);
  }
  for (const leftover of collections) {
    if (!visited.has(leftover.id)) visit(leftover, 0);
  }
  return result;
}

export function CharacterEditor({ character, collections, onSave, onClose }: { character?: Character; collections: Collection[]; onSave: (c: Character) => Promise<boolean>; onClose: () => void }) {
  const [form, setForm] = useState<Character>(() => character ? structuredClone(character) : { ...blankCharacter(), collectionId: collections[0]?.id || "" });
  const [tab, setTab] = useState("basics");
  const [busy, setBusy] = useState(false);
  const portraitFileRef = useRef<HTMLInputElement>(null);
  const update = (key: keyof Character, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const field = (label: string, key: keyof Character, placeholder = "", wide = false) => <label className={`form-field ${wide ? "field-wide" : ""}`} key={key}><span>{label}{key === "name" && <b> *</b>}</span><input value={String(form[key] ?? "")} onChange={e => update(key, e.target.value)} placeholder={placeholder} required={key === "name"} maxLength={key === "name" ? 120 : 1000} /></label>;
  const area = (label: string, key: keyof Character, placeholder = "") => <label className="form-field field-wide" key={key}><span>{label}</span><textarea rows={2} value={String(form[key] ?? "")} onChange={e => update(key, e.target.value)} placeholder={placeholder} maxLength={8000} /></label>;
  const numeric = (label: string, key: "ac" | "maxHp" | "passive") => <label className="form-field" key={key}><span>{label}</span><input type="number" min={key === "maxHp" ? 1 : 0} max={9999} value={form[key]} onChange={e => update(key, Number(e.target.value))} required /></label>;

  const orderedCollections = buildOrderedLocations(collections);

  return <Modal title={character ? `Edit ${character.name.split(" ")[0]}` : "A new face in your world"} eyebrow={character ? "CHARACTER EDITOR" : "CREATE A CHARACTER"} onClose={onClose} wide><form onSubmit={async e => { e.preventDefault(); setBusy(true); const hp = !character || character.hp === character.maxHp ? form.maxHp : Math.min(form.hp, form.maxHp); try { await onSave({ ...form, hp }); } finally { setBusy(false); } }}><div className="editor-tabs" role="tablist"><button type="button" className={tab === "basics" ? "active" : ""} onClick={() => setTab("basics")} role="tab" aria-selected={tab === "basics"}>The basics</button><button type="button" className={tab === "roleplay" ? "active" : ""} onClick={() => setTab("roleplay")} role="tab" aria-selected={tab === "roleplay"}>At the table</button><button type="button" className={tab === "combat" ? "active" : ""} onClick={() => setTab("combat")} role="tab" aria-selected={tab === "combat"}>Combat & spells</button></div><div className="modal-body editor-body">
    {tab === "basics" && <>
      <div className="custom-portrait-box">
        <div className="custom-portrait-preview">
          {form.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.portrait} alt="Character portrait preview" />
          ) : (
            <span className="empty-portrait-badge">No image</span>
          )}
        </div>
        <div className="custom-portrait-controls">
          <span className="input-label">Character image <small>(optional — upload your own, paste a URL, or leave empty)</small></span>
          <div className="custom-portrait-row">
            <input
              type="file"
              accept="image/*"
              ref={portraitFileRef}
              hidden
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await resizeImageFile(file);
                  update("portrait", dataUrl);
                } catch { /* ignore invalid image */ }
              }}
            />
            <button type="button" className="button button-small button-white" onClick={() => portraitFileRef.current?.click()}>
              <ImagePlus size={13} />Upload image
            </button>
            <input
              className="portrait-url-input"
              aria-label="Portrait image URL"
              value={form.portrait.startsWith("data:") ? "" : form.portrait}
              onChange={e => update("portrait", e.target.value)}
              placeholder={form.portrait.startsWith("data:") ? "Uploaded custom image active" : "Or paste an image URL (https://…)"}
            />
            {form.portrait && (
              <button type="button" className="button button-small button-white" onClick={() => update("portrait", "")}>
                <Trash2 size={12} />Leave empty
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="form-grid">
        {field("Character name", "name", "A name worth remembering", true)}
        {field("Ancestry", "ancestry", "e.g. Ghostwise Halfling, Sea Elf")}
        <div className="form-row">{field("Age", "age", "41")}{field("Pronouns", "pronouns", "she/her")}</div>
        {field("Occupation", "occupation")}
        {field("Current residence", "location")}
        <label className="form-field">
          <span>Region / City / Sublocation</span>
          <select value={form.collectionId} onChange={e => update("collectionId", e.target.value)}>
            <option value="">Unindexed</option>
            {orderedCollections.map(({ col, depth }) => (
              <option value={col.id} key={col.id}>
                {depth === 0 ? col.name : depth === 1 ? `↳ ${col.name} (City)` : `    ↳ ${col.name} (Place)`}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Legend distinction stars <small>(3+ = Legend)</small></span>
          <select
            aria-label="Legend distinction stars"
            value={form.legendStars}
            onChange={e => update("legendStars", Number(e.target.value))}
          >
            <option value={0}>0 — None (hidden)</option>
            <option value={1}>1 — ★ (1 star)</option>
            <option value={2}>2 — ★★ (2 stars)</option>
            <option value={3}>3 — ★★★ · Legend</option>
            <option value={4}>4 — ★★★★ · Legend</option>
            <option value={5}>5 — ★★★★★ · Legend</option>
          </select>
        </label>
        {form.legendStars > 0 && field("Legendary distinction summary", "legendDistinction", "Why their mastery, impact, or power stands apart", true)}
        {field("Primary god / deity", "faith", "e.g. Naskyros — The Sunken King")}
        {field("Background", "background")}
        {field("In one sentence", "tagline", "The thing that makes them memorable", true)}
        {area("Appearance", "appearance", "A few distinctive details are all you need.")}
        {field("Distinguishing feature", "distinguishingFeature", "e.g. Fine, quiet features")}
        {field("Notable mark", "mark", "e.g. Freckles across the nose and cheeks")}
        {field("Languages", "languages")}
      </div>
    </>}
    {tab === "roleplay" && <div className="form-grid"><label className="form-field field-wide"><span>Personality traits <small>separate with commas</small></span><input value={form.traits.join(", ")} onChange={e => update("traits", e.target.value.split(",").map(v => v.trimStart()))} placeholder="Aloof, emotionally private, frank" /></label>{field("First impression", "impression")}{field("Voice", "voice")}{field("A little tell or habit", "habit", "Taps a rhythm with their fingers", true)}{area("Current goal", "goal")}{area("Why it matters", "motivation")}{field("What they need", "need")}{field("Main flaw", "flaw")}{area("Under pressure", "stress")}{area("Under physical threat (in a fight)", "threatResponse", "How they react when combat breaks out")}{area("Quest they can offer", "questOffer", "Quest hook, objective, and reward")}{area("Beneath the surface (GM secret)", "secret")}<label className="form-field field-wide"><span>Values <small>separate with commas</small></span><input value={form.values.join(", ")} onChange={e => update("values", e.target.value.split(",").map(v => v.trimStart()))} /></label></div>}
    {tab === "combat" && <>
      <div className="form-grid combat-form-grid">
        {numeric("Armour class", "ac")}
        {numeric("Maximum hit points", "maxHp")}
        {field("Hit Dice", "hitDice", "18d8+18")}
        {field("Speed", "speed", "25 ft.")}
        {numeric("Passive Perception", "passive")}
        {field("Challenge rating", "cr", "12")}
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        {field("Combat class & tier", "combatClass", "e.g. Archmage · Exceptional")}
        {field("Saving throws", "savingThrows", "e.g. INT +7, WIS +4")}
        {field("Movement & senses", "movement", "walk 25 ft.")}
        {field("Resistances / immunities", "resistances", "Magic Resistance (advantage on spell saves)")}
      </div>
      <span className="input-label ability-form-label">Ability scores</span>
      <div className="ability-form">{abilityNames.map(a => <label className="form-field" key={a}><span>{a}</span><input type="number" min={1} max={30} value={form.abilities[a]} onChange={e => update("abilities", { ...form.abilities, [a]: Number(e.target.value) })} /></label>)}</div>
      <div className="form-grid">
        {area("Primary attack", "attack", "Dagger · +8 to hit · 1d4 + 2 piercing")}
        {area("Sidearm / secondary attack", "sidearm", "Dagger · +8 to hit · 1d4 + 2 piercing")}
        {area("Spellcasting", "spellcasting", "INT (Archmage, Save DC 15, spell attack +7) — Spells: fire bolt, shield, fireball, counterspell, meteor swarm…")}
        {area("Spell slots & limited-use resources", "limitedResources", "4×1st-level slot, 3×2nd-level slot, 3×3rd-level slot · Arcane Recovery (1/day)")}
        {area("Additional actions & spells (separate with ;)", "additionalActions", "fire bolt ; mage hand ; Cast shield ; Cast fireball")}
        {area("Template & class features", "classFeatures", "Magic Resistance: advantage on spell saves · Arcane Recovery: recover spell slots 1/day · Relentless: drop to 1 HP instead of 0 (1/long rest)")}
        {area("Ancestry traits", "ancestryTraits", "Lucky: reroll a 1 · Brave: advantage vs. frightened · Halfling Nimbleness")}
        {area("Combat tactics", "combatTactics", "Role: Ranged controller · Positioning: Prefer cover and distance · Target priority: Enemy support")}
        {area("Bonus actions & reactions", "bonusActions", "None")}
        {area("Skills", "skills", "Arcana +7")}
        {field("Money carried", "money", "3 sp, 3 cp", true)}
        {area("Inventory & possessions", "equipment")}
      </div>
    </>}
  </div><footer className="modal-footer"><span className="subtle-text"><LockKeyhole size={12} />Saved to your workspace</span><div><button type="button" className="button button-white" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{busy ? "Saving…" : character ? "Save changes" : "Create character"}</button></div></footer></form></Modal>;
}

export function ImportDialog({ onImport, onClose }: { onImport: (text: string) => Promise<boolean>; onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  return <Modal title="Bring a character along" eyebrow="IMPORT CHARACTER" onClose={onClose}><div className="modal-body"><p className="modal-description">Paste a generated NPC or a plain-text profile. We’ll pull out the essentials (including Legend stars, spells, spell slots, and combat tactics) and keep the original, too.</p><label className="form-field"><span>Character text</span><textarea className="import-textarea" rows={11} value={text} onChange={e => { setText(e.target.value); setError(""); }} placeholder={'Daraelle\nGhostwise Halfling, 41 years (adult), she/her, Small, speed 25 ft\n\nAt a glance\n  First impression: Cool and collected\n  Voice: wry and observant\n\nLegend profile\n  Legend status: Legend-qualified · 5/5 stars'} maxLength={500000} autoFocus /></label><div className="import-file-row"><input type="file" accept=".txt,.md,.json,text/plain,application/json" ref={file} hidden onChange={async e => { const selected = e.target.files?.[0]; if (!selected) return; if (selected.size > 2000000) { setError("Please choose a file smaller than 2 MB."); return; } setText(await selected.text()); setError(""); }} /><button className="button button-white button-small" onClick={() => file.current?.click()}><Upload size={13} />Choose a file</button><span>.txt, .md, or Fable .json backup</span></div>{error && <p className="inline-error">{error}</p>}<div className="help-callout"><Sparkles size={16} /><p>Long profile? Perfect. All the detail stays in the full profile; roleplay cues, Legend distinction, and combat stat blocks come to the table.</p></div></div><footer className="modal-footer"><span className="subtle-text">Your original text is preserved.</span><div><button className="button button-white" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!text.trim() || busy} onClick={async () => { setBusy(true); try { const ok = await onImport(text); if (!ok) setError("We couldn’t read that profile. Check the text or JSON and try again."); } catch (e) { setError(e instanceof Error ? e.message : "Could not import this profile."); } finally { setBusy(false); } }}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}{busy ? "Importing…" : "Import character"}</button></div></footer></Modal>;
}

export function ExportDialog({ character: c, onClose }: { character: Character; onClose: () => void }) {
  const [format, setFormat] = useState<"obsidian" | "kanka" | "json">("obsidian");
  const [full, setFull] = useState(false);
  const [notes, setNotes] = useState(true);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const content = format === "obsidian" ? toMarkdown(c, full, notes) : format === "kanka" ? toKankaHtml(c) : JSON.stringify(c, null, 2);
  async function copy() {
    try {
      if (format === "kanka" && typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([content], { type: "text/html" }), "text/plain": new Blob([content], { type: "text/plain" }) })]);
        setCopied("Rich text copied");
      } else { await navigator.clipboard.writeText(content); setCopied(format === "kanka" ? "HTML copied" : "Copied to clipboard"); }
      setError(""); window.setTimeout(() => setCopied(""), 2500);
    } catch { setError("Clipboard access is unavailable. You can download the file below instead."); }
  }
  function download() {
    if (format === "obsidian") downloadFile(`${filename(c)}.md`, content, "text/markdown;charset=utf-8");
    else if (format === "kanka") downloadFile(`${filename(c)}.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fable character export</title><style>body{max-width:800px;margin:40px auto;padding:20px;font:16px/1.6 system-ui;color:#292b25}h1,h2{font-family:Georgia,serif}li{margin:8px 0}blockquote{border-left:3px solid #8d789f;padding-left:18px;color:#666}</style></head><body>${content}</body></html>`, "text/html;charset=utf-8");
    else downloadFile(`${filename(c)}.json`, content, "application/json");
  }
  return <Modal title="Take the story with you" eyebrow={`EXPORT · ${c.name.toUpperCase()}`} onClose={onClose}><div className="modal-body"><div className="export-formats"><button className={format === "obsidian" ? "selected" : ""} onClick={() => { setFormat("obsidian"); setError(""); }}><ObsidianIcon /><strong>Obsidian</strong><span>Markdown · .md</span></button><button className={format === "kanka" ? "selected" : ""} onClick={() => { setFormat("kanka"); setError(""); }}><Castle size={24} /><strong>Kanka</strong><span>Player-facing · .html</span></button><button className={format === "json" ? "selected" : ""} onClick={() => { setFormat("json"); setError(""); }}><FileJson size={24} /><strong>Backup</strong><span>Everything · .json</span></button></div><p className="export-description">{format === "obsidian" ? "Drop the Markdown file into your GM setting vault. Includes clean headings, NPC tags, and structured properties." : format === "kanka" ? "Player-facing rich text ready to paste into Kanka. Includes appearance, first impression, voice, and public background—never secrets, combat stats, or GM notes." : "A complete, lossless backup, including all profile details and notes. Import it into Fable anytime."}</p>
    {format === "obsidian" && <><div className="export-detail-options"><span className="input-label">What to include</span><div><label className={full ? "" : "selected"}><input type="radio" name="detail" checked={!full} onChange={() => setFull(false)} /><BookOpen size={16} /><span><strong>Session sheet</strong><small>Just the essentials</small></span></label><label className={full ? "selected" : ""}><input type="radio" name="detail" checked={full} onChange={() => setFull(true)} /><FileText size={16} /><span><strong>Full profile</strong><small>Every little detail</small></span></label></div></div><label className="checkbox-label"><input type="checkbox" checked={notes} onChange={e => setNotes(e.target.checked)} />Include session notes<span>{c.notes.length}</span></label></>}
    {format === "kanka" && (
      <div className="kanka-player-safe-banner">
        <Eye size={15} />
        <div>
          <strong>Player-facing only</strong>
          <p>Automatically strips hidden goals, flaws, secrets (“Beneath the surface”), combat statistics, power profiles, and GM session notes.</p>
        </div>
      </div>
    )}
    <div className="export-preview"><div><span>{format === "obsidian" ? "MARKDOWN PREVIEW" : format === "kanka" ? "PLAYER-FACING HTML PREVIEW" : "JSON PREVIEW"}</span><span>ENGLISH</span></div><pre>{content}</pre></div>{error && <p className="inline-error">{error}</p>}</div><footer className="modal-footer export-footer"><span className="subtle-text"><LockKeyhole size={12} />Your world stays yours.</span><div><button className="button button-white" onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied || (format === "kanka" ? "Copy rich text" : "Copy")}</button><button className="button button-primary" onClick={download}><ArrowDownToLine size={14} />Download .{format === "obsidian" ? "md" : format === "kanka" ? "html" : "json"}</button></div></footer></Modal>;
}

export function CollectionsDialog({
  collections, characters, initialParentId = "", initialKind = "region", onClose, onSelect, onCreate, onUpdate, onDelete,
}: {
  collections: Collection[];
  characters: Character[];
  initialParentId?: string;
  initialKind?: LocationKind;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string, color: string, parentId: string | null, kind: LocationKind) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Collection>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a6b48c");
  const [kind, setKind] = useState<LocationKind>(initialParentId ? initialKind : "region");
  const [parentId, setParentId] = useState<string>(initialParentId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#a6b48c");
  const [busy, setBusy] = useState(false);

  const regions = collections.filter(c => !c.parentId);
  const cities = collections.filter(c => c.kind === "city" || (c.parentId && regions.some(r => r.id === c.parentId) && c.kind !== "sublocation"));

  function startEditing(col: Collection) {
    setEditingId(col.id);
    setEditName(col.name);
    setEditColor(col.color);
  }

  async function saveEdit(col: Collection) {
    if (!editName.trim()) return;
    setBusy(true);
    try {
      if (await onUpdate(col.id, { name: editName.trim(), color: editColor })) {
        setEditingId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Regions, cities & sublocations" eyebrow="3-TIER WORLD INDEX" onClose={onClose} wide>
      <div className="modal-body">
        <p className="modal-description">
          Index your characters across three tiers: <strong>Regions</strong> (kingdoms or frontiers), <strong>Cities / Settlements</strong>, and <strong>Sublocations / Places</strong> (inns, shops, archives, or districts). Edit or delete any location at any time.
        </p>

        <div className="collection-cards">
          {regions.map(region => {
            const regionCities = collections.filter(c => c.parentId === region.id && c.kind === "city");
            const directPlaces = collections.filter(c => c.parentId === region.id && c.kind !== "city");
            const totalInRegion = characters.filter(c => matchesCollectionFilter(c.collectionId, region.id, collections)).length;

            return (
              <div key={region.id} className="folder-tree-group">
                <div className="folder-item-row root-row">
                  {editingId === region.id ? (
                    <div className="folder-inline-edit">
                      <input
                        aria-label="Edit location name"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        maxLength={80}
                      />
                      <button type="button" className="button button-small button-primary" disabled={busy} onClick={() => void saveEdit(region)}>
                        <Check size={12} />Save
                      </button>
                      <button type="button" className="button button-small button-white" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button type="button" className="folder-root-card" onClick={() => onSelect(region.id)}>
                        <span style={{ background: `${region.color}25`, color: region.color }}>
                          <Globe size={18} />
                        </span>
                        <div>
                          <strong>{region.name} <em className="tier-pill">Region</em></strong>
                          <small>{totalInRegion} {totalInRegion === 1 ? "character" : "characters"}</small>
                        </div>
                      </button>
                      <div className="folder-row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          title={`Add city in ${region.name}`}
                          aria-label={`Add city in ${region.name}`}
                          onClick={() => { setKind("city"); setParentId(region.id); }}
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title={`Edit ${region.name}`}
                          aria-label={`Edit ${region.name}`}
                          onClick={() => startEditing(region)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title={`Delete ${region.name}`}
                          aria-label={`Delete ${region.name}`}
                          disabled={busy}
                          onClick={() => void onDelete(region.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {(regionCities.length > 0 || directPlaces.length > 0) && (
                  <div className="subfolder-list">
                    {regionCities.map(city => {
                      const cityPlaces = collections.filter(c => c.parentId === city.id);
                      const cityCount = characters.filter(c => matchesCollectionFilter(c.collectionId, city.id, collections)).length;
                      return (
                        <div key={city.id} className="city-tree-branch">
                          <div className="folder-item-row city-row">
                            {editingId === city.id ? (
                              <div className="folder-inline-edit">
                                <input
                                  aria-label="Edit location name"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  maxLength={80}
                                />
                                <button type="button" className="button button-small button-primary" disabled={busy} onClick={() => void saveEdit(city)}>
                                  <Check size={12} />Save
                                </button>
                                <button type="button" className="button button-small button-white" onClick={() => setEditingId(null)}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button type="button" className="subfolder-card city-card" onClick={() => onSelect(city.id)}>
                                  <CornerDownRight size={13} />
                                  <Building2 size={13} />
                                  <strong>{city.name} <em className="tier-pill">City</em></strong>
                                  <small>{cityCount}</small>
                                </button>
                                <div className="folder-row-actions">
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title={`Add sublocation in ${city.name}`}
                                    aria-label={`Add sublocation in ${city.name}`}
                                    onClick={() => { setKind("sublocation"); setParentId(city.id); }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title={`Edit ${city.name}`}
                                    aria-label={`Edit ${city.name}`}
                                    onClick={() => startEditing(city)}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-button"
                                    title={`Delete ${city.name}`}
                                    aria-label={`Delete ${city.name}`}
                                    disabled={busy}
                                    onClick={() => void onDelete(city.id)}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {cityPlaces.length > 0 && (
                            <div className="sublocation-nested-list">
                              {cityPlaces.map(place => {
                                const placeCount = characters.filter(c => c.collectionId === place.id).length;
                                return (
                                  <div key={place.id} className="folder-item-row place-row">
                                    {editingId === place.id ? (
                                      <div className="folder-inline-edit">
                                        <input
                                          aria-label="Edit location name"
                                          value={editName}
                                          onChange={e => setEditName(e.target.value)}
                                          maxLength={80}
                                        />
                                        <button type="button" className="button button-small button-primary" disabled={busy} onClick={() => void saveEdit(place)}>
                                          <Check size={12} />Save
                                        </button>
                                        <button type="button" className="button button-small button-white" onClick={() => setEditingId(null)}>
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button type="button" className="subfolder-card place-card" onClick={() => onSelect(place.id)}>
                                          <CornerDownRight size={12} />
                                          <MapPin size={12} />
                                          <strong>{place.name} <em className="tier-pill">Place</em></strong>
                                          <small>{placeCount}</small>
                                        </button>
                                        <div className="folder-row-actions">
                                          <button
                                            type="button"
                                            className="icon-button"
                                            title={`Edit ${place.name}`}
                                            aria-label={`Edit ${place.name}`}
                                            onClick={() => startEditing(place)}
                                          >
                                            <Pencil size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            className="icon-button"
                                            title={`Delete ${place.name}`}
                                            aria-label={`Delete ${place.name}`}
                                            disabled={busy}
                                            onClick={() => void onDelete(place.id)}
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {directPlaces.map(place => {
                      const placeCount = characters.filter(c => c.collectionId === place.id).length;
                      return (
                        <div key={place.id} className="folder-item-row place-row">
                          {editingId === place.id ? (
                            <div className="folder-inline-edit">
                              <input
                                aria-label="Edit location name"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                maxLength={80}
                              />
                              <button type="button" className="button button-small button-primary" disabled={busy} onClick={() => void saveEdit(place)}>
                                <Check size={12} />Save
                              </button>
                              <button type="button" className="button button-small button-white" onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button type="button" className="subfolder-card place-card" onClick={() => onSelect(place.id)}>
                                <CornerDownRight size={12} />
                                <MapPin size={12} />
                                <strong>{place.name} <em className="tier-pill">Place</em></strong>
                                <small>{placeCount}</small>
                              </button>
                              <div className="folder-row-actions">
                                <button
                                  type="button"
                                  className="icon-button"
                                  title={`Edit ${place.name}`}
                                  aria-label={`Edit ${place.name}`}
                                  onClick={() => startEditing(place)}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  title={`Delete ${place.name}`}
                                  aria-label={`Delete ${place.name}`}
                                  disabled={busy}
                                  onClick={() => void onDelete(place.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          className="new-collection-form"
          onSubmit={async e => {
            e.preventDefault();
            if (!name.trim()) return;
            setBusy(true);
            try {
              const targetParent = kind === "region" ? null : parentId || regions[0]?.id || null;
              if (await onCreate(name.trim(), color, targetParent, kind)) {
                setName("");
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Add a region, city, or sublocation</h3>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <label className="form-field">
              <span>Category tier</span>
              <select
                aria-label="Category tier"
                value={kind}
                onChange={e => {
                  const nextKind = e.target.value as LocationKind;
                  setKind(nextKind);
                  if (nextKind === "region") setParentId("");
                  else if (nextKind === "city") setParentId(regions[0]?.id || "");
                  else if (nextKind === "sublocation") setParentId(cities[0]?.id || regions[0]?.id || "");
                }}
              >
                <option value="region">Region (Kingdom / Frontier)</option>
                <option value="city">City / Settlement</option>
                <option value="sublocation">Sublocation (Shop / Place)</option>
              </select>
            </label>
            <label className="form-field">
              <span>Name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={kind === "region" ? "e.g. The Ruinholds" : kind === "city" ? "e.g. Ashen Bastion" : "e.g. Sunken Spire Archive"}
                maxLength={80}
                required
              />
            </label>
            {kind !== "region" && (
              <label className="form-field">
                <span>Inside parent {kind === "city" ? "region" : "city or region"}</span>
                <select value={parentId} onChange={e => setParentId(e.target.value)} aria-label="Parent location">
                  {kind === "city"
                    ? regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} (Region)
                        </option>
                      ))
                    : [
                        ...cities.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (City)
                          </option>
                        )),
                        ...regions.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Region)
                          </option>
                        )),
                      ]}
                </select>
              </label>
            )}
          </div>
          <div className="collection-form-footer">
            <div className="color-picker" aria-label="Collection color">
              {["#a6b48c", "#c59d7d", "#ad9cc1", "#83a7b3", "#bc8e91"].map(c => (
                <button
                  key={c}
                  type="button"
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Choose ${c}`}
                  aria-pressed={color === c}
                >
                  {color === c && <Check size={12} />}
                </button>
              ))}
            </div>
            <button className="button button-primary button-small" type="submit" disabled={!name.trim() || busy}>
              {busy ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
              {kind === "region" ? "Create region" : kind === "city" ? "Create city" : "Create sublocation"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function ObsidianIcon() { return <svg width="25" height="28" viewBox="0 0 25 28" fill="none" aria-hidden="true"><path d="M15 1 5 6 1 19l9 8 12-6 2-12L15 1Z" fill="currentColor" opacity=".75" /><path d="m15 1-5 11 0 15 12-6-5-8-2-12Z" fill="currentColor" opacity=".5" /><path d="m5 6 5 6L15 1 5 6Z" fill="currentColor" /></svg>; }
