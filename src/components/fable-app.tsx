"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowDownWideNarrow, ArrowLeft, ArrowRight, Bookmark, BookOpen, Building2, Check, ChevronDown, ChevronRight, CircleCheck, CircleHelp, CornerDownRight, Feather, FolderOpen, Keyboard, Loader2, MapPin, Maximize2, Moon, Palette, PanelLeft, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, Swords, Tag, Type, Upload, UsersRound, X } from "lucide-react";
import { Character, CharacterConnection, Collection, CustomCombatant, EncounterTemplate, LocationKind, ParsedGroupImport, defaultEncounters, formatLegendBadge, getCollectionPath, matchesCollectionFilter, normalizeCharacter, parseCharacterText } from "@/lib/characters";
import { downloadFile } from "@/lib/exports";
import CharacterSheet, { SheetTab } from "@/components/character-sheet";
import CombatMode from "@/components/combat-mode";
import { CharacterEditor, CollectionsDialog, ExportDialog, ImportDialog, Modal } from "@/components/dialogs";

type ModalName = "new" | "edit" | "import" | "export" | "collections" | "settings" | "help" | "delete" | null;
type Toast = { text: string; error?: boolean } | null;
export type ColorTone = "sage" | "amber" | "coastal" | "crimson";
export type TextScale = "standard" | "large" | "xlarge";

export default function FableApp({
  initialCharacters,
  initialCollections,
  initialEncounters = defaultEncounters,
}: {
  initialCharacters: Character[];
  initialCollections: Collection[];
  initialEncounters?: EncounterTemplate[];
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [collections, setCollections] = useState(initialCollections);
  const [encounters, setEncounters] = useState<EncounterTemplate[]>(initialEncounters);
  const [selectedId, setSelectedId] = useState(initialCharacters.find(c => c.id === "edic-dorianon")?.id || initialCharacters[0]?.id || "");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionId, setCollectionId] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [initialParentId, setInitialParentId] = useState<string>("");
  const [initialKind, setInitialKind] = useState<LocationKind>("region");
  const [sort, setSort] = useState("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [tab, setTab] = useState<SheetTab>("session");
  const [modal, setModal] = useState<ModalName>(null);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [focused, setFocused] = useState(false);
  const [combatMode, setCombatMode] = useState(false);
  const [combatantIds, setCombatantIds] = useState<string[]>(() => {
    const defaults = ["daraelle", "ariun-silverleaf", "captain-varek"].filter(id => initialCharacters.some(c => c.id === id));
    return defaults.length ? defaults : initialCharacters.slice(0, 2).map(c => c.id);
  });
  const [customCombatants, setCustomCombatants] = useState<CustomCombatant[]>([]);
  const [initiatives, setInitiatives] = useState<Record<string, number>>({
    daraelle: 16,
    "ariun-silverleaf": 12,
    "captain-varek": 11,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [worldName, setWorldName] = useState("Rimel, Almateira & Ruinholds");
  const [comfortable, setComfortable] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [colorTone, setColorTone] = useState<ColorTone>("sage");
  const [textScale, setTextScale] = useState<TextScale>("large");
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = characters.find(c => c.id === selectedId) || characters[0];
  const favoriteCount = characters.filter(c => c.favorite).length;

  // Collect all unique tags across characters for the filter chip row
  const allTags = Array.from(
    new Set(characters.flatMap(c => c.tags || []).map(t => t.trim()).filter(Boolean))
  ).slice(0, 14);

  const filtered = characters.filter(
    c =>
      (!favoritesOnly || c.favorite) &&
      (!selectedTag || (c.tags || []).some(t => t.toLowerCase() === selectedTag.toLowerCase())) &&
      matchesCollectionFilter(c.collectionId, collectionId, collections) &&
      `${c.name} ${c.ancestry} ${c.occupation} ${c.location} ${c.combatClass} ${c.faith} ${(c.tags || []).join(" ")} ${c.traits.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "location") filtered.sort((a, b) => a.location.localeCompare(b.location));

  // Location Roster: all characters inside the currently selected location (and its sublocations)
  const locationRoster = collectionId !== "all"
    ? characters.filter(c => matchesCollectionFilter(c.collectionId, collectionId, collections))
    : [];

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("fable-preferences") || "{}");
      if (typeof preferences.worldName === "string") setWorldName(preferences.worldName);
      if (preferences.comfortable) setComfortable(true);
      if (typeof preferences.darkMode === "boolean") setDarkMode(preferences.darkMode);
      if (["sage", "amber", "coastal", "crimson"].includes(preferences.colorTone)) setColorTone(preferences.colorTone);
      if (["standard", "large", "xlarge"].includes(preferences.textScale)) setTextScale(preferences.textScale);
    } catch { /* Default preferences are safe when storage is unavailable. */ }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    document.documentElement.setAttribute("data-tone", colorTone);
    document.documentElement.setAttribute("data-scale", textScale);
  }, [darkMode, colorTone, textScale]);

  function savePrefsPatch(patch: Record<string, unknown>) {
    try {
      const preferences = JSON.parse(localStorage.getItem("fable-preferences") || "{}");
      localStorage.setItem("fable-preferences", JSON.stringify({ ...preferences, ...patch }));
    } catch { /* ignore storage errors */ }
  }

  function toggleDarkMode() {
    setDarkMode(prev => {
      const next = !prev;
      savePrefsPatch({ darkMode: next });
      return next;
    });
  }

  function cycleTextScale() {
    setTextScale(prev => {
      const next: TextScale = prev === "standard" ? "large" : prev === "large" ? "xlarge" : "standard";
      savePrefsPatch({ textScale: next });
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
        const poolIds = combatMode && combatantIds.length ? combatantIds : characters.map(c => c.id);
        if (!poolIds.length) return;
        const index = poolIds.indexOf(selectedId);
        const nextIdx = (index + (e.key === "]" ? 1 : -1) + poolIds.length) % poolIds.length;
        if (poolIds[nextIdx]) {
          setSelectedId(poolIds[nextIdx]);
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

  // Automatically resolves or creates a location/sublocation path (e.g. "Durudha > Crossroads > Roadside inn" or "Silent Harbor")
  async function ensureLocationPath(rawLocation: string, currentCols: Collection[]): Promise<{ leafId: string; updatedCols: Collection[] }> {
    const cleaned = rawLocation.trim();
    if (!cleaned) return { leafId: currentCols[0]?.id || "", updatedCols: currentCols };

    const segments = cleaned
      .split(/\s*(?:>|›|\/)\s*/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!segments.length) return { leafId: currentCols[0]?.id || "", updatedCols: currentCols };

    const working = [...currentCols];
    let parentId: string | null = null;
    let lastMatch: Collection | undefined;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segLower = seg.toLowerCase();
      // Match existing collection by exact name, or matching prefix before parentheses, or within same parent
      let found = working.find(
        c =>
          c.name.toLowerCase() === segLower ||
          c.name.toLowerCase().split("(")[0].trim() === segLower.split("(")[0].trim()
      );
      if (!found) {
        const kind: LocationKind =
          i === 0 ? "region" : i === 1 && segments.length >= 3 ? "city" : "sublocation";
        const palette = ["#a6b48c", "#83a7b3", "#ad9cc1", "#c59d7d", "#bc8e91"];
        const color = palette[working.length % palette.length];
        found = (await request("/api/collections", "POST", {
          name: seg,
          color,
          parentId,
          kind,
        })) as Collection;
        working.push(found);
      }
      parentId = found.id;
      lastMatch = found;
    }

    if (working.length !== currentCols.length) {
      setCollections(working);
    }
    return { leafId: lastMatch?.id || working[0]?.id || "", updatedCols: working };
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
    setPending(n => n + 1);
    try {
      let resolvedCollectionId = profile.collectionId;
      // If user typed a new location or nested path (or left folder on Auto-match), auto-create/link it
      const existingCol = collections.find(c => c.id === resolvedCollectionId);
      const locationChanged = !characterMatchesLocation(existingCol, profile.location, collections);
      if (!resolvedCollectionId || locationChanged) {
        const { leafId } = await ensureLocationPath(profile.location, collections);
        if (leafId) resolvedCollectionId = leafId;
      }
      const cleanLocationLabel = profile.location.includes(">") || profile.location.includes("›")
        ? profile.location.split(/\s*(?:>|›)\s*/).pop()!.trim()
        : profile.location;

      const finalProfile = { ...profile, collectionId: resolvedCollectionId, location: cleanLocationLabel };

      if (modal === "edit" && selected) {
        const saved = await request(`/api/characters/${selected.id}`, "PATCH", finalProfile) as Character;
        setCharacters(previous => previous.map(c => c.id === selected.id ? saved : c));
        setModal(null);
        setToast({ text: "Character updated. Ready for the next encounter." });
        return true;
      }

      const saved = await request("/api/characters", "POST", finalProfile) as Character;
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
      setToast({ text: e instanceof Error ? e.message : "Couldn’t save this character.", error: true });
      return false;
    } finally {
      setPending(n => n - 1);
    }
  }

  function characterMatchesLocation(col: Collection | undefined, rawLocation: string, allCols: Collection[]): boolean {
    if (!col) return false;
    if (rawLocation.includes(">") || rawLocation.includes("›") || rawLocation.includes("/")) return false;
    const path = getCollectionPath(col.id, allCols).toLowerCase();
    return path.includes(rawLocation.trim().toLowerCase());
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
      let workingCollections = [...collections];
      const collectionMapping = new Map<string, string>();
      const roots = sourceCollections.filter(c => !c.parentId);
      const children = sourceCollections.filter(c => Boolean(c.parentId));
      for (const source of [...roots, ...children]) {
        const mappedParent = source.parentId ? collectionMapping.get(source.parentId) ?? source.parentId : null;
        let target = workingCollections.find(
          c =>
            c.name.toLowerCase() === source.name.toLowerCase() ||
            (source.name.toLowerCase().includes("rimel") && c.id === "rimel") ||
            (source.name.toLowerCase().includes("frontier") && c.id === "frontier")
        );
        if (!target) {
          target = await request("/api/collections", "POST", { name: source.name, color: source.color, parentId: mappedParent, kind: source.kind }) as Collection;
          workingCollections.push(target);
        }
        collectionMapping.set(source.id, target.id);
      }
      setCollections(workingCollections);

      for (const profile of profiles) {
        if (collectionMapping.has(profile.collectionId)) {
          profile.collectionId = collectionMapping.get(profile.collectionId)!;
        } else if (!workingCollections.some(c => c.id === profile.collectionId) || profile.collectionId === "rimel") {
          if (profile.location) {
            const { leafId, updatedCols } = await ensureLocationPath(profile.location, workingCollections);
            workingCollections = updatedCols;
            profile.collectionId = leafId;
          }
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

  async function importGroup(group: ParsedGroupImport, selectedIndices: number[], customLocationPath: string) {
    setPending(n => n + 1);
    try {
      const { leafId } = await ensureLocationPath(customLocationPath || group.name, collections);
      const selectedSet = new Set(selectedIndices);
      const chosenMembers = group.members.filter(m => selectedSet.has(m.index));

      // First create all chosen characters so they receive IDs
      const indexToSaved = new Map<number, Character>();
      const savedList: Character[] = [];

      for (const m of chosenMembers) {
        const profile: Character = {
          ...m.character,
          collectionId: leafId,
          location: group.name,
        };
        const saved = (await request("/api/characters", "POST", profile)) as Character;
        indexToSaved.set(m.index, saved);
        savedList.push(saved);
      }

      // Now wire up group connections between the imported characters
      const connectionsByIndex = new Map<number, CharacterConnection[]>();
      for (const conn of group.rawConnections) {
        const fromChar = indexToSaved.get(conn.from);
        const toChar = indexToSaved.get(conn.to);
        if (fromChar && toChar) {
          const fromList = connectionsByIndex.get(conn.from) || [];
          fromList.push({
            id: crypto.randomUUID(),
            targetName: toChar.name,
            targetId: toChar.id,
            type: conn.type,
            note: `Encountered together at ${group.name}.`,
          });
          connectionsByIndex.set(conn.from, fromList);

          const toList = connectionsByIndex.get(conn.to) || [];
          toList.push({
            id: crypto.randomUUID(),
            targetName: fromChar.name,
            targetId: fromChar.id,
            type: conn.type,
            note: `Encountered together at ${group.name}.`,
          });
          connectionsByIndex.set(conn.to, toList);
        }
      }

      const finalSaved: Character[] = [];
      for (const m of chosenMembers) {
        const baseSaved = indexToSaved.get(m.index)!;
        const wired = connectionsByIndex.get(m.index);
        if (wired && wired.length) {
          const linkedNames = wired.map(w => `${w.type} ${w.targetName}`).join(", ");
          const updatedBackstory = `${baseSaved.backstory} Connections at ${group.name}: ${linkedNames}.`.trim();
          const patched = (await request(`/api/characters/${baseSaved.id}`, "PATCH", {
            connections: wired,
            backstory: updatedBackstory,
          })) as Character;
          finalSaved.push(patched);
        } else {
          finalSaved.push(baseSaved);
        }
      }

      setCharacters(prev => [...prev, ...finalSaved]);
      if (finalSaved[0]) setSelectedId(finalSaved[0].id);
      if (leafId) setCollectionId(leafId);
      setTab("session");
      setModal(null);
      setToast({ text: `Imported ${finalSaved.length} characters into “${group.name}” with their connections.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Could not import group.", error: true });
      return false;
    } finally {
      setPending(n => n - 1);
    }
  }

  async function createCollection(name: string, color: string, parentId: string | null, kind: LocationKind) {
    try {
      const saved = await request("/api/collections", "POST", { name, color, parentId, kind }) as Collection;
      setCollections(previous => [...previous, saved]);
      setToast({ text: `“${name}” is ready for its cast.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t create the location.", error: true });
      return false;
    }
  }

  async function updateCollection(id: string, updates: Partial<Collection>) {
    try {
      const saved = await request(`/api/collections/${id}`, "PATCH", updates) as Collection;
      setCollections(previous => previous.map(c => c.id === id ? saved : c));
      setToast({ text: `Updated “${saved.name}”.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t update the location.", error: true });
      return false;
    }
  }

  async function deleteCollection(id: string) {
    try {
      const res = await request(`/api/collections/${id}`, "DELETE") as { ok: boolean; fallbackId: string };
      setCollections(previous => {
        const deleted = previous.find(c => c.id === id);
        const fallbackParent = deleted?.parentId ?? null;
        return previous
          .filter(c => c.id !== id)
          .map(c => c.parentId === id ? { ...c, parentId: fallbackParent, kind: (fallbackParent ? "city" : "region") as LocationKind } : c);
      });
      setCharacters(previous =>
        previous.map(c => c.collectionId === id ? { ...c, collectionId: res.fallbackId || "" } : c)
      );
      if (collectionId === id) setCollectionId("all");
      setToast({ text: "Location removed." });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Couldn’t delete the location.", error: true });
      return false;
    }
  }

  async function saveEncounterSetup(enc: Omit<EncounterTemplate, "id"> & { id?: string }) {
    try {
      const saved = (await request("/api/encounters", "POST", enc)) as EncounterTemplate;
      setEncounters(prev => {
        const exists = prev.some(x => x.id === saved.id);
        return exists ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved];
      });
      setToast({ text: `Encounter “${saved.name}” saved.` });
      return true;
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Could not save encounter.", error: true });
      return false;
    }
  }

  async function deleteEncounterSetup(id: string) {
    try {
      await request(`/api/encounters/${id}`, "DELETE");
      setEncounters(prev => prev.filter(x => x.id !== id));
      setToast({ text: "Encounter template removed." });
      return true;
    } catch {
      return false;
    }
  }

  function loadEncounterSetup(enc: EncounterTemplate) {
    setCustomCombatants(enc.customCombatants || []);
    setCombatantIds(enc.combatantIds || []);
    setInitiatives(enc.initiatives || {});
    if (enc.combatantIds?.[0]) {
      setSelectedId(enc.combatantIds[0]);
    }
    setToast({ text: `Loaded encounter: ${enc.name}` });
  }

  function chooseCollection(id: string) {
    setCollectionId(id);
    setFavoritesOnly(false);
    setSelectedTag("");
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
  };

  const rootCollections = collections.filter(c => !c.parentId);

  return (
    <div
      data-tone={colorTone}
      data-scale={textScale}
      className={`app-shell tone-${colorTone} scale-${textScale} ${focused ? "is-focused" : ""} ${combatMode ? "is-combat-mode" : ""} ${sidebarOpen ? "mobile-nav-open" : ""} ${comfortable ? "comfortable" : ""} ${darkMode ? "dark-mode" : ""}`}
    >
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
          <button onClick={() => { setInitialParentId(""); setInitialKind("region"); setModal("collections"); setSidebarOpen(false); }}>
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
          REGIONS, CITIES & PLACES
          <button aria-label="Manage locations" title="Manage regions, cities, and sublocations" onClick={() => { setInitialParentId(""); setInitialKind("region"); setModal("collections"); }}>
            <Plus size={13} />
          </button>
        </div>
        <nav className="collections-nav" aria-label="Character collections">
          {rootCollections.map(region => {
            const children = collections.filter(c => c.parentId === region.id);
            const isCollapsed = collapsedFolders[region.id] ?? false;
            const regionCount = characters.filter(c => matchesCollectionFilter(c.collectionId, region.id, collections)).length;
            return (
              <div key={region.id} className="sidebar-folder-group">
                <div className={`sidebar-folder-row ${collectionId === region.id ? "active" : ""}`}>
                  {children.length > 0 ? (
                    <button
                      type="button"
                      className="folder-collapse-btn"
                      aria-label={isCollapsed ? `Expand ${region.name}` : `Collapse ${region.name}`}
                      onClick={() => setCollapsedFolders(prev => ({ ...prev, [region.id]: !isCollapsed }))}
                    >
                      {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </button>
                  ) : (
                    <span className="folder-collapse-spacer" />
                  )}
                  <button type="button" className="folder-select-btn" onClick={() => chooseCollection(region.id)}>
                    <span className="collection-dot" style={{ background: region.color }} />
                    <span>{region.name}</span>
                    <small>{regionCount}</small>
                  </button>
                  <button
                    type="button"
                    className="folder-add-sub-btn"
                    title={`Add city or place in ${region.name}`}
                    aria-label={`Add city or place in ${region.name}`}
                    onClick={() => { setInitialParentId(region.id); setInitialKind("city"); setModal("collections"); }}
                  >
                    <Plus size={11} />
                  </button>
                </div>
                {!isCollapsed && children.length > 0 && (
                  <div className="sidebar-subfolders">
                    {children.map(child => {
                      const subPlaces = collections.filter(c => c.parentId === child.id);
                      const childCount = characters.filter(c => matchesCollectionFilter(c.collectionId, child.id, collections)).length;
                      return (
                        <div key={child.id} className="sidebar-city-branch">
                          <button
                            type="button"
                            className={`sidebar-subfolder-btn ${collectionId === child.id ? "active" : ""}`}
                            onClick={() => chooseCollection(child.id)}
                          >
                            {child.kind === "city" ? <Building2 size={10} /> : <CornerDownRight size={11} />}
                            <span>{child.name}</span>
                            <small>{childCount}</small>
                          </button>
                          {subPlaces.length > 0 && (
                            <div className="sidebar-grandchild-list">
                              {subPlaces.map(place => {
                                const placeCount = characters.filter(c => c.collectionId === place.id).length;
                                return (
                                  <button
                                    key={place.id}
                                    type="button"
                                    className={`sidebar-subfolder-btn sidebar-place-btn ${collectionId === place.id ? "active" : ""}`}
                                    onClick={() => chooseCollection(place.id)}
                                  >
                                    <CornerDownRight size={10} />
                                    <span>{place.name}</span>
                                    <small>{placeCount}</small>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button className="add-collection" onClick={() => { setInitialParentId(""); setInitialKind("region"); setModal("collections"); }}>
            <Plus size={13} /><span>Manage regions, cities & places</span>
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
              className="button button-small button-white text-scale-btn"
              onClick={cycleTextScale}
              aria-label="Cycle text size"
              title="Click to cycle text size (Standard / Large / Extra Large)"
            >
              <Type size={13} />
              <span>{textScale === "standard" ? "100%" : textScale === "large" ? "115%" : "130%"}</span>
            </button>
            <button
              className="button button-small button-white"
              onClick={() => setModal("settings")}
              aria-label="Appearance and color tones"
              title="Appearance settings & color tones"
            >
              <Palette size={13} />
              <span>Theme</span>
            </button>
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
              customCombatants={customCombatants}
              onSetCustomCombatants={setCustomCombatants}
              initiatives={initiatives}
              onSetInitiatives={setInitiatives}
              encounters={encounters}
              onSaveEncounter={saveEncounterSetup}
              onDeleteEncounter={deleteEncounterSetup}
              onLoadEncounter={loadEncounterSetup}
              activeId={selectedId}
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
                  <p>A cast worth remembering. Indexed by region, city, place, and tags.</p>
                </div>
                <div className="page-actions">
                  <button className="button button-white" onClick={() => setCombatMode(true)}>
                    <Swords size={14} />Combat mode ({combatantIds.length})
                  </button>
                  <button className="button button-white" onClick={() => setModal("import")}><Upload size={14} />Import character / group</button>
                  <button className="button button-primary" onClick={() => setModal("new")}><Plus size={16} />New character</button>
                </div>
              </div>
              <div className="workspace-body">
                <aside className="character-library" aria-label="Character library">
                  <div className="library-search">
                    <Search size={15} />
                    <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a character or tag…" aria-label="Find a character" />
                    {query ? <button aria-label="Clear search" onClick={() => setQuery("")}><X size={13} /></button> : <kbd>⌘ K</kbd>}
                  </div>
                  <div className="library-filters">
                    <button className={!favoritesOnly ? "active" : ""} onClick={() => setFavoritesOnly(false)}>
                      All characters<span>{characters.filter(c => matchesCollectionFilter(c.collectionId, collectionId, collections)).length}</span>
                    </button>
                    <button className={favoritesOnly ? "active" : ""} onClick={() => { setFavoritesOnly(true); const first = characters.find(c => c.favorite && matchesCollectionFilter(c.collectionId, collectionId, collections)); if (first && !selected?.favorite) selectCharacter(first.id); }}>
                      <Bookmark size={11} />Favorites<span>{favoriteCount}</span>
                    </button>
                  </div>

                  {/* Tag Filter Chip Row */}
                  {allTags.length > 0 && (
                    <div className="tag-filter-row" role="region" aria-label="Filter by tag">
                      <button
                        type="button"
                        className={`tag-filter-chip ${!selectedTag ? "active" : ""}`}
                        onClick={() => setSelectedTag("")}
                      >
                        All tags
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-filter-chip ${selectedTag.toLowerCase() === tag.toLowerCase() ? "active" : ""}`}
                          onClick={() => setSelectedTag(selectedTag.toLowerCase() === tag.toLowerCase() ? "" : tag)}
                        >
                          <Tag size={9} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {collectionId !== "all" && (
                    <div className="active-collection-filter">
                      <span><MapPin size={11} />{getCollectionPath(collectionId, collections)}</span>
                      <button aria-label="Clear collection filter" onClick={() => chooseCollection("all")}><X size={11} /></button>
                    </div>
                  )}
                  <div className="library-list-heading">
                    <span>{query || selectedTag ? `${filtered.length} MATCH${filtered.length === 1 ? "" : "ES"}` : favoritesOnly ? "YOUR FAVORITES" : "YOUR CHARACTERS"}</span>
                    <div className="menu-anchor">
                      <button className={`icon-button ${sortOpen ? "pressed" : ""}`} title="Sort characters" aria-label="Sort characters" onClick={() => setSortOpen(!sortOpen)} aria-expanded={sortOpen}><ArrowDownWideNarrow size={14} /></button>
                      {sortOpen && <><button className="menu-dismiss" aria-label="Close sort options" onClick={() => setSortOpen(false)} /><div className="dropdown-menu sort-menu">{[["default", "Default order"], ["name", "Name, A–Z"], ["location", "Location"]].map(([value, label]) => <button key={value} onClick={() => { setSort(value); setSortOpen(false); }}>{label}{sort === value && <Check size={12} />}</button>)}</div></>}
                    </div>
                  </div>
                  <div className="character-list">
                    {filtered.map(c => {
                      const cLegend = formatLegendBadge(c.legendStars);
                      return (
                        <button key={c.id} className={`character-list-item ${selected?.id === c.id ? "selected" : ""}`} onClick={() => selectCharacter(c.id)} aria-current={selected?.id === c.id ? "true" : undefined}>
                          {c.portrait ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.portrait} alt="" className="list-portrait" />
                          ) : null}
                          <span className="list-character-info">
                            <span className="list-character-name">
                              <span className="list-name-text">{c.name}</span>
                              <span className="list-item-badges">
                                {cLegend && (
                                  <span className={`list-legend-chip ${cLegend.isLegend ? "is-legend" : ""}`} title={cLegend.isLegend ? `${c.legendStars}/5 Legend` : `${c.legendStars}/5 stars`}>
                                    {cLegend.starsText}{cLegend.isLegend ? " Legend" : ""}
                                  </span>
                                )}
                                {combatantIds.includes(c.id) && <Swords size={10} className="in-combat-star" />}
                                {c.favorite && <Bookmark size={10} fill="currentColor" />}
                              </span>
                            </span>
                            <span className="list-character-job">{c.occupation}</span>
                            <span className="list-character-location">{c.ancestry}<span>·</span>{getCollectionPath(c.collectionId, collections)}</span>
                          </span>
                          {selected?.id === c.id && <span className="selected-indicator" />}
                        </button>
                      );
                    })}
                    {!filtered.length && (
                      <div className="library-empty">
                        <Search size={23} />
                        <h3>{favoritesOnly ? "Your favorites live here" : "No familiar faces"}</h3>
                        <p>{favoritesOnly ? "Bookmark a character to keep them close." : "Try another name, tag, place, or occupation."}</p>
                        <button onClick={() => { setQuery(""); setSelectedTag(""); setFavoritesOnly(false); setCollectionId("all"); }}>Show all characters<ArrowRight size={12} /></button>
                      </div>
                    )}
                  </div>
                  <button className="library-add" onClick={() => setModal("new")}><Plus size={14} />Add a character</button>
                  <p className="library-bottom-caption">Everyone has a part to play.</p>
                </aside>
                <div className="sheet-workspace">
                  {/* Location Roster Bar when a location is active */}
                  {collectionId !== "all" && locationRoster.length > 0 && (
                    <div className="location-roster-banner" role="region" aria-label="Location roster">
                      <div className="location-roster-head">
                        <span><MapPin size={12} />LOCATION ROSTER · {getCollectionPath(collectionId, collections).toUpperCase()} ({locationRoster.length})</span>
                        <button type="button" onClick={() => chooseCollection("all")}>Show entire world<X size={11} /></button>
                      </div>
                      <div className="location-roster-pills">
                        {locationRoster.map(rc => (
                          <button
                            key={rc.id}
                            type="button"
                            className={`roster-char-pill ${selected?.id === rc.id ? "active" : ""}`}
                            onClick={() => selectCharacter(rc.id)}
                          >
                            <strong>{rc.name}</strong>
                            <span>{rc.occupation}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected ? (
                    <CharacterSheet
                      key={selected.id}
                      character={selected}
                      characters={characters}
                      collections={collections}
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
                      onSelectCharacter={id => selectCharacter(id)}
                      onSelectLocation={locId => chooseCollection(locId)}
                      onSelectTag={tag => setSelectedTag(prev => prev.toLowerCase() === tag.toLowerCase() ? "" : tag)}
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
      {modal === "import" && <ImportDialog onImport={importCharacters} onImportGroup={importGroup} onClose={() => setModal(null)} />}
      {modal === "export" && selected && <ExportDialog character={selected} onClose={() => setModal(null)} />}
      {modal === "collections" && (
        <CollectionsDialog
          collections={collections}
          characters={characters}
          initialParentId={initialParentId}
          initialKind={initialKind}
          onClose={() => setModal(null)}
          onSelect={chooseCollection}
          onCreate={createCollection}
          onUpdate={updateCollection}
          onDelete={deleteCollection}
        />
      )}
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
      {modal === "help" && <Modal title="A little less prep. A little more play." eyebrow="WELCOME TO FABLE" onClose={() => setModal(null)}><div className="modal-body help-body"><p className="modal-description">Fable keeps the whole person, but brings just the essentials to the table.</p><div className="help-feature"><BookOpen size={19} /><div><h3>Clickable mentions & Wiki profile.</h3><p>Mention any saved character or location name in a backstory or note to turn it into a clickable jump link. The Full profile groups sections into 6 collapsible wiki clusters with a sticky table of contents and a local relationship web.</p></div></div><div className="help-feature"><Swords size={19} /><div><h3>Combat mode with PCs, turn order & encounter templates.</h3><p>Add PCs to the battle order, edit initiative numbers directly, reorder turns manually, attach round durations to conditions, and save/reload full encounter setups.</p></div></div><div className="help-feature"><ArrowDownToLine size={19} /><div><h3>Group JSON imports, Obsidian & player-safe Kanka.</h3><p>Paste a generator Group JSON (like a roadside inn or bandit group) to selectively check which NPCs to import and auto-wire their connections.</p></div></div><div className="keyboard-shortcuts"><h3><Keyboard size={15} />A few useful shortcuts</h3><div><span>Find a character</span><kbd>⌘ / Ctrl + K</kbd></div><div><span>Exit session or combat mode / close a dialog</span><kbd>Esc</kbd></div><div><span>Previous / next character in session or combat mode</span><span><kbd>[</kbd> <kbd>]</kbd></span></div></div></div><footer className="modal-footer"><span className="subtle-text"><Feather size={13} />People make the story.</span><button className="button button-primary" onClick={() => setModal(null)}>Back to my world<ArrowRight size={14} /></button></footer></Modal>}
      {modal === "settings" && (
        <Modal title="Appearance, text size & workspace" eyebrow="WORKSPACE SETTINGS" onClose={() => setModal(null)}>
          <form
            onSubmit={e => {
              e.preventDefault();
              savePrefsPatch({ worldName, comfortable, darkMode, colorTone, textScale });
              setModal(null);
              setToast({ text: "Your appearance and workspace preferences are saved." });
            }}
          >
            <div className="modal-body">
              <label className="form-field">
                <span>Your world’s name</span>
                <input value={worldName} onChange={e => setWorldName(e.target.value)} maxLength={45} required />
              </label>

              <div className="settings-density">
                <span className="input-label">Text size & letter scale (no browser zoom needed)</span>
                <div className="segmented-control">
                  <button type="button" className={textScale === "standard" ? "active" : ""} onClick={() => setTextScale("standard")}>
                    Standard (100%)
                  </button>
                  <button type="button" className={textScale === "large" ? "active" : ""} onClick={() => setTextScale("large")}>
                    Large (115%)
                  </button>
                  <button type="button" className={textScale === "xlarge" ? "active" : ""} onClick={() => setTextScale("xlarge")}>
                    Extra Large (130%)
                  </button>
                </div>
                <p>Increases font sizes across sheets, tags, and stat blocks so even the smallest details are crisp on PC or tablet.</p>
              </div>

              <div className="settings-density">
                <span className="input-label">Color tone palette</span>
                <div className="color-tone-grid">
                  {([
                    ["sage", "Sage & Lavender", "Warm parchment, herbal green, and muted plum"],
                    ["amber", "Amber Manuscript", "Archival sepia paper with bronze and ink accents"],
                    ["coastal", "Coastal Slate", "Crisp maritime parchment with sea-glass blue"],
                    ["crimson", "Crimson Grimoire", "Rich scholarly burgundy and antique gold"],
                  ] as const).map(([id, label, desc]) => (
                    <button
                      key={id}
                      type="button"
                      className={`tone-option-card ${colorTone === id ? "selected" : ""}`}
                      onClick={() => setColorTone(id)}
                      aria-pressed={colorTone === id}
                    >
                      <span className={`tone-swatch swatch-${id}`} />
                      <div>
                        <strong>{label}</strong>
                        <small>{desc}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-density">
                <span className="input-label">Lighting mode</span>
                <div className="segmented-control">
                  <button type="button" className={!darkMode ? "active" : ""} onClick={() => setDarkMode(false)}>Daylight parchment</button>
                  <button type="button" className={darkMode ? "active" : ""} onClick={() => setDarkMode(true)}>Night mode</button>
                </div>
              </div>

              <div className="settings-backup">
                <ShieldCheck size={24} />
                <div>
                  <h3>Your world is worth keeping.</h3>
                  <p>Characters, locations, and encounter templates are saved in this workspace’s database.</p>
                  <button
                    type="button"
                    className="button button-small button-white"
                    onClick={() => {
                      downloadFile("fable-workspace.json", JSON.stringify({ version: 2, characters, collections, encounters }, null, 2), "application/json");
                      setToast({ text: "Your complete workspace backup is downloading." });
                    }}
                  >
                    <ArrowDownToLine size={13} />Back up workspace<span className="backup-count">{characters.length} NPCs</span>
                  </button>
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <span className="subtle-text">Preferences are saved on this device.</span>
              <button className="button button-primary" type="submit"><Check size={14} />Save preferences</button>
            </footer>
          </form>
        </Modal>
      )}
      {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.error ? <CircleHelp size={17} /> : <CircleCheck size={17} />}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={14} /></button></div>}
    </div>
  );
}

function WorldSketch() {
  return <svg className="world-sketch" viewBox="0 0 180 105" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth=".8"><path d="M28 80c20-48 84-72 129-37M19 67c28-29 79-46 128-26" strokeDasharray="2 5" opacity=".35" /><ellipse cx="92" cy="55" rx="58" ry="29" transform="rotate(-24 92 55)" opacity=".45" /><path d="m87 20 30 22-5 38-37 10-28-25 6-31 34-14Z" /><path d="m87 20-9 32 39-10-26 29 21 9-34-28-3 38 16-19-44-6 31-13-25-18" /><path d="m87 20 4 51M53 34l64 8M47 65l65 15" opacity=".35" /><path d="m139 19 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm-103 17 1.5 4.5L42 42l-4.5 1.5L36 48l-1.5-4.5L30 42l4.5-1.5L36 36Zm105 42 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><circle cx="119" cy="14" r="1" /><circle cx="25" cy="83" r="1.4" /><circle cx="157" cy="55" r="1" /></g></svg>;
}
