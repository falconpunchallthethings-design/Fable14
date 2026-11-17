export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export type ProfileSection = { title: string; fields: [string, string][] };
export type CharacterNote = { id: string; text: string; date: string };
export type Collection = { id: string; name: string; color: string; parentId?: string | null };
export type Character = {
  id: string; name: string; ancestry: string; age: string; pronouns: string; gender: string;
  occupation: string; location: string; tagline: string; portrait: string; favorite: boolean;
  collectionId: string; seed: string; ac: number; hp: number; maxHp: number; speed: string;
  cr: string; passive: number; abilities: Record<Ability, number>; traits: string[];
  voice: string; impression: string; perceived: string; goal: string; motivation: string;
  complication: string; stakes: string; need: string; vulnerableNeed: string; flaw: string;
  stress: string; conflict: string; habit: string; secret: string; appearance: string;
  height: string; build: string; skin: string; hair: string; eyes: string; mark: string;
  distinguishingFeature: string; clothing: string; background: string; faith: string;
  languages: string; wealth: string; standing: string; values: string[];
  combatClass: string; hitDice: string; proficiencyBonus: string; savingThrows: string;
  wornEquipment: string; attack: string; sidearm: string; additionalActions: string;
  spellcasting: string; bonusActions: string; skills: string; ancestryTraits: string;
  movement: string; resistances: string; threatResponse: string;
  equipment: string; money: string; notes: CharacterNote[]; details: ProfileSection[]; sourceText?: string;
};

export const defaultCollections: Collection[] = [
  { id: "rimel", name: "Rimel", color: "#a6b48c", parentId: null },
  { id: "rimel-stage", name: "Lantern Stage & Market", color: "#a6b48c", parentId: "rimel" },
  { id: "rimel-inn", name: "The Hearthstone Inn", color: "#a6b48c", parentId: "rimel" },
  { id: "rimel-watch", name: "Apothecary & Watchhouse", color: "#a6b48c", parentId: "rimel" },
  { id: "almateira", name: "Almateira", color: "#83a7b3", parentId: null },
  { id: "almateira-port", name: "Old-World Wine Vaults", color: "#83a7b3", parentId: "almateira" },
  { id: "frontier", name: "The Frontier Reach", color: "#c59d7d", parentId: null },
  { id: "frontier-crossroads", name: "Greenway & Crossroads", color: "#c59d7d", parentId: "frontier" },
];

export function getCollectionPath(collectionId: string, collections: Collection[]): string {
  const current = collections.find(c => c.id === collectionId);
  if (!current) return "Unindexed";
  if (!current.parentId) return current.name;
  const parent = collections.find(c => c.id === current.parentId);
  return parent ? `${parent.name} › ${current.name}` : current.name;
}

export function matchesCollectionFilter(characterCollectionId: string, filterId: string, collections: Collection[]): boolean {
  if (filterId === "all") return true;
  if (characterCollectionId === filterId) return true;
  let current = collections.find(c => c.id === characterCollectionId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.parentId)) {
    if (current.parentId === filterId) return true;
    visited.add(current.parentId);
    current = collections.find(c => c.id === current!.parentId);
  }
  return false;
}

export const abilityNames: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const modifier = (value: number) => Math.floor((value - 10) / 2);
export const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;

export function blankCharacter(): Character {
  return {
    id: "", name: "", ancestry: "Human", age: "30", pronouns: "they/them", gender: "Not specified",
    occupation: "Commoner", location: "Rimel", tagline: "Every person has a story worth remembering.",
    portrait: "", favorite: false, collectionId: "rimel", seed: "", ac: 10, hp: 4,
    maxHp: 4, speed: "30 ft", cr: "0", passive: 10,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    traits: ["Curious", "Observant"], voice: "Quiet and considered", impression: "An unfamiliar face with a story to tell",
    perceived: "There is more to them than first meets the eye", goal: "Find their place in the world",
    motivation: "To protect the people and places they care about", complication: "Their responsibilities get in the way",
    stakes: "Their sense of security and belonging", need: "Understanding and being known", vulnerableNeed: "Acceptance and belonging",
    flaw: "Finds it difficult to ask for help", stress: "Becomes quiet and watchful", conflict: "Prefers to find common ground",
    habit: "Pauses to think before answering", secret: "More resourceful than they let on", appearance: "Practical, well-worn clothing with one small personal touch.",
    height: "Average", build: "Average", skin: "", hair: "", eyes: "", mark: "", distinguishingFeature: "", clothing: "Practical everyday clothing",
    background: "Local", faith: "No strong affiliation", languages: "Common", wealth: "Modest", standing: "Local resident",
    values: ["Community", "Loyalty"],
    combatClass: "Ordinary civilian", hitDice: "1d8", proficiencyBonus: "+2", savingThrows: "No save proficiencies",
    wornEquipment: "No armour or shield", attack: "Unarmed strike · +2 to hit · 1 bludgeoning", sidearm: "",
    additionalActions: "", spellcasting: "", bonusActions: "None", skills: "Perception +2",
    ancestryTraits: "", movement: "walk 30 ft.", resistances: "None registered",
    threatResponse: "Avoids unnecessary fights if there is another way out",
    equipment: "Everyday clothes, a small personal keepsake", money: "5 sp", notes: [], details: [],
  };
}

const edic: Character = {
  ...blankCharacter(), id: "edic-dorianon", name: "Edic Dorianon", ancestry: "Variant Human", age: "34",
  pronouns: "she/her", gender: "Woman", occupation: "Musician & performer", location: "Rimel", collectionId: "rimel-stage",
  portrait: "", favorite: true,
  tagline: "Shaped early by one unusual talent or trait that set them apart from other children.", seed: "487644", ac: 11, hp: 4, maxHp: 4,
  abilities: { STR: 10, DEX: 12, CON: 10, INT: 11, WIS: 10, CHA: 13 },
  traits: ["Analytical", "Vigilant", "Curious"], voice: "Dry and understated", impression: "Serious and studious",
  perceived: "Brilliant, but socially unusual", goal: "Stop something from happening",
  motivation: "Feels accountable for what happens around her. Her analytical nature shapes how she pursues it.",
  complication: "Her responsibilities as a performer compete for her time.",
  stakes: "Her security, sense of belonging, and confidence in her own choices.",
  need: "Understanding & being known", vulnerableNeed: "Acceptance & belonging",
  flaw: "Overanalyzes other people’s behavior", stress: "Withdraws completely and goes silent",
  conflict: "Makes it a matter of principle and refuses to move", habit: "Taps a rhythm with her fingers",
  secret: "She’s much funnier than she appears", appearance: "Slender, fair, with black hair and green eyes. Slate-grey layers, warm brown accents, and carefully mended hems.",
  height: "5 ft 5 in / 164 cm", build: "Slender", skin: "Fair", hair: "Black", eyes: "Green",
  mark: "Calloused hands from years of work", clothing: "Theocratic Renaissance fashion; well-worn slate grey with warm brown accents",
  background: "Outlander", faith: "Vesra, the Blooming Hand", languages: "Common, Tabaxi", wealth: "Poor / precarious",
  standing: "Respected local", values: ["Responsibility", "Family"],
  combatClass: "No special class · Ordinary", hitDice: "1d8", proficiencyBonus: "+2", savingThrows: "No save proficiencies",
  wornEquipment: "No armour or shield", attack: "Unarmed strike · +2 to hit · 1 bludgeoning",
  skills: "Acrobatics +3, Performance +3", movement: "walk 30 ft.", resistances: "None registered",
  threatResponse: "Avoids the fight entirely if there’s any way to — though she isn’t really trained for this",
  equipment: "Paper (one sheet), holy symbol (emblem)", money: "5 sp",
  notes: [
    { id: "edic-note-1", text: "Introduce her at the evening performance in Rimel. She notices the party before they notice her.", date: "2026-06-12T18:30:00.000Z" },
    { id: "edic-note-2", text: "Keep her humor understated. A small, perfectly timed observation goes further than a joke.", date: "2026-06-14T15:00:00.000Z" },
  ],
  details: [
    { title: "At a glance", fields: [["Sexual orientation", "Heterosexual"], ["Romantic orientation", "Queer"], ["Temperament", "Intellectual / Observational"]] },
    { title: "Origin & upbringing", fields: [["Birthplace", "Rimel — a kingdom with strong ancestral traditions and frontier communities"], ["Upbringing", "Rimel"], ["Relationship", "Raised in the birthplace community"], ["Origin category", "Political communities"], ["Early life", "Shaped early by one unusual talent or trait that set her apart from other children."]] },
    { title: "Appearance", fields: [["Phenotype context", "Regional phenotype influenced by birthplace: Rimel"], ["Cultural styling", "Rimelian ancestral revival"], ["Materials and finish", "Inexpensive, well-used practical fabrics, visible repairs and simple fastenings; preserve the regional silhouette"], ["Status details", "A neat personal presentation or small community marker"], ["Outfit", "Distinctive without restricting movement: bright, eye-catching clothes meant to be seen from the back row, locally woven cloth with carefully finished borders and layered hems. Mostly slate grey, with warm brown accents; well-worn, patched more than once."]] },
    { title: "Cultural background", fields: [["Tradition", "Rimelian ancestral revival"], ["Connection", "Raised within this tradition; it forms a familiar part of everyday life, though personal practice varies."], ["Clothing style", "Theocratic Renaissance fashion"], ["Materials", "Inexpensive, well-used practical fabrics, visible repairs and simple fastenings"]] },
    { title: "Faith & religion", fields: [["Religious outlook", "Culturally affiliated; familiar customs without requiring strong personal belief"], ["Connection", "Part of inherited customs and community tradition"], ["Aspects", "Agriculture, Fertility, Healing, Seasons, Growth, Redemption"], ["Values informing affinity", "Responsibility, family"]] },
    { title: "Combat statistics", fields: [["Monster composition", "Variant Human · Humanoid · Ordinary civilian · No special class · Ordinary"], ["Template baseline", "Ordinary civilian; occupation-derived baseline"], ["Combat class", "No special class · Ordinary"], ["Power target", "0"], ["CR calculation", "Defensive 0 / Offensive 0 → Final 0. Estimate using the 2014 DMG approach; not encounter balancing."], ["Worn equipment", "No armour or shield"], ["Weapon", "No personal weapon"], ["Hit Dice", "1d8"], ["Proficiency bonus", "+2"], ["Saving throws", "No save proficiencies"], ["Bonus actions / reactions", "None"], ["Ancestry traits", "No additional combat traits registered"], ["Ancestry feature details", "No additional feature details registered. Implemented effects are applied; documented-only or partially implemented traits are not silently added to CR or damage."], ["Ancestry feature flags", "None"], ["Movement & senses", "Walk 30 ft"], ["Resistances / immunities", "None registered"]] },
    { title: "Inventory & possessions", fields: [["Distinctive / magical items", "None particularly notable"], ["Inventory note", "Personal possessions only. Shop stock, temple property, borrowed goods and transported cargo are tracked separately."]] },
    { title: "Traits", fields: [["Analytical · Strong", "Breaks problems into parts and examines how the pieces fit together."], ["Vigilant · Strong", "Constantly monitors surroundings for potential danger, suspicious behavior, or emerging problems."], ["Curious · Strong", "Actively seeks answers, asks questions, and investigates unfamiliar subjects."]] },
    { title: "Self-image", fields: [["Sees herself as", "The Researcher — others see part of it, but not all"], ["Blind spot", "Overestimates her ability in one specific area"], ["Wants to", "Live up to her label more fully"], ["Core tension", "Can she commit to something before she’s sure?"]] },
    { title: "Flaws", fields: [["Second flaw", "Works herself to exhaustion; rooted in curiosity"], ["Quirk", "Loves being photographed"]] },
    { title: "Under pressure", fields: [["Coping", "Hiding somewhere quiet: a rooftop, a library corner, an empty chapel"], ["Under physical threat", "Avoids the fight entirely if there is any way to; she is not trained for this"]] },
    { title: "Habits", fields: [["Also", "Lingers in quiet places after everyone else has left"]] },
    { title: "Heart", fields: [["Romantic style", "Skeptical of romance as a concept, but it keeps happening anyway"]] },
    { title: "Power profile", fields: [["Prominence", "Notable; recognised within her profession or community"], ["Influence visibility", "Underestimated"], ["Strongest source of power", "Social"], ["Personal", "Negligible"], ["Social", "Moderate; respected local, Outlander background"], ["Institutional", "Negligible"], ["Economic", "Negligible; poor / precarious"], ["Informational", "Negligible"], ["What others perceive", "Personal: Negligible · Social: Limited · Institutional: Negligible · Economic: Negligible · Informational: Negligible"]] },
  ],
};

const ariun: Character = {
  ...blankCharacter(), id: "ariun-silverleaf", name: "Ariun Silverleaf", ancestry: "Sea Elf", age: "631",
  pronouns: "he/him", gender: "Man", occupation: "Merchant / Trader — wine and spirits", location: "Almateira",
  collectionId: "almateira-port", portrait: "", favorite: true,
  tagline: "Darkvision, keen senses, trance instead of sleep, resistant to charm. Aquatic elven lineage.",
  seed: "673299", ac: 10, hp: 5, maxHp: 5, speed: "30 ft.", cr: "1/2", passive: 10,
  abilities: { STR: 12, DEX: 10, CON: 10, INT: 16, WIS: 11, CHA: 12 },
  traits: ["Whimsical", "Affectionate", "Dramatic"], voice: "Quick and teasing",
  impression: "Elegant and refined", perceived: "Excitable enthusiast",
  goal: "Explore somewhere unknown",
  motivation: "Wants the people and things he cares about to remain safe. His whimsical nature shapes how he pursues it.",
  complication: "His background as a guild merchant has left expectations he has not entirely escaped.",
  stakes: "Losing some measure of security, belonging, or confidence in his own choices.",
  need: "Understanding and Being Known", vulnerableNeed: "Competence and Mastery",
  flaw: "Needs approval", stress: "Becomes reckless or impulsive (Flare mode)",
  conflict: "Holds grudges and brings up old arguments", habit: "Twists a ring or quill when thinking",
  secret: "He’s much colder than he appears",
  appearance: "Lithe, cool brown skin, dark green hair and green eyes, with slightly webbed fingers and a small collarbone tattoo. Draped rust garments with dusty rose accents.",
  height: "5 ft 8 in (173 cm)", build: "Lithe", skin: "Cool brown", hair: "Dark green", eyes: "Green",
  distinguishingFeature: "Slightly webbed fingers", mark: "A small tattoo on the collarbone",
  clothing: "Almateiran old-world fashion; rust with dusty rose accents",
  background: "Guild Merchant", faith: "Naskyros — The Sunken King", languages: "Common",
  wealth: "Impoverished", standing: "Commoner", values: ["Security", "Family"],
  combatClass: "Warlock · Veteran (Pact magic)", hitDice: "1d8", proficiencyBonus: "+2",
  savingThrows: "INT +5, WIS +2", wornEquipment: "No armour or shield",
  attack: "Light crossbow · +4 to hit · 1d8 piercing (class feature bonus +2 damage) · range 80/320 ft.",
  sidearm: "Dagger · +5 to hit · 1d4 + 1 piercing (class feature bonus +2 damage)",
  additionalActions: "eldritch blast (at-will) ; mage hand (at-will) ; minor illusion (at-will) ; Cast armor of agathys ; Cast hex ; Cast hold person ; Cast invisibility ; Cast counterspell ; Cast fear ; Cast hunger of hadar",
  spellcasting: "CHA (Save DC 11, spell attack +3) — Spells: armor of agathys, charm person, hellish rebuke, hex, hold person, invisibility, misty step, counterspell, fear, hunger of hadar, blight, dimension door",
  bonusActions: "None",
  skills: "Deception +3, Persuasion +3, Perception +2",
  ancestryTraits: "Darkvision (60 ft.) · Fey Ancestry (advantage vs. charmed; immune to magical sleep) · Keen Senses · Trance · Amphibious · Sea Elf Training · Child of the Sea · Friend of the Sea",
  movement: "walk 30 ft. · swim 30 ft. · darkvision 60 ft.",
  resistances: "None registered (Fey Ancestry: advantage vs. charm, immune to magical sleep)",
  threatResponse: "Reacts first and thinks later, fast to anger in a real fight — though clearly out of his depth in a real fight",
  equipment: "Light crossbow [carried] · Dagger [carried] · Artisan’s sample case [carried]",
  money: "4 cp",
  notes: [
    { id: "ariun-note-1", text: "Runs a modest wine-and-spirits stall near the Almateira docks; knows old shipping routes and sea rumors.", date: "2026-06-15T19:00:00.000Z" },
  ],
  details: [
    { title: "At a glance", fields: [["Sexual orientation", "Demisexual"], ["Romantic orientation", "Heteroromantic"], ["Temperament", "Expressive / Energetic"]] },
    { title: "Origin & upbringing", fields: [["Birthplace", "Almateira (A southern kingdom with a strong old-world cultural tradition.)"], ["Upbringing", "Almateira"], ["Relationship", "Raised in the birthplace community"], ["Origin category", "Political communities"]] },
    { title: "Appearance", fields: [["Distinguishing feature", "Slightly webbed fingers"], ["Cultural styling", "Almateiran old-world tradition"], ["Materials and finish", "Threadbare or repeatedly mended local fabrics, reused fastenings and little ornament; preserve the regional silhouette"], ["Status details", "Ordinary local presentation, without assumed rank insignia"], ["Outfit", "Tailored and presentable: neat, presentable clothes chosen to make a good first impression, draped garments and tailored layers using locally woven textiles. Mostly rust, with dusty rose accents; rough and practical, nothing wasted."]] },
    { title: "Cultural background", fields: [["Tradition", "Almateiran old-world tradition"], ["Connection", "Raised within this tradition; it forms a familiar part of everyday life, though personal practice varies."], ["Everyday customs", "Seasonal life: observes seasonal changes in water, planting or harvest | Story and memory: familiar with spoken family histories and local stories"]] },
    { title: "Faith & religion", fields: [["Religious outlook", "Indifferent (Has little personal investment in religious questions or institutions.)"], ["Connection", "Recognised or respected, but not a major personal concern"], ["Aspects", "The deep, Memory, The past, Inevitable end, The sea"], ["Values informing affinity", "Security, family"]] },
    { title: "Combat statistics", fields: [["Monster composition", "Elf · Humanoid · Ordinary civilian · Warlock · Veteran"], ["Template baseline", "Ordinary civilian"], ["Combat class", "Warlock · Veteran (Pact magic, limited profile)"], ["Power target", "4"], ["CR calculation", "Defensive 0 / Offensive 3 → Final 1/2"], ["Challenge rating", "1/2"], ["Worn equipment", "No armour or shield"], ["Weapon", "Light crossbow · carried"], ["Sidearm", "Dagger · carried · +5 to hit · 1d4 + 1 piercing (class feature bonus +2 damage)"], ["Hit Dice", "1d8"], ["Proficiency bonus", "+2"], ["Saving throws", "INT +5, WIS +2"], ["Bonus actions / reactions", "None"], ["Additional actions", "eldritch blast ; mage hand ; minor illusion ; Cast armor of agathys ; Cast hex ; Cast hold person ; Cast invisibility ; Cast counterspell ; Cast fear ; Cast hunger of hadar"], ["Ancestry traits", "Darkvision (60 ft.) · Fey Ancestry: advantage on saves against being charmed; magic cannot put the elf to sleep · Keen Senses: proficiency in Perception · Trance · Sea Elf Training · Child of the Sea · Friend of the Sea"], ["Ancestry feature flags", "amphibious"], ["Movement & senses", "walk 30 ft. · swim 30 ft. · darkvision 60 ft."], ["Resistances / immunities", "None registered"], ["Spellcasting", "CHA (Combat class. CHA save DC 11, spell attack +3; spells: armor of agathys, charm person, hellish rebuke, hex, hold person, invisibility, misty step, counterspell, fear, hunger of hadar, blight, dimension door.)"]] },
    { title: "Traits", fields: [["Whimsical · Very strong", "Has fanciful, quirky inclinations and enjoys unusual ideas that make ordinary life feel magical or absurd."], ["Affectionate · Strong", "Openly expresses fondness through touch, praise, and loving gestures."], ["Dramatic · Moderate", "Expresses emotions and reacts to events in vivid, exaggerated, or theatrical ways."]] },
    { title: "Self-image", fields: [["Sees himself as", "The Performer (Mostly accepts it, but sometimes it feels like a box. Others see something quite different.)"], ["Blind spot", "Believes he is over something he isn’t"], ["Wants to", "Be free of labels altogether"], ["Core tension", "Is he defined by what he creates or by who he is?"]] },
    { title: "Flaws", fields: [["Second flaw", "Remembers insults for years"], ["Quirk", "Always misplaces his keys"]] },
    { title: "Under pressure", fields: [["Coping", "Walking alone at night"], ["Weapon / approach", "No personal weapon"], ["Under physical threat", "Reacts first and thinks later, fast to anger in a real fight — though clearly out of his depth in a real fight"]] },
    { title: "Habits", fields: [["Also", "Remembers small details about friends"]] },
    { title: "Heart", fields: [["Romantic style", "Throws himself in openly and completely, and risks heartbreak"]] },
    { title: "Power profile", fields: [["Prominence", "Notable"], ["Influence visibility", "Underestimated"], ["Strongest source of power", "Personal"], ["Personal", "Considerable (Combat capability: CR 1/2; spellcasting adds personal reach)"], ["Social", "Negligible"], ["Institutional", "Negligible"], ["Economic", "Limited (Impoverished)"], ["Informational", "Negligible"], ["What others perceive", "personal: Moderate · social: Negligible · institutional: Negligible · economic: Negligible · informational: Negligible"]] },
  ],
};

export const defaultCharacters: Character[] = [
  edic,
  ariun,
  { ...blankCharacter(), id: "borin-ashmantle", name: "Borin Ashmantle", ancestry: "Mountain Dwarf", age: "142", pronouns: "he/him", gender: "Man", occupation: "Innkeeper", location: "Rimel", collectionId: "rimel-inn", portrait: "", tagline: "A warm hearth, a good story, and a secret kept.", traits: ["Generous", "Stubborn", "Perceptive"], voice: "Warm, gravelly, and unhurried", impression: "A welcome as solid as the stone walls", goal: "Keep his inn out of the guild’s hands", appearance: "Copper beard, kind eyes, an olive tunic under a much-mended apron.", ac: 13, hp: 22, maxHp: 22, hitDice: "3d8 + 6", cr: "1/2", combatClass: "Brawler · Veteran", savingThrows: "STR +4, CON +4", abilities: { STR: 15, DEX: 10, CON: 14, INT: 11, WIS: 13, CHA: 12 }, attack: "Heavy club · +4 to hit · 1d8 + 2 bludgeoning", sidearm: "Thrown tankard · +4 to hit · 1d4 + 2 bludgeoning (range 20/60 ft.)", ancestryTraits: "Darkvision (60 ft.) · Dwarven Resilience (advantage vs. poison, resistance to poison damage)", resistances: "Poison", movement: "walk 25 ft. · darkvision 60 ft.", threatResponse: "Plants his feet behind the bar and defends his patrons without backing down", equipment: "Iron keys, a clean tankard, a family signet", money: "2 gp, 8 sp", faith: "The hearth ancestors", standing: "Beloved proprietor", background: "Guild artisan", need: "To keep his people safe", secret: "Once sheltered a wanted revolutionary", notes: [] },
  { ...blankCharacter(), id: "sera-willowmere", name: "Sera Willowmere", ancestry: "Half-Elf", age: "67", pronouns: "she/her", gender: "Woman", occupation: "Herbalist & healer", location: "Rimel", collectionId: "rimel-watch", portrait: "", favorite: true, tagline: "There is a remedy for almost everything.", traits: ["Compassionate", "Private", "Intuitive"], voice: "Soft, melodic, with long pauses", impression: "Gentle hands and watchful eyes", goal: "Find a cure for the blight spreading east", appearance: "An ivory braid, a sage cloak, and the faint scent of wild thyme.", ac: 12, hp: 14, maxHp: 14, hitDice: "3d8", cr: "1/4", combatClass: "Acolyte healer · Adept", savingThrows: "WIS +4, CHA +3", abilities: { STR: 9, DEX: 12, CON: 11, INT: 13, WIS: 15, CHA: 12 }, attack: "Quarterstaff · +1 to hit · 1d6 - 1 bludgeoning", additionalActions: "Cast cure wounds ; Cast lesser restoration ; Cast sanctuary ; Healer’s poultice (stabilize & restore 1d6 + 2 HP)", spellcasting: "WIS (Save DC 12, spell attack +4) — Spells: guidance, spare the dying, cure wounds, healing word, sanctuary, lesser restoration", ancestryTraits: "Darkvision (60 ft.) · Fey Ancestry (advantage vs. charmed; immune to magical sleep)", skills: "Medicine +5, Nature +4", equipment: "Herbalism kit, dried herbs, a silver locket", faith: "Vesra, the Blooming Hand", need: "To make amends", secret: "Knows more about the blight’s origin than she admits", notes: [] },
  { ...blankCharacter(), id: "captain-varek", name: "Captain Varek", ancestry: "Human", age: "56", pronouns: "he/him", gender: "Man", occupation: "Watch captain", location: "Rimel", collectionId: "rimel-watch", portrait: "", tagline: "The law is simple. People never are.", traits: ["Dutiful", "Weary", "Fair-minded"], voice: "Clipped, low, with a tired rasp", impression: "A man who notices every exit", goal: "Keep the peace without becoming a tyrant", ac: 16, hp: 32, maxHp: 32, hitDice: "5d8 + 10", cr: "1", combatClass: "Martial captain · Veteran", savingThrows: "STR +4, CON +4", wornEquipment: "Breastplate", abilities: { STR: 15, DEX: 12, CON: 14, INT: 12, WIS: 14, CHA: 11 }, attack: "Longsword · +4 to hit · 1d8 + 2 slashing", sidearm: "Light crossbow · +3 to hit · 1d8 + 1 piercing (range 80/320 ft.)", bonusActions: "Rally the Watch (1/short rest: ally within 30 ft. gains +2 AC until next turn) · Parry (Reaction: +2 AC against one melee attack)", threatResponse: "Calls for surrender first, then forms a disciplined shield line", appearance: "Weathered face, greying beard, a scar through one eyebrow. Well-kept armour.", equipment: "Longsword, breastplate, watch insignia, duty roster", skills: "Insight +4, Perception +4", passive: 14, background: "Soldier", notes: [] },
  { ...blankCharacter(), id: "thistle-underbough", name: "Thistle Underbough", ancestry: "Forest Gnome", age: "42", pronouns: "they/them", occupation: "Courier & wayfinder", collectionId: "frontier-crossroads", location: "The Greenway", portrait: "", tagline: "No road too long. No message too small.", traits: ["Restless", "Cheerful", "Resourceful"], voice: "Quick, bright, and full of tangents", impression: "A blur of red hair and road dust", goal: "Deliver a letter no one will claim", speed: "25 ft", movement: "walk 25 ft. · darkvision 60 ft.", ancestryTraits: "Darkvision (60 ft.) · Gnome Cunning (advantage on INT, WIS, CHA saves vs. magic) · Speak with Small Beasts", spellcasting: "INT (Innate) — At will: minor illusion", appearance: "Wild auburn curls, a mossy travelling cloak, and an enormous satchel.", equipment: "Messenger satchel, sealed letters, a brass compass", notes: [] },
  { ...blankCharacter(), id: "nyx-ashveil", name: "Nyx Ashveil", ancestry: "Tiefling", age: "29", pronouns: "she/they", occupation: "Information broker", collectionId: "frontier-crossroads", location: "The Crossroads", portrait: "", tagline: "The right question is worth more than the answer.", traits: ["Witty", "Calculating", "Patient"], voice: "Low, velvet-soft, faintly amused", impression: "Knows your name before you introduce yourself", goal: "Uncover the patron behind a vanished caravan", appearance: "Muted plum skin, swept-back horns, a charcoal coat with discreet silver clasps.", secret: "Has never actually left the frontier", ac: 13, hp: 16, maxHp: 16, hitDice: "3d8 + 3", cr: "1/2", combatClass: "Spy & informant · Adept", abilities: { STR: 10, DEX: 14, CON: 12, INT: 14, WIS: 12, CHA: 15 }, attack: "Concealed stiletto · +4 to hit · 1d4 + 2 piercing (plus 2d6 Sneak Attack when advantaged)", bonusActions: "Cunning Action (Dash, Disengage, or Hide)", spellcasting: "CHA (Tiefling legacy, Save DC 12) — At will: thaumaturgy ; 1/day: hellish rebuke, darkness", resistances: "Fire", movement: "walk 30 ft. · darkvision 60 ft.", skills: "Deception +5, Insight +4, Stealth +4", equipment: "Coded notebook, a silver coin, three different keys", money: "12 gp", notes: [] },
];

export function getProfileSections(c: Character): ProfileSection[] {
  const base: ProfileSection[] = [
    { title: "At a glance", fields: [["Gender identity", c.gender], ["Pronouns", c.pronouns], ["Temperament", c.traits.join(" / ")], ["First impression", c.impression], ["Others see them as", c.perceived], ["Voice", c.voice]] },
    { title: "Origin & upbringing", fields: [["Current residence", c.location], ["Background", c.background]] },
    { title: "Appearance", fields: [["At a glance", c.appearance], ["Height", c.height], ["Build", c.build], ["Skin", c.skin], ["Hair", c.hair], ["Eyes", c.eyes], ["Distinguishing feature", c.distinguishingFeature], ["Notable mark", c.mark], ["Clothing style", c.clothing]] },
    { title: "Social position", fields: [["Wealth / means", c.wealth], ["Social standing", c.standing]] },
    { title: "Life & path", fields: [["Occupation", c.occupation], ["Background", c.background], ["Current goal", c.goal]] },
    { title: "Languages", fields: [["Speaks", c.languages]] },
    { title: "Faith & religion", fields: [["Deity affinity", c.faith]] },
    { title: "Combat statistics", fields: [["Combat class", c.combatClass], ["Challenge rating", c.cr], ["Armour Class", String(c.ac)], ["Worn equipment", c.wornEquipment], ["Hit Points", `${c.hp} / ${c.maxHp}${c.hitDice ? ` (${c.hitDice})` : ""}`], ["Speed", c.speed], ["Movement & senses", c.movement], ["Ability scores", abilityNames.map(a => `${a} ${c.abilities[a]} (${signed(modifier(c.abilities[a]))})`).join(" · ")], ["Proficiency bonus", c.proficiencyBonus], ["Saving throws", c.savingThrows], ["Attack", c.attack], ["Sidearm", c.sidearm], ["Additional actions", c.additionalActions], ["Spellcasting", c.spellcasting], ["Bonus actions / reactions", c.bonusActions], ["Skills", c.skills], ["Ancestry traits", c.ancestryTraits], ["Resistances / immunities", c.resistances], ["Passive Perception", String(c.passive)]] },
    { title: "Inventory & possessions", fields: [["Money carried", c.money], ["Possessions", c.equipment]] },
    { title: "Traits", fields: [["Personality", c.traits.join(" · ")]] },
    { title: "Drives", fields: [["Values", c.values.join(" · ")], ["Dominant need", c.need], ["Vulnerable need", c.vulnerableNeed]] },
    { title: "Motivation", fields: [["Current goal", c.goal], ["Why it matters", c.motivation], ["What complicates it", c.complication], ["What is at stake", c.stakes]] },
    { title: "Self-image", fields: [["Beneath the surface", c.secret]] },
    { title: "Flaws", fields: [["Main flaw", c.flaw]] },
    { title: "Under pressure", fields: [["Stress response", c.stress], ["In conflict", c.conflict], ["Under physical threat", c.threatResponse]] },
    { title: "Habits", fields: [["Often", c.habit]] },
  ];
  for (const extra of c.details) {
    const existing = base.find(s => s.title.toLowerCase() === extra.title.toLowerCase());
    if (existing) {
      for (const field of extra.fields) {
        if (!existing.fields.some(([key]) => key.toLowerCase() === field[0].toLowerCase())) existing.fields.push(field);
      }
    } else base.push(extra);
  }
  return base.map(s => ({ ...s, fields: s.fields.filter(([, value]) => Boolean(value)) }));
}

export function normalizeCharacter(input: unknown): Character {
  if (!input || typeof input !== "object") throw new Error("Please provide a character profile.");
  const record = input as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name.trim()) throw new Error("Your character needs a name.");
  if (record.name.length > 120) throw new Error("Please keep the name under 120 characters.");
  const base = blankCharacter();
  const result = { ...base } as Character;
  for (const key of Object.keys(base) as (keyof Character)[]) {
    if (typeof base[key] === "string" && typeof record[key] === "string") {
      const limit = key === "portrait" ? 1500000 : key === "tagline" ? 600 : 15000;
      (result as unknown as Record<string, unknown>)[key] = (record[key] as string).slice(0, limit);
    }
  }
  result.name = result.name.trim();
  result.favorite = record.favorite === true;
  if (typeof record.portrait === "string") {
    const p = record.portrait.trim();
    result.portrait = p.startsWith("/images/") ? "" : p.slice(0, 1500000);
  } else {
    result.portrait = "";
  }
  for (const key of ["ac", "hp", "maxHp", "passive"] as const) {
    const value = Number(record[key] ?? base[key]);
    result[key] = Number.isFinite(value) ? Math.max(0, Math.min(9999, value)) : base[key];
  }
  result.maxHp = Math.max(1, result.maxHp);
  result.hp = Math.min(result.hp, result.maxHp);
  result.abilities = { ...base.abilities };
  if (record.abilities && typeof record.abilities === "object") for (const key of abilityNames) {
    const n = Number((record.abilities as Record<string, unknown>)[key]);
    if (Number.isFinite(n)) result.abilities[key] = Math.max(1, Math.min(30, Math.round(n)));
  }
  for (const key of ["traits", "values"] as const) if (Array.isArray(record[key])) result[key] = (record[key] as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 12).map(v => v.slice(0, 160));
  if (Array.isArray(record.notes)) result.notes = record.notes.filter((n): n is CharacterNote => !!n && typeof n === "object" && typeof n.id === "string" && typeof n.text === "string" && typeof n.date === "string").slice(0, 500).map(n => ({ id: n.id.slice(0, 100), text: n.text.slice(0, 20000), date: n.date }));
  if (Array.isArray(record.details)) result.details = record.details.filter((s): s is ProfileSection => !!s && typeof s === "object" && typeof s.title === "string" && Array.isArray(s.fields)).slice(0, 60).map(s => ({ title: s.title.slice(0, 160), fields: s.fields.filter(f => Array.isArray(f) && f.length === 2 && f.every(v => typeof v === "string")).slice(0, 100) }));
  if (typeof record.sourceText === "string") result.sourceText = record.sourceText.slice(0, 100000);
  return result;
}

export function parseCharacterText(text: string): Character {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return normalizeCharacter(JSON.parse(trimmed));
  const frontmatter = trimmed.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  const body = frontmatter ? trimmed.slice(frontmatter[0].length).trim() : trimmed;
  const lines = body.split(/\r?\n/);
  const c = blankCharacter();
  if (frontmatter) for (const raw of frontmatter[1].split(/\r?\n/)) {
    const pair = raw.match(/^(name|ancestry|pronouns|location|occupation|seed):\s*(.+)$/);
    if (!pair) continue;
    let value = pair[2].trim();
    try { const decoded = JSON.parse(value); if (typeof decoded === "string" || typeof decoded === "number") value = String(decoded); } catch { value = value.replace(/^['"]|['"]$/g, ""); }
    (c as unknown as Record<string, unknown>)[pair[1]] = value;
  }
  c.name = (lines.find(l => l.trim()) || c.name || "Unnamed character").replace(/^#+\s*/, "").trim();
  const overview = (lines.slice(1).find(l => l.trim()) || "").replace(/^\*|\*$/g, "").trim();
  if (/[,·]/.test(overview)) {
    c.ancestry = overview.split(/[,·]/)[0].trim();
    const age = overview.match(/(\d+)\s*years?/i); if (age) c.age = age[1];
    const pronouns = overview.match(/\b(she\/her|he\/him|they\/them|she\/they|he\/they)\b/i); if (pronouns) c.pronouns = pronouns[1];
    const spd = overview.match(/speed\s+([^,]+)/i); if (spd) c.speed = spd[1].trim();
  }
  const labels: Record<string, keyof Character> = {
    "gender identity": "gender", "pronouns": "pronouns", "occupation": "occupation", "current residence": "location",
    "birthplace": "location", "home": "location", "voice": "voice", "first impression": "impression", "current goal": "goal", "wants": "goal",
    "why it matters": "motivation", "why": "motivation", "what complicates it": "complication", "what is at stake": "stakes",
    "dominant need": "need", "needs": "need", "vulnerable need": "vulnerableNeed", "main flaw": "flaw", "flaw": "flaw", "stress response": "stress", "under pressure": "stress",
    "in conflict": "conflict", "often": "habit", "habit": "habit", "beneath the surface": "secret", "height": "height", "build": "build",
    "skin": "skin", "hair": "hair", "eyes": "eyes", "notable mark": "mark", "distinguishing feature": "distinguishingFeature",
    "outfit": "appearance", "appearance": "appearance", "clothing style": "clothing",
    "background": "background", "deity affinity": "faith", "faith": "faith", "languages": "languages", "speaks": "languages", "wealth / means": "wealth", "social standing": "standing",
    "combat class": "combatClass", "proficiency bonus": "proficiencyBonus", "saving throws": "savingThrows",
    "worn equipment": "wornEquipment", "skills": "skills", "attack": "attack", "sidearm": "sidearm",
    "additional actions": "additionalActions", "spellcasting": "spellcasting", "bonus actions / reactions": "bonusActions",
    "ancestry traits": "ancestryTraits", "movement & senses": "movement", "resistances / immunities": "resistances",
    "under physical threat": "threatResponse", "possessions": "equipment", "carried": "equipment",
    "money carried": "money", "money": "money", "seed": "seed", "speed": "speed",
    "armour class": "ac", "armor class": "ac", "ac": "ac", "hit points": "maxHp", "hp": "maxHp", "passive perception": "passive", "challenge rating": "cr", "cr": "cr",
  };
  let section: ProfileSection | null = null;
  let currentHp: number | null = null;
  const importedValues: string[] = [];
  const parsed: ProfileSection[] = [];
  for (const raw of lines.slice(1)) {
    const line = raw.trim().replace(/^[-*]\s+/, "");
    if (!line || line.replace(/^\*|\*$/g, "").trim() === overview) continue;
    if (line.startsWith("> ")) { c.tagline = line.slice(2); continue; }
    const pair = line.match(/^([^:]+):\s*(.*)$/);
    if (pair) {
      const key = pair[1].replace(/\*\*/g, "").trim();
      const lowerKey = key.toLowerCase();
      const originalValue = pair[2].replace(/\*\*/g, "").trim();
      const value = originalValue.replace(/\s*\([^()]{45,}\)/g, "").replace(/\s+/g, " ").trim();
      const mapped = labels[lowerKey];
      if (lowerKey === "spellcasting") {
        const spellMatch = originalValue.match(/^([A-Z]{3})\s*\((?:Combat class\.\s*)?([^;)]+;\s*spells:\s*[^.]+)\./i);
        c.spellcasting = spellMatch ? `${spellMatch[1]} (${spellMatch[2]})` : value;
      } else if (lowerKey === "sidearm" || lowerKey === "attack") {
        const cleaned = originalValue
          .replace(/\s*\((?:Alternate carried weapon|Main at-will attack)[^)]*\)\s*$/i, "")
          .replace(/\s*·\s*carried\s*/i, " · ")
          .trim();
        (c as unknown as Record<string, unknown>)[mapped!] = cleaned || value;
      } else if (mapped) {
        if (["ac", "maxHp", "passive"].includes(mapped)) (c as unknown as Record<string, unknown>)[mapped] = parseInt(value) || 0;
        else (c as unknown as Record<string, unknown>)[mapped] = value;
      }
      if (mapped === "maxHp") {
        const slashMatch = originalValue.match(/^(\d+)\s*\/\s*(\d+)/);
        if (slashMatch) { currentHp = Number(slashMatch[1]); c.maxHp = Number(slashMatch[2]); }
        const hdMatch = originalValue.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/i);
        if (hdMatch) c.hitDice = hdMatch[1];
      }
      if (lowerKey === "hit dice") c.hitDice = value;
      if (lowerKey === "ability scores" || lowerKey === "abilities") for (const a of abilityNames) { const match = value.match(new RegExp(`${a}\\s+(\\d+)`, "i")); if (match) c.abilities[a] = Number(match[1]); }
      if (lowerKey === "traits" || lowerKey === "personality") c.traits = value.split(/\s*[·,]\s*/).filter(Boolean).slice(0, 6);
      if (lowerKey === "primary value" || lowerKey === "secondary value") importedValues.push(value);
      if (lowerKey === "values") c.values = value.split(/\s*[·,]\s*/).filter(Boolean);
      if (lowerKey.startsWith("others see")) c.perceived = value;
      if (lowerKey !== "seed") section?.fields.push([key, originalValue]);
    } else if (/^\s{0,1}\S/.test(raw) && line.length < 70) {
      section = { title: line.replace(/^#+\s*/, ""), fields: [] }; parsed.push(section);
    } else if (!c.tagline || c.tagline === blankCharacter().tagline) c.tagline = line;
  }
  const traitSection = parsed.find(s => s.title.toLowerCase() === "traits");
  if (traitSection?.fields.length && !traitSection.fields.some(([key]) => key.toLowerCase() === "personality")) c.traits = traitSection.fields.map(([key]) => key.replace(/\s*[·—–]\s*(?:Very\s+)?(?:Strong|Moderate|Weak).*$/i, "")).slice(0, 6);
  const languageSection = parsed.find(s => s.title.toLowerCase() === "languages");
  if (languageSection?.fields.length) {
    const named = languageSection.fields.find(([key]) => ["speaks", "languages"].includes(key.toLowerCase()));
    c.languages = named ? named[1] : languageSection.fields.map(([key]) => key).join(", ");
  }
  if (importedValues.length) c.values = importedValues;
  if (c.appearance.length > 220 || (c.appearance === blankCharacter().appearance && (c.hair || c.eyes || c.mark || c.distinguishingFeature))) {
    c.appearance = [c.build && c.build.toLowerCase() !== "average" ? c.build : "", c.skin ? `${c.skin.toLowerCase()} skin` : "", c.hair ? `${c.hair.toLowerCase()} hair` : "", c.eyes ? `${c.eyes.toLowerCase()} eyes` : "", c.distinguishingFeature ? c.distinguishingFeature.toLowerCase() : ""].filter(Boolean).join(", ") + `. ${c.clothing}. ${c.mark}.`;
    c.appearance = c.appearance.replace(/\.\./g, ".").trim();
  }
  c.hp = currentHp ?? c.maxHp; c.details = parsed; c.sourceText = text;
  return normalizeCharacter(c);
}
