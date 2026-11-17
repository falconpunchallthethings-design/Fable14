"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowDownWideNarrow, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, CircleCheck, CircleHelp, CornerDownRight, Feather, FolderOpen, Keyboard, Loader2, MapPin, Maximize2, Moon, PanelLeft, Plus, Search, Settings2, ShieldCheck, Sparkles, Star, Sun, Swords, Upload, UsersRound, X } from "lucide-react";
import { Character, Collection, getCollectionPath, matchesCollectionFilter, normalizeCharacter, parseCharacterText } from "@/lib/characters";
import { downloadFile } from "@/lib/exports";
import CharacterSheet, { SheetTab } from "@/components/character-sheet";
import CombatMode from "@/components/combat-mode";
import { CharacterEditor, CollectionsDialog, ExportDialog, ImportDialog, Modal } from "@/components/dialogs";

type ModalName = "new" | "edit" | "import" | "export" | "collections" | "settings" | "help" | "delete" | null;
type Toast = { text: string; error?: boolean } | null;

export default function FableApp({ initialCharacters, initialCollections }: { initialCharacters: Character[]; initialCollections: Collection[] }) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [collections, setCollections] = useState(initialCollections);
  const [selectedId, setSelectedId] = useState(initialCharacters.find(c => c.id === "edic-dorianon")?.id || initialCharacters[0]?.id || "");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionId, setCollectionId] = useState("all");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [initialParentId, setInitialParentId] = useState<string>("");
  const [sort, setSort] = useState("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [tab, setTab] = useState<SheetTab>("session");
  const [modal, setModal] = useState<ModalName>(null);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [focused, setFocused] = useState(false);
  const [combatMode, setCombatMode] = useState(false);
  const [combatantIds, setCombatantIds] = useState<string[]>(() => {
    const defaults = ["ariun-silverleaf", "captain-varek", "nyx-ashveil"].filter(id => initialCharacters.some(c => c.id === id));
    return defaults.length ? defaults : initialCharacters.slice(0, 2).map(c => c.id);
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [worldName, setWorldName] = useState("Rimel & Almateira");
  const [comfortable, setComfortable] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = characters.find(c => c.id === selectedId) || characters[0];
  const favoriteCount = characters.filter(c => c.favorite).length;
  const filtered = characters.filter(
    c =>
      (!favoritesOnly || c.favorite) &&
      matchesCollectionFilter(c.collectionId, collectionId, collections) &&
      `${c.name} ${c.ancestry} ${c.occupation} ${c.location} ${c.combatClass} ${c.traits.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "location") filtered.sort((a, b) => a.location.localeCompare(b.location));

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("fable-preferences") || "{}");
      if (typeof preferences.worldName === "string") setWorldName(preferences.worldName);
      if (preferences.comfortable) setComfortable(true);
      if (typeof preferences.darkMode === "boolean") setDarkMode(preferences.darkMode);
    } catch { /* Default preferences are safe when storage is unavailable. */ }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode(prev => {
      const next = !prev;
      try {
        const preferences = JSON.parse(localStorage.getItem("fable-preferences") || "{}");
        localStorage.setItem("fable-preferences", JSON.stringify({ ...preferences, darkMode: next }));
      } catch { /* ignore storage errors */ }
      return next;
    });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.error ? 6500 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (modal) return;
        setFocused(false);
        setCombatMode(false);
        window.setTimeout(() => searchRef.current?.focus(), 30);
      }
      if (e.key === "Escape" && !modal) {
        setFocused(false);
        setCombatMode(false);
        setSortOpen(false);
        setSidebarOpen(false);
        searchRef.current?.blur();
      }
      if ((focused || combatMode) && !modal && ["[", "]"].includes(e.key) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
        const pool = combatMode && combatantIds.length
          ? combatantIds.map(id => characters.find(c => c.id === id)).filter((c): c is Character => Boolean(c))
          : characters;
        if (!pool.length) return;
        const index = pool.findIndex(c => c.id === selectedId);
        const next = (index + (e.key === "]" ? 1 : -1) + pool.length) % pool.length;
        if (pool[next]) {
          setSelectedId(pool[next].id);
          setTab("session");
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [modal, focused, combatMode, combatantIds, characters, selectedId]);

  async function request(url: string, method: string, data?: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
    return result;
  }

  async function updateCharacter(id: string, updates: Partial<Character>) {
    setPending(n => n + 1);
    try {
      const saved = await request(`/api/characters/${id}`, "PATCH", updates) as Character;
      setCharacters(previous => previous.map(c => c.id === id ? saved : c));
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t save your changes.", error: true });
      return false;
    } finally {
      setPending(n => n - 1);
    }
  }

  async function saveCharacter(profile: Character) {
    if (!profile.name.trim()) {
      setToast({ text: "Give your character a name in The basics first.", error: true });
      return false;
    }
    if (modal === "edit" && selected) {
      const ok = await updateCharacter(selected.id, profile);
      if (ok) {
        setModal(null);
        setToast({ text: "Character updated. Ready for the next encounter." });
      }
      return ok;
    }
    setPending(n => n + 1);
    try {
      const saved = await request("/api/characters", "POST", profile) as Character;
      setCharacters(previous => [...previous, saved]);
      setSelectedId(saved.id);
      setTab("session");
      setQuery("");
      setFavoritesOnly(false);
      setCollectionId("all");
      setModal(null);
      setToast({ text: `${saved.name} has joined your world.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t create this character.", error: true });
      return false;
    } finally {
      setPending(n => n - 1);
    }
  }

  async function duplicateCharacter() {
    if (!selected) return;
    setPending(n => n + 1);
    try {
      const saved = await request("/api/characters", "POST", { ...selected, name: `${selected.name} (copy)`, favorite: false, notes: [] }) as Character;
      setCharacters(previous => [...previous, saved]);
      setSelectedId(saved.id);
      setTab("session");
      setFavoritesOnly(false);
      setCollectionId("all");
      setQuery("");
      setToast({ text: "Character duplicated. Make this version your own." });
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t duplicate the character.", error: true });
    } finally {
      setPending(n => n - 1);
    }
  }

  async function deleteCharacter() {
    if (!selected) return;
    setPending(n => n + 1);
    try {
      await request(`/api/characters/${selected.id}`, "DELETE");
      const remaining = characters.filter(c => c.id !== selected.id);
      setCharacters(remaining);
      setCombatantIds(prev => prev.filter(id => id !== selected.id));
      setSelectedId(remaining[0]?.id || "");
      setModal(null);
      setToast({ text: "Character removed from your library." });
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t delete the character.", error: true });
    } finally {
      setPending(n => n - 1);
    }
  }

  async function importCharacters(text: string) {
    setPending(n => n + 1);
    const savedCharacters: Character[] = [];
    try {
      let profiles: Character[];
      let sourceCollections: Collection[] = [];
      if (/^[{[]/.test(text.trim())) {
        const raw = JSON.parse(text);
        const list = Array.isArray(raw) ? raw : Array.isArray(raw.characters) ? raw.characters : [raw];
        if (!list.length || list.length > 100) throw new Error("Please import between 1 and 100 characters at a time.");
        profiles = list.map(normalizeCharacter);
        if (Array.isArray(raw.collections)) {
          sourceCollections = raw.collections
            .filter((c: unknown): c is Collection => !!c && typeof c === "object" && typeof (c as Collection).id === "string" && typeof (c as Collection).name === "string" && !!(c as Collection).name.trim())
            .slice(0, 50);
        }
      } else {
        profiles = [parseCharacterText(text)];
      }
      const availableCollections = [...collections];
      const collectionMapping = new Map<string, string>();
      const roots = sourceCollections.filter(c => !c.parentId);
      const children = sourceCollections.filter(c => Boolean(c.parentId));
      for (const source of [...roots, ...children]) {
        const mappedParent = source.parentId ? collectionMapping.get(source.parentId) ?? source.parentId : null;
        let target = availableCollections.find(
          c =>
            c.name.toLowerCase() === source.name.toLowerCase() ||
            (source.name.toLowerCase().includes("rimel") && c.id === "rimel") ||
            (source.name.toLowerCase().includes("frontier") && c.id === "frontier")
        );
        if (!target) {
          target = await request("/api/collections", "POST", { name: source.name, color: source.color, parentId: mappedParent }) as Collection;
          availableCollections.push(target);
          const created = target;
          setCollections(previous => [...previous, created]);
        }
        collectionMapping.set(source.id, target.id);
      }
      for (const profile of profiles) {
        if (collectionMapping.has(profile.collectionId)) profile.collectionId = collectionMapping.get(profile.collectionId)!;
        if (!availableCollections.some(c => c.id === profile.collectionId)) {
          const byLocation = availableCollections.find(c => profile.location && c.name.toLowerCase() === profile.location.toLowerCase());
          profile.collectionId = byLocation?.id || (collectionId !== "all" ? collectionId : availableCollections[0]?.id || "");
        }
        const saved = await request("/api/characters", "POST", profile) as Character;
        savedCharacters.push(saved);
      }
      setCharacters(previous => [...previous, ...savedCharacters]);
      setSelectedId(savedCharacters[0].id);
      setQuery("");
      setTab("session");
      setFavoritesOnly(false);
      setCollectionId("all");
      setModal(null);
      setToast({ text: `${savedCharacters.length === 1 ? savedCharacters[0].name : `${savedCharacters.length} characters`} imported. The whole story is preserved.` });
      return true;
    } catch (e) {
      if (savedCharacters.length) setCharacters(previous => [...previous, ...savedCharacters]);
      setToast({ text: e instanceof Error ? e.message : "Could not read this character profile.", error: true });
      return false;
    } finally {
      setPending(n => n - 1);
    }
  }

  async function createCollection(name: string, color: string, parentId: string | null) {
    try {
      const saved = await request("/api/collections", "POST", { name, color, parentId }) as Collection;
      setCollections(previous => [...previous, saved]);
      setToast({ text: `“${name}” is ready for its cast.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t create the location folder.", error: true });
      return false;
    }
  }

  function chooseCollection(id: string) {
    setCollectionId(id);
    setFavoritesOnly(false);
    setQuery("");
    setCombatMode(false);
    setSidebarOpen(false);
    setModal(null);
    const first = characters.find(c => matchesCollectionFilter(c.collectionId, id, collections));
    if (first) {
      setSelectedId(first.id);
      setTab("session");
    }
  }

  function toggleCombatant(id: string) {
    setCombatantIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (selectedId === id && next.length) setSelectedId(next[0]);
        return next;
      }
      return [...prev, id];
    });
  }

  function openCombatForCurrent() {
    if (selected && !combatantIds.includes(selected.id)) {
      setCombatantIds(prev => [selected.id, ...prev]);
    }
    setFocused(false);
    setCombatMode(true);
    setSidebarOpen(false);
  }

  const selectCharacter = (id: string) => {
    setSelectedId(id);
    setTab("session");
  };

  const rootCollections = collections.filter(c => !c.parentId);

  return (
    <div className={`app-shell ${focused ? "is-focused" : ""} ${combatMode ? "is-combat-mode" : ""} ${sidebarOpen ? "mobile-nav-open" : ""} ${comfortable ? "comfortable" : ""} ${darkMode ? "dark-mode" : ""}`}>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className="sidebar">
        <button className="brand" aria-label="Fable home" onClick={() => chooseCollection("all")}>
          <span className="brand-mark"><BookOpen size={30} strokeWidth={1.4} /><Sparkles size={12} /></span>
          <span>fable<span className="brand-period">.</span></span>
        </button>
        <div className="brand-caption">PEOPLE MAKE THE STORY</div>
        <button className="world-switcher" onClick={() => { setSidebarOpen(false); setModal("settings"); }}>
          <span className="world-icon"><Feather size={16} /></span>
          <span><small>YOUR WORLD</small><strong>{worldName}</strong></span>
          <ChevronDown size={13} />
        </button>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={!focused && !combatMode ? "active" : ""} onClick={() => { setCombatMode(false); setFocused(false); chooseCollection("all"); }}>
            <UsersRound size={17} /><span>Characters</span><span className="nav-count">{characters.length}</span>
          </button>
          <button onClick={() => { setInitialParentId(""); setModal("collections"); setSidebarOpen(false); }}>
            <FolderOpen size={17} /><span>Locations & folders</span>
          </button>
          <button className={combatMode ? "active" : ""} onClick={() => { setCombatMode(!combatMode); setFocused(false); setSidebarOpen(false); }}>
            <Swords size={16} /><span>Combat mode</span><span className="nav-count combat-nav-count">{combatantIds.length}</span>
          </button>
          <button onClick={() => { if (selected) { setCombatMode(false); setFocused(true); setTab("session"); setSidebarOpen(false); } else setModal("new"); }}>
            <Maximize2 size={16} /><span>Session mode</span><span className="session-nav-dot" />
          </button>
        </nav>
        <div className="sidebar-rule" />
        <div className="sidebar-section-label collection-label">
          LOCATIONS & SUBLOCATIONS
          <button aria-label="New location or folder" title="New location or sublocation" onClick={() => { setInitialParentId(""); setModal("collections"); }}>
            <Plus size={13} />
          </button>
        </div>
        <nav className="collections-nav" aria-label="Character collections">
          {rootCollections.map(root => {
            const subs = collections.filter(c => c.parentId === root.id);
            const isCollapsed = collapsedFolders[root.id] ?? false;
            const rootCount = characters.filter(c => matchesCollectionFilter(c.collectionId, root.id, collections)).length;
            return (
              <div key={root.id} className="sidebar-folder-group">
                <div className={`sidebar-folder-row ${collectionId === root.id ? "active" : ""}`}>
                  {subs.length > 0 ? (
                    <button
                      type="button"
                      className="folder-collapse-btn"
                      aria-label={isCollapsed ? `Expand ${root.name}` : `Collapse ${root.name}`}
                      onClick={() => setCollapsedFolders(prev => ({ ...prev, [root.id]: !isCollapsed }))}
                    >
                      {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </button>
                  ) : (
                    <span className="folder-collapse-spacer" />
                  )}
                  <button type="button" className="folder-select-btn" onClick={() => chooseCollection(root.id)}>
                    <span className="collection-dot" style={{ background: root.color }} />
                    <span>{root.name}</span>
                    <small>{rootCount}</small>
                  </button>
                  <button
                    type="button"
                    className="folder-add-sub-btn"
                    title={`Add sublocation in ${root.name}`}
                    aria-label={`Add sublocation in ${root.name}`}
                    onClick={() => { setInitialParentId(root.id); setModal("collections"); }}
                  >
                    <Plus size={11} />
                  </button>
                </div>
                {!isCollapsed && subs.length > 0 && (
                  <div className="sidebar-subfolders">
                    {subs.map(sub => {
                      const subCount = characters.filter(c => c.collectionId === sub.id).length;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`sidebar-subfolder-btn ${collectionId === sub.id ? "active" : ""}`}
                          onClick={() => chooseCollection(sub.id)}
                        >
                          <CornerDownRight size={11} />
                          <span>{sub.name}</span>
                          <small>{subCount}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button className="add-collection" onClick={() => { setInitialParentId(""); setModal("collections"); }}>
            <Plus size={13} /><span>New location or sublocation</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-story-card">
            <WorldSketch />
            <h3>Small details.<br />Memorable worlds.</h3>
            <p>A familiar face can become<br />an unforgettable story.</p>
            <span><Feather size={11} />MADE FOR YOUR TABLE</span>
          </div>
          <button className="sidebar-help" onClick={() => setModal("help")}><CircleHelp size={15} />A little guidance<ArrowRight size={13} /></button>
          <div className="workspace-user">
            <span className="user-avatar">GM</span>
            <div><strong>Your workspace</strong><span>Let’s tell a good story.</span></div>
            <button className="icon-button" aria-label="Workspace settings" onClick={() => setModal("settings")}><Settings2 size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button sidebar-toggle" aria-label="Toggle navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><PanelLeft size={17} /></button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{combatMode ? "Combat mode" : collectionId === "all" ? "Characters" : getCollectionPath(collectionId, collections)}</strong>
            <select className="mobile-character-picker" aria-label="Choose a character" value={selected?.id || ""} onChange={e => selectCharacter(e.target.value)}>
              {!characters.length && <option value="">Your characters</option>}
              {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="topbar-right">
            <span className={`save-status ${pending ? "saving" : ""}`}>
              {pending ? <Loader2 size={13} className="spin" /> : <CircleCheck size={13} />}
              {pending ? "Saving changes…" : "All changes saved"}
            </span>
            <span className="topbar-divider" />
            <button
              className="button button-small button-white theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to night mode"}
              title={darkMode ? "Switch to light mode" : "Switch to night mode"}
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              <span>{darkMode ? "Light" : "Night"}</span>
            </button>
            <button className="icon-button" aria-label="Help and keyboard shortcuts" title="Help and keyboard shortcuts" onClick={() => setModal("help")}>
              <CircleHelp size={17} />
            </button>
          </div>
        </header>

        {focused && (
          <div className="session-focus-bar">
            <span><BookOpen size={17} /><strong>At the table</strong><span className="focus-label">SESSION MODE</span></span>
            <div>
              <button className="icon-button" aria-label="Previous character" onClick={() => { const i = characters.findIndex(c => c.id === selected?.id); if (characters.length) selectCharacter(characters[(i - 1 + characters.length) % characters.length].id); }}><ArrowLeft size={16} /></button>
              <select aria-label="Choose character in session mode" value={selected?.id || ""} onChange={e => selectCharacter(e.target.value)}>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="icon-button" aria-label="Next character" onClick={() => { const i = characters.findIndex(c => c.id === selected?.id); if (characters.length) selectCharacter(characters[(i + 1) % characters.length].id); }}><ArrowRight size={16} /></button>
            </div>
            <button className="button button-white button-small" onClick={() => setFocused(false)}><X size={13} />Exit session mode<kbd>esc</kbd></button>
          </div>
        )}

        <main className="main-content">
          {combatMode ? (
            <CombatMode
              characters={characters}
              collections={collections}
              combatantIds={combatantIds}
              activeId={selected?.id || ""}
              onSelectActive={id => setSelectedId(id)}
              onToggleCombatant={toggleCombatant}
              onSetCombatants={setCombatantIds}
              onUpdateCharacter={updateCharacter}
              onEditCharacter={c => { setSelectedId(c.id); setModal("edit"); }}
              onExitCombat={() => setCombatMode(false)}
              saving={pending > 0}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="page-title"><h1>Character library</h1><span>{characters.length} characters</span></div>
                  <p>A cast worth remembering. Indexed by location and ready when the story calls.</p>
                </div>
                <div className="page-actions">
                  <button className="button button-white" onClick={() => setCombatMode(true)}>
                    <Swords size={14} />Combat mode ({combatantIds.length})
                  </button>
                  <button className="button button-white" onClick={() => setModal("import")}><Upload size={14} />Import character</button>
                  <button className="button button-primary" onClick={() => setModal("new")}><Plus size={16} />New character</button>
                </div>
              </div>
              <div className="workspace-body">
                <aside className="character-library" aria-label="Character library">
                  <div className="library-search">
                    <Search size={15} />
                    <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a character…" aria-label="Find a character" />
                    {query ? <button aria-label="Clear search" onClick={() => setQuery("")}><X size={13} /></button> : <kbd>⌘ K</kbd>}
                  </div>
                  <div className="library-filters">
                    <button className={!favoritesOnly ? "active" : ""} onClick={() => setFavoritesOnly(false)}>
                      All characters<span>{characters.filter(c => matchesCollectionFilter(c.collectionId, collectionId, collections)).length}</span>
                    </button>
                    <button className={favoritesOnly ? "active" : ""} onClick={() => { setFavoritesOnly(true); const first = characters.find(c => c.favorite && matchesCollectionFilter(c.collectionId, collectionId, collections)); if (first && !selected?.favorite) selectCharacter(first.id); }}>
                      <Star size={12} />Favorites<span>{favoriteCount}</span>
                    </button>
                  </div>
                  {collectionId !== "all" && (
                    <div className="active-collection-filter">
                      <span><MapPin size={11} />{getCollectionPath(collectionId, collections)}</span>
                      <button aria-label="Clear collection filter" onClick={() => chooseCollection("all")}><X size={11} /></button>
                    </div>
                  )}
                  <div className="library-list-heading">
                    <span>{query ? `${filtered.length} MATCH${filtered.length === 1 ? "" : "ES"}` : favoritesOnly ? "YOUR FAVORITES" : "YOUR CHARACTERS"}</span>
                    <div className="menu-anchor">
                      <button className={`icon-button ${sortOpen ? "pressed" : ""}`} title="Sort characters" aria-label="Sort characters" onClick={() => setSortOpen(!sortOpen)} aria-expanded={sortOpen}><ArrowDownWideNarrow size={14} /></button>
                      {sortOpen && <><button className="menu-dismiss" aria-label="Close sort options" onClick={() => setSortOpen(false)} /><div className="dropdown-menu sort-menu">{[["default", "Default order"], ["name", "Name, A–Z"], ["location", "Location"]].map(([value, label]) => <button key={value} onClick={() => { setSort(value); setSortOpen(false); }}>{label}{sort === value && <Check size={12} />}</button>)}</div></>}
                    </div>
                  </div>
                  <div className="character-list">
                    {filtered.map(c => (
                      <button key={c.id} className={`character-list-item ${selected?.id === c.id ? "selected" : ""}`} onClick={() => selectCharacter(c.id)} aria-current={selected?.id === c.id ? "true" : undefined}>
                        {c.portrait ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.portrait} alt="" className="list-portrait" />
                        ) : null}
                        <span className="list-character-info">
                          <span className="list-character-name">
                            {c.name}
                            <span className="list-item-badges">
                              {combatantIds.includes(c.id) && <Swords size={10} className="in-combat-star" />}
                              {c.favorite && <Star size={10} fill="currentColor" />}
                            </span>
                          </span>
                          <span className="list-character-job">{c.occupation}</span>
                          <span className="list-character-location">{c.ancestry}<span>·</span>{getCollectionPath(c.collectionId, collections)}</span>
                        </span>
                        {selected?.id === c.id && <span className="selected-indicator" />}
                      </button>
                    ))}
                    {!filtered.length && (
                      <div className="library-empty">
                        <Search size={23} />
                        <h3>{favoritesOnly ? "Your favorites live here" : "No familiar faces"}</h3>
                        <p>{favoritesOnly ? "Star a character to keep them close." : "Try another name, place, or occupation."}</p>
                        <button onClick={() => { setQuery(""); setFavoritesOnly(false); setCollectionId("all"); }}>Show all characters<ArrowRight size={12} /></button>
                      </div>
                    )}
                  </div>
                  <button className="library-add" onClick={() => setModal("new")}><Plus size={14} />Add a character</button>
                  <p className="library-bottom-caption">Everyone has a part to play.</p>
                </aside>
                <div className="sheet-workspace">
                  {selected ? (
                    <CharacterSheet
                      key={selected.id}
                      character={selected}
                      collectionName={getCollectionPath(selected.collectionId, collections)}
                      tab={tab}
                      onTab={setTab}
                      onUpdate={updates => updateCharacter(selected.id, updates)}
                      onEdit={() => setModal("edit")}
                      onExport={() => setModal("export")}
                      onDuplicate={() => void duplicateCharacter()}
                      onDelete={() => setModal("delete")}
                      onFocus={() => setFocused(!focused)}
                      focused={focused}
                      saving={pending > 0}
                      inCombat={combatantIds.includes(selected.id)}
                      onToggleCombat={() => toggleCombatant(selected.id)}
                      onOpenCombatMode={openCombatForCurrent}
                    />
                  ) : (
                    <div className="empty-workspace">
                      <BookOpen size={42} strokeWidth={1.2} />
                      <span className="section-kicker">THE FIRST PAGE</span>
                      <h2>Your world starts with someone.</h2>
                      <p>Create a character, or bring a generated profile along.<br />We’ll make room for their story.</p>
                      <button className="button button-primary" onClick={() => setModal("new")}><Plus size={15} />Create your first character</button>
                      <button className="text-button" onClick={() => setModal("import")}>Or import a character<ArrowRight size={13} /></button>
                    </div>
                  )}
                  <div className="workspace-footnote"><span><Sparkles size={13} />Less searching. More storytelling.</span>{selected?.seed && <span>SEED {selected.seed}</span>}</div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {(modal === "new" || modal === "edit") && <CharacterEditor key={modal === "edit" ? selected?.id : "new"} character={modal === "edit" ? selected : undefined} collections={collections} onSave={saveCharacter} onClose={() => setModal(null)} />}
      {modal === "import" && <ImportDialog onImport={importCharacters} onClose={() => setModal(null)} />}
      {modal === "export" && selected && <ExportDialog character={selected} onClose={() => setModal(null)} />}
      {modal === "collections" && <CollectionsDialog collections={collections} characters={characters} initialParentId={initialParentId} onClose={() => setModal(null)} onSelect={chooseCollection} onCreate={createCollection} />}
      {modal === "delete" && selected && (
        <Modal title="Close this character’s chapter?" eyebrow="DELETE CHARACTER" onClose={() => setModal(null)}>
          <div className="modal-body">
            <p className="modal-description"><strong>{selected.name}</strong> and their session notes will be permanently removed. You may want to export a backup first.</p>
            <div className="delete-preview">
              {selected.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.portrait} alt="" width={48} height={55} />
              ) : null}
              <div><strong>{selected.name}</strong><span>{selected.ancestry} · {selected.occupation}</span></div>
            </div>
          </div>
          <footer className="modal-footer">
            <button className="button button-white" onClick={() => setModal("export")}><ArrowDownToLine size={14} />Export first</button>
            <div>
              <button className="button button-white" onClick={() => setModal(null)}>Keep character</button>
              <button className="button button-danger" onClick={() => void deleteCharacter()} disabled={pending > 0}>{pending ? <Loader2 size={13} className="spin" /> : null}Delete character</button>
            </div>
          </footer>
        </Modal>
      )}
      {modal === "help" && <Modal title="A little less prep. A little more play." eyebrow="WELCOME TO FABLE" onClose={() => setModal(null)}><div className="modal-body help-body"><p className="modal-description">Fable keeps the whole person, but brings just the essentials to the table.</p><div className="help-feature"><BookOpen size={19} /><div><h3>One window. One memorable character.</h3><p>The session sheet gives you a voice, a goal, a tell, and quick combat stats. Open the full profile whenever you need the deeper story.</p></div></div><div className="help-feature"><Swords size={19} /><div><h3>Combat mode when the blades come out.</h3><p>Pick which NPCs are fighting, roll initiative, track HP and conditions, and switch between combatants with spells, sidearms, and combat traits in view.</p></div></div><div className="help-feature"><ArrowDownToLine size={19} /><div><h3>Obsidian for GM lore, Kanka for players.</h3><p>Export full Markdown to Obsidian, or copy strictly player-facing rich text into Kanka with secrets, combat stats, and GM notes automatically stripped.</p></div></div><div className="keyboard-shortcuts"><h3><Keyboard size={15} />A few useful shortcuts</h3><div><span>Find a character</span><kbd>⌘ / Ctrl + K</kbd></div><div><span>Exit session or combat mode / close a dialog</span><kbd>Esc</kbd></div><div><span>Previous / next character in session or combat mode</span><span><kbd>[</kbd> <kbd>]</kbd></span></div></div></div><footer className="modal-footer"><span className="subtle-text"><Feather size={13} />People make the story.</span><button className="button button-primary" onClick={() => setModal(null)}>Back to my world<ArrowRight size={14} /></button></footer></Modal>}
      {modal === "settings" && <Modal title="Your little corner of the world" eyebrow="WORKSPACE SETTINGS" onClose={() => setModal(null)}><form onSubmit={e => { e.preventDefault(); try { localStorage.setItem("fable-preferences", JSON.stringify({ worldName, comfortable, darkMode })); } catch { /* The preferences remain available in memory. */ } setModal(null); setToast({ text: "Your workspace preferences are saved." }); }}><div className="modal-body"><label className="form-field"><span>Your world’s name</span><input value={worldName} onChange={e => setWorldName(e.target.value)} maxLength={45} required /></label><div className="settings-density"><span className="input-label">Appearance theme</span><div className="segmented-control"><button type="button" className={!darkMode ? "active" : ""} onClick={() => setDarkMode(false)}>Daylight parchment</button><button type="button" className={darkMode ? "active" : ""} onClick={() => setDarkMode(true)}>Night mode</button></div></div><div className="settings-density"><span className="input-label">Sheet reading size</span><div className="segmented-control"><button type="button" className={!comfortable ? "active" : ""} onClick={() => setComfortable(false)}>Compact</button><button type="button" className={comfortable ? "active" : ""} onClick={() => setComfortable(true)}>Comfortable</button></div><p>Compact keeps the session essentials together. Comfortable gives the text a little more breathing room.</p></div><div className="settings-backup"><ShieldCheck size={24} /><div><h3>Your world is worth keeping.</h3><p>Characters and notes are saved in this workspace’s database. Download a backup before moving to a new workspace.</p><button type="button" className="button button-small button-white" onClick={() => { downloadFile("fable-workspace.json", JSON.stringify({ version: 1, characters, collections }, null, 2), "application/json"); setToast({ text: "Your complete workspace backup is downloading." }); }}><ArrowDownToLine size={13} />Back up workspace<span className="backup-count">{characters.length} NPCs</span></button></div></div></div><footer className="modal-footer"><span className="subtle-text">Preferences are saved on this device.</span><button className="button button-primary" type="submit"><Check size={14} />Save preferences</button></footer></form></Modal>}
      {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.error ? <CircleHelp size={17} /> : <CircleCheck size={17} />}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={14} /></button></div>}
    </div>
  );
}

function WorldSketch() {
  return <svg className="world-sketch" viewBox="0 0 180 105" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth=".8"><path d="M28 80c20-48 84-72 129-37M19 67c28-29 79-46 128-26" strokeDasharray="2 5" opacity=".35" /><ellipse cx="92" cy="55" rx="58" ry="29" transform="rotate(-24 92 55)" opacity=".45" /><path d="m87 20 30 22-5 38-37 10-28-25 6-31 34-14Z" /><path d="m87 20-9 32 39-10-26 29 21 9-34-28-3 38 16-19-44-6 31-13-25-18" /><path d="m87 20 4 51M53 34l64 8M47 65l65 15" opacity=".35" /><path d="m139 19 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm-103 17 1.5 4.5L42 42l-4.5 1.5L36 48l-1.5-4.5L30 42l4.5-1.5L36 36Zm105 42 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><circle cx="119" cy="14" r="1" /><circle cx="25" cy="83" r="1.4" /><circle cx="157" cy="55" r="1" /></g></svg>;
}
