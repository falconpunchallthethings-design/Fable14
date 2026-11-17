"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Castle, Check, CornerDownRight, Copy, Eye, FileJson, FileText, FolderOpen, ImagePlus, Loader2, LockKeyhole, MapPin, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Character, Collection, abilityNames, blankCharacter, matchesCollectionFilter } from "@/lib/characters";
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

export function CharacterEditor({ character, collections, onSave, onClose }: { character?: Character; collections: Collection[]; onSave: (c: Character) => Promise<boolean>; onClose: () => void }) {
  const [form, setForm] = useState<Character>(() => character ? structuredClone(character) : { ...blankCharacter(), collectionId: collections[0]?.id || "" });
  const [tab, setTab] = useState("basics");
  const [busy, setBusy] = useState(false);
  const portraitFileRef = useRef<HTMLInputElement>(null);
  const update = (key: keyof Character, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const field = (label: string, key: keyof Character, placeholder = "", wide = false) => <label className={`form-field ${wide ? "field-wide" : ""}`} key={key}><span>{label}{key === "name" && <b> *</b>}</span><input value={String(form[key] ?? "")} onChange={e => update(key, e.target.value)} placeholder={placeholder} required={key === "name"} maxLength={key === "name" ? 120 : 1000} /></label>;
  const area = (label: string, key: keyof Character, placeholder = "") => <label className="form-field field-wide" key={key}><span>{label}</span><textarea rows={2} value={String(form[key] ?? "")} onChange={e => update(key, e.target.value)} placeholder={placeholder} maxLength={5000} /></label>;
  const numeric = (label: string, key: "ac" | "maxHp" | "passive") => <label className="form-field" key={key}><span>{label}</span><input type="number" min={key === "maxHp" ? 1 : 0} max={9999} value={form[key]} onChange={e => update(key, Number(e.target.value))} required /></label>;

  const topLocations = collections.filter(c => !c.parentId);
  const orderedCollections: { col: Collection; isChild: boolean }[] = [];
  for (const root of topLocations) {
    orderedCollections.push({ col: root, isChild: false });
    for (const child of collections.filter(c => c.parentId === root.id)) {
      orderedCollections.push({ col: child, isChild: true });
    }
  }
  for (const orphan of collections.filter(c => c.parentId && !topLocations.some(r => r.id === c.parentId))) {
    orderedCollections.push({ col: orphan, isChild: false });
  }

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
        {field("Ancestry", "ancestry", "e.g. Sea Elf, Variant Human")}
        <div className="form-row">{field("Age", "age", "34")}{field("Pronouns", "pronouns", "she/her")}</div>
        {field("Occupation", "occupation")}
        {field("Current residence", "location")}
        <label className="form-field">
          <span>Location / Sublocation folder</span>
          <select value={form.collectionId} onChange={e => update("collectionId", e.target.value)}>
            <option value="">Unindexed</option>
            {orderedCollections.map(({ col, isChild }) => (
              <option value={col.id} key={col.id}>
                {isChild ? `↳ ${col.name}` : col.name}
              </option>
            ))}
          </select>
        </label>
        {field("Background", "background")}
        {field("In one sentence", "tagline", "The thing that makes them memorable", true)}
        {area("Appearance", "appearance", "A few distinctive details are all you need.")}
        {field("Distinguishing feature", "distinguishingFeature", "e.g. Slightly webbed fingers")}
        {field("Notable mark", "mark", "e.g. A small tattoo on the collarbone")}
        {field("Languages", "languages")}
        {field("Faith or tradition", "faith")}
      </div>
    </>}
    {tab === "roleplay" && <div className="form-grid"><label className="form-field field-wide"><span>Personality traits <small>separate with commas</small></span><input value={form.traits.join(", ")} onChange={e => update("traits", e.target.value.split(",").map(v => v.trimStart()))} placeholder="Analytical, vigilant, curious" /></label>{field("First impression", "impression")}{field("Voice", "voice")}{field("A little tell or habit", "habit", "Taps a rhythm with their fingers", true)}{area("Current goal", "goal")}{area("Why it matters", "motivation")}{field("What they need", "need")}{field("Main flaw", "flaw")}{area("Under pressure", "stress")}{area("Under physical threat (in a fight)", "threatResponse", "How they react when combat breaks out")}{area("Beneath the surface (GM secret)", "secret")}<label className="form-field field-wide"><span>Values <small>separate with commas</small></span><input value={form.values.join(", ")} onChange={e => update("values", e.target.value.split(",").map(v => v.trimStart()))} /></label></div>}
    {tab === "combat" && <>
      <div className="form-grid combat-form-grid">
        {numeric("Armour class", "ac")}
        {numeric("Maximum hit points", "maxHp")}
        {field("Hit Dice", "hitDice", "1d8")}
        {field("Speed", "speed", "30 ft.")}
        {numeric("Passive Perception", "passive")}
        {field("Challenge rating", "cr", "1/2")}
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        {field("Combat class & tier", "combatClass", "e.g. Warlock · Veteran")}
        {field("Saving throws", "savingThrows", "e.g. INT +5, WIS +2")}
        {field("Movement & senses", "movement", "walk 30 ft. · swim 30 ft. · darkvision 60 ft.")}
        {field("Resistances / immunities", "resistances", "None registered")}
      </div>
      <span className="input-label ability-form-label">Ability scores</span>
      <div className="ability-form">{abilityNames.map(a => <label className="form-field" key={a}><span>{a}</span><input type="number" min={1} max={30} value={form.abilities[a]} onChange={e => update("abilities", { ...form.abilities, [a]: Number(e.target.value) })} /></label>)}</div>
      <div className="form-grid">
        {area("Primary attack", "attack", "Light crossbow · +4 to hit · 1d8 piercing")}
        {area("Sidearm / secondary attack", "sidearm", "Dagger · +5 to hit · 1d4 + 1 piercing")}
        {area("Spellcasting", "spellcasting", "CHA (Save DC 11, spell attack +3) — Spells: armor of agathys, hex, counterspell…")}
        {area("Additional actions & spells (separate with ;)", "additionalActions", "eldritch blast (at-will) ; Cast armor of agathys ; Cast counterspell")}
        {area("Ancestry & combat traits", "ancestryTraits", "Darkvision (60 ft.) · Fey Ancestry · Amphibious")}
        {area("Bonus actions & reactions", "bonusActions", "None")}
        {area("Skills", "skills", "Deception +3, Persuasion +3, Perception +2")}
        {field("Money carried", "money", "5 sp", true)}
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
  return <Modal title="Bring a character along" eyebrow="IMPORT CHARACTER" onClose={onClose}><div className="modal-body"><p className="modal-description">Paste a generated NPC or a plain-text profile. We’ll pull out the essentials (including spells and combat stats) and keep the original, too.</p><label className="form-field"><span>Character text</span><textarea className="import-textarea" rows={11} value={text} onChange={e => { setText(e.target.value); setError(""); }} placeholder={'Ariun Silverleaf\nSea Elf, 631 years (old), he/him, Medium, speed 30 ft\n\nAt a glance\n  First impression: Elegant and refined\n  Voice: quick and teasing\n\nCombat statistics\n  Combat class: Warlock · Veteran\n  Spellcasting: CHA (Combat class. CHA save DC 11, spell attack +3; spells: armor of agathys, hex, counterspell.)'} maxLength={500000} autoFocus /></label><div className="import-file-row"><input type="file" accept=".txt,.md,.json,text/plain,application/json" ref={file} hidden onChange={async e => { const selected = e.target.files?.[0]; if (!selected) return; if (selected.size > 2000000) { setError("Please choose a file smaller than 2 MB."); return; } setText(await selected.text()); setError(""); }} /><button className="button button-white button-small" onClick={() => file.current?.click()}><Upload size={13} />Choose a file</button><span>.txt, .md, or Fable .json backup</span></div>{error && <p className="inline-error">{error}</p>}<div className="help-callout"><Sparkles size={16} /><p>Long profile? Perfect. All the detail stays in the full profile; roleplay cues and combat actions come to the table.</p></div></div><footer className="modal-footer"><span className="subtle-text">Your original text is preserved.</span><div><button className="button button-white" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!text.trim() || busy} onClick={async () => { setBusy(true); try { const ok = await onImport(text); if (!ok) setError("We couldn’t read that profile. Check the text or JSON and try again."); } catch (e) { setError(e instanceof Error ? e.message : "Could not import this profile."); } finally { setBusy(false); } }}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}{busy ? "Importing…" : "Import character"}</button></div></footer></Modal>;
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
  collections, characters, initialParentId = "", onClose, onSelect, onCreate,
}: {
  collections: Collection[];
  characters: Character[];
  initialParentId?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: (name: string, color: string, parentId: string | null) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a6b48c");
  const [parentId, setParentId] = useState<string>(initialParentId);
  const [busy, setBusy] = useState(false);

  const rootLocations = collections.filter(c => !c.parentId);

  return (
    <Modal title="Locations & sublocations" eyebrow="FOLDERS & SUBFOLDERS" onClose={onClose}>
      <div className="modal-body">
        <p className="modal-description">
          Index your cast by kingdoms, cities, and districts—or organize folders and subfolders for each campaign.
        </p>
        <div className="collection-cards">
          {rootLocations.map(root => {
            const sublocations = collections.filter(c => c.parentId === root.id);
            const totalInRoot = characters.filter(c => matchesCollectionFilter(c.collectionId, root.id, collections)).length;
            return (
              <div key={root.id} className="folder-tree-group">
                <button className="folder-root-card" onClick={() => onSelect(root.id)}>
                  <span style={{ background: `${root.color}25`, color: root.color }}>
                    <MapPin size={19} />
                  </span>
                  <div>
                    <strong>{root.name}</strong>
                    <small>{totalInRoot} {totalInRoot === 1 ? "character" : "characters"}{sublocations.length ? ` · ${sublocations.length} sublocations` : ""}</small>
                  </div>
                  <ArrowRight size={15} />
                </button>
                {sublocations.length > 0 && (
                  <div className="subfolder-list">
                    {sublocations.map(sub => {
                      const subCount = characters.filter(c => c.collectionId === sub.id).length;
                      return (
                        <button key={sub.id} className="subfolder-card" onClick={() => onSelect(sub.id)}>
                          <CornerDownRight size={13} />
                          <span className="collection-dot" style={{ background: sub.color }} />
                          <strong>{sub.name}</strong>
                          <small>{subCount}</small>
                        </button>
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
              if (await onCreate(name.trim(), color, parentId || null)) {
                setName("");
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Add a location or sublocation</h3>
          <div className="form-grid">
            <label className="form-field">
              <span>Name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={parentId ? "e.g. Old-World Wine Vaults" : "e.g. Almateira"}
                maxLength={80}
                required
              />
            </label>
            <label className="form-field">
              <span>Parent location (optional)</span>
              <select value={parentId} onChange={e => setParentId(e.target.value)} aria-label="Parent location">
                <option value="">Top-level location / folder</option>
                {rootLocations.map(r => (
                  <option key={r.id} value={r.id}>
                    Sublocation inside {r.name}
                  </option>
                ))}
              </select>
            </label>
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
              {parentId ? "Create sublocation" : "Create location"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function ObsidianIcon() { return <svg width="25" height="28" viewBox="0 0 25 28" fill="none" aria-hidden="true"><path d="M15 1 5 6 1 19l9 8 12-6 2-12L15 1Z" fill="currentColor" opacity=".75" /><path d="m15 1-5 11 0 15 12-6-5-8-2-12Z" fill="currentColor" opacity=".5" /><path d="m5 6 5 6L15 1 5 6Z" fill="currentColor" /></svg>; }
