export type SpellInfo = {
  name: string;
  level: number; // 0 = Cantrip
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  summary: string;
};

export type SkillInfo = {
  name: string;
  ability: string;
  summary: string;
};

export const SKILL_COMPENDIUM: Record<string, SkillInfo> = {
  acrobatics: {
    name: "Acrobatics",
    ability: "DEX",
    summary: "Stay on your feet in a tricky situation (ice, tightrope, pitching deck), flip, dive, roll, or escape grapples and restraints.",
  },
  "animal handling": {
    name: "Animal Handling",
    ability: "WIS",
    summary: "Calm down a domesticated animal, keep a mount from getting spooked, or intuit an animal’s intentions.",
  },
  arcana: {
    name: "Arcana",
    ability: "INT",
    summary: "Recall lore about spells, magic items, eldritch symbols, magical traditions, the planes of existence, and the inhabitants of those planes.",
  },
  athletics: {
    name: "Athletics",
    ability: "STR",
    summary: "Climb, jump, or swim in difficult currents; grapple, shove, or force open stuck or barred doors.",
  },
  deception: {
    name: "Deception",
    ability: "CHA",
    summary: "Hide the truth verbally or through actions—fast-talking a guard, conning a merchant, maintaining a disguise, or telling a convincing lie.",
  },
  history: {
    name: "History",
    ability: "INT",
    summary: "Recall lore about historical events, legendary people, ancient kingdoms, past disputes, recent wars, and lost civilizations.",
  },
  insight: {
    name: "Insight",
    ability: "WIS",
    summary: "Determine the true intentions of a creature—detecting a lie, reading body language, or predicting someone’s next move.",
  },
  intimidation: {
    name: "Intimidation",
    ability: "CHA",
    summary: "Influence someone through overt threats, hostile actions, and physical presence to extract information or force compliance.",
  },
  investigation: {
    name: "Investigation",
    ability: "INT",
    summary: "Look around for clues and make deductions: deduce the location of a hidden object, discern how a wound was inflicted, or find a weak point in a tunnel.",
  },
  medicine: {
    name: "Medicine",
    ability: "WIS",
    summary: "Stabilize a dying companion (DC 10), diagnose an illness, or determine how a creature died.",
  },
  nature: {
    name: "Nature",
    ability: "INT",
    summary: "Recall lore about terrain, plants and animals, the weather, and natural cycles.",
  },
  perception: {
    name: "Perception",
    ability: "WIS",
    summary: "Spot, hear, or otherwise detect the presence of something—ambushers, hidden doors, faint whispers, or distant movement.",
  },
  performance: {
    name: "Performance",
    ability: "CHA",
    summary: "Delight an audience with music, dance, acting, storytelling, or some other form of entertainment.",
  },
  persuasion: {
    name: "Persuasion",
    ability: "CHA",
    summary: "Influence someone or a group of people with tact, social graces, or good nature—negotiating peace, inspiring crowds, or fostering friendships.",
  },
  religion: {
    name: "Religion",
    ability: "INT",
    summary: "Recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults.",
  },
  "sleight of hand": {
    name: "Sleight of Hand",
    ability: "DEX",
    summary: "Manual trickery such as planting something on someone else, concealing an object on your person, or picking a pocket.",
  },
  stealth: {
    name: "Stealth",
    ability: "DEX",
    summary: "Conceal yourself from enemies, slink past guards, slip away without being noticed, or sneak up on someone without being seen or heard.",
  },
  survival: {
    name: "Survival",
    ability: "WIS",
    summary: "Follow tracks, hunt wild game, guide a group through wastelands, identify signs of nearby creatures, or avoid natural hazards.",
  },
};

export const SPELL_COMPENDIUM: Record<string, SpellInfo> = {
  // Cantrips (Level 0)
  "eldritch blast": {
    name: "Eldritch Blast",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 ft.",
    duration: "Instantaneous",
    summary: "Ranged spell attack against one creature. On a hit, the target takes 1d10 force damage (multiple beams at higher levels: 2 at 5th, 3 at 11th, 4 at 17th).",
  },
  "fire bolt": {
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 ft.",
    duration: "Instantaneous",
    summary: "Ranged spell attack at a creature or object. On a hit, deals 1d10 fire damage (scales with caster level; 4d10 for an 18th-level Archmage) and ignites unattended flammable objects.",
  },
  guidance: {
    name: "Guidance",
    level: 0,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    duration: "Concentration, up to 1 min.",
    summary: "Touch one willing creature. Once before the spell ends, the target can roll a d4 and add it to one ability check of its choice.",
  },
  light: {
    name: "Light",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    duration: "1 hour",
    summary: "Touch one object up to 10 ft. in any dimension. It sheds bright light in a 20-ft. radius and dim light for an additional 20 ft.",
  },
  "mage hand": {
    name: "Mage Hand",
    level: 0,
    school: "Conjuration",
    castingTime: "1 action",
    range: "30 ft.",
    duration: "1 minute",
    summary: "Spectral floating hand manipulates an object, opens an unlocked door/container, or retrieves/stows an item (up to 10 lbs). Cannot attack or activate magic items.",
  },
  "minor illusion": {
    name: "Minor Illusion",
    level: 0,
    school: "Illusion",
    castingTime: "1 action",
    range: "30 ft.",
    duration: "1 minute",
    summary: "Create a sound or a static image of an object (no larger than a 5-ft. cube). Physical interaction reveals it to be an illusion, or a creature can use its action to make an Investigation check against spell save DC.",
  },
  prestidigitation: {
    name: "Prestidigitation",
    level: 0,
    school: "Transmutation",
    castingTime: "1 action",
    range: "10 ft.",
    duration: "Up to 1 hour",
    summary: "Minor magical trick: harmless sensory effect, light/snuff a candle or small fire, clean/soil a 1-cubic-ft. object, chill/warm/flavor material, or create a tiny trinket/mark.",
  },
  "spare the dying": {
    name: "Spare the Dying",
    level: 0,
    school: "Necromancy",
    castingTime: "1 action",
    range: "Touch",
    duration: "Instantaneous",
    summary: "Touch a living creature that has 0 hit points. The creature becomes stable.",
  },
  thaumaturgy: {
    name: "Thaumaturgy",
    level: 0,
    school: "Transmutation",
    castingTime: "1 action",
    range: "30 ft.",
    duration: "Up to 1 minute",
    summary: "Manifest a minor wonder: booming voice (3× volume), flickering flames, harmless tremors, illusory sound, slamming doors/windows, or altered eye appearance.",
  },

  // 1st Level
  "armor of agathys": {
    name: "Armor of Agathys",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Self",
    duration: "1 hour",
    summary: "Protective spectral frost grants 5 temporary HP for the duration (+5 per slot level above 1st). If a creature hits you with a melee attack while you have these temporary HP, it takes 5 cold damage (+5 per higher slot level).",
  },
  "charm person": {
    name: "Charm Person",
    level: 1,
    school: "Enchantment",
    castingTime: "1 action",
    range: "30 ft.",
    duration: "1 hour",
    summary: "Humanoid within range makes a WIS save (with advantage if you or companions are fighting it) or is charmed by you until the spell ends or you/companions harm it.",
  },
  "cure wounds": {
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    duration: "Instantaneous",
    summary: "A creature you touch regains 1d8 + spellcasting ability modifier hit points (+1d8 per slot level above 1st).",
  },
  "detect magic": {
    name: "Detect Magic",
    level: 1,
    school: "Divination",
    castingTime: "1 action",
    range: "Self (30-ft. radius)",
    duration: "Concentration, up to 10 min.",
    summary: "Sense the presence of magic within 30 ft. Use an action to see a faint aura around any visible creature or object bearing magic and learn its school.",
  },
  "disguise self": {
    name: "Disguise Self",
    level: 1,
    school: "Illusion",
    castingTime: "1 action",
    range: "Self",
    duration: "1 hour",
    summary: "Change your appearance—including clothing, armor, weapons, and belongings—up to 1 foot shorter or taller. Investigation check vs. spell save DC to discern the disguise.",
  },
  "healing word": {
    name: "Healing Word",
    level: 1,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "60 ft.",
    duration: "Instantaneous",
    summary: "A creature of your choice that you can see within range regains 1d4 + spellcasting ability modifier HP (+1d4 per higher slot level).",
  },
  "hellish rebuke": {
    name: "Hellish Rebuke",
    level: 1,
    school: "Evocation",
    castingTime: "1 reaction (when damaged by creature within 60 ft.)",
    range: "60 ft.",
    duration: "Instantaneous",
    summary: "The creature that damaged you is momentarily surrounded by hellish flames. DEX save or takes 2d10 fire damage (half on success; +1d10 per higher slot level).",
  },
  hex: {
    name: "Hex",
    level: 1,
    school: "Enchantment",
    castingTime: "1 bonus action",
    range: "90 ft.",
    duration: "Concentration, up to 1 hour",
    summary: "Curse a creature in range: deal an extra 1d6 necrotic damage whenever you hit it with an attack, and choose one ability so it has disadvantage on checks with that ability. Move curse as a bonus action if target drops to 0 HP.",
  },
  identify: {
    name: "Identify",
    level: 1,
    school: "Divination",
    castingTime: "1 minute",
    range: "Touch",
    duration: "Instantaneous",
    summary: "Touch an object to learn its magical properties, how to use them, whether it requires attunement, and how many charges it has—or touch a creature to learn what spells are affecting it.",
  },
  "mage armor": {
    name: "Mage Armor",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    duration: "8 hours",
    summary: "Touch a willing unarmored creature. Its base AC becomes 13 + its Dexterity modifier until the spell ends or it dons armor.",
  },
  "magic missile": {
    name: "Magic Missile",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 ft.",
    duration: "Instantaneous",
    summary: "Create three glowing darts of magical force (+1 dart per higher slot level). Each dart automatically hits a visible target of your choice for 1d4 + 1 force damage.",
  },
  sanctuary: {
    name: "Sanctuary",
    level: 1,
    school: "Abjuration",
    castingTime: "1 bonus action",
    range: "30 ft.",
    duration: "1 minute",
    summary: "Ward a creature: any attacker targeting the warded creature must make a WIS save or choose a new target or lose the attack/spell. Ends if the warded creature attacks or casts a harmful spell.",
  },
  shield: {
    name: "Shield",
    level: 1,
    school: "Abjuration",
    castingTime: "1 reaction (when hit by an attack or targeted by magic missile)",
    range: "Self",
    duration: "1 round",
    summary: "Until the start of your next turn, you have a +5 bonus to AC (including against the triggering attack) and take no damage from magic missile.",
  },

  // 2nd Level
  darkness: {
    name: "Darkness",
    level: 2,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 ft.",
    duration: "Concentration, up to 10 min.",
    summary: "Magical darkness spreads from a point to fill a 15-ft.-radius sphere. Creatures with darkvision can’t see through it, and nonmagical light can’t illuminate it.",
  },
  "detect thoughts": {
    name: "Detect Thoughts",
    level: 2,
    school: "Divination",
    castingTime: "1 action",
    range: "Self (30 ft.)",
    duration: "Concentration, up to 1 min.",
    summary: "Read the surface thoughts of creatures within 30 ft. Use an action to probe deeper (target makes a WIS save; on failure, gain insight into its reasoning, emotional state, and something looming large in its mind).",
  },
  "hold person": {
    name: "Hold Person",
    level: 2,
    school: "Enchantment",
    castingTime: "1 action",
    range: "60 ft.",
    duration: "Concentration, up to 1 min.",
    summary: "Choose a visible humanoid within range. Target must succeed on a WIS save or be paralyzed for the duration (repeats save at the end of each of its turns).",
  },
  invisibility: {
    name: "Invisibility",
    level: 2,
    school: "Illusion",
    castingTime: "1 action",
    range: "Touch",
    duration: "Concentration, up to 1 hour",
    summary: "A creature you touch becomes invisible until the spell ends. The spell ends for a target that attacks or casts a spell.",
  },
  "lesser restoration": {
    name: "Lesser Restoration",
    level: 2,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    duration: "Instantaneous",
    summary: "Touch a creature and end either one disease or one condition afflicting it: blinded, deafened, paralyzed, or poisoned.",
  },
  "mirror image": {
    name: "Mirror Image",
    level: 2,
    school: "Illusion",
    castingTime: "1 action",
    range: "Self",
    duration: "1 minute",
    summary: "Three illusory duplicates of yourself appear in your space. Whenever a creature targets you with an attack, roll a d20 to see if the attack targets one of your duplicates instead (duplicate AC = 10 + DEX mod).",
  },
  "misty step": {
    name: "Misty Step",
    level: 2,
    school: "Conjuration",
    castingTime: "1 bonus action",
    range: "Self",
    duration: "Instantaneous",
    summary: "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.",
  },

  // 3rd Level
  counterspell: {
    name: "Counterspell",
    level: 3,
    school: "Abjuration",
    castingTime: "1 reaction (when a creature within 60 ft. casts a spell)",
    range: "60 ft.",
    duration: "Instantaneous",
    summary: "Interrupt a creature casting a spell. If the spell is 3rd level or lower, it fails. If 4th level or higher, make an ability check using your spellcasting ability (DC = 10 + the spell’s level) to cause it to fail.",
  },
  "dispel magic": {
    name: "Dispel Magic",
    level: 3,
    school: "Abjuration",
    castingTime: "1 action",
    range: "120 ft.",
    duration: "Instantaneous",
    summary: "Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends. For each spell of 4th level or higher, make a spellcasting ability check (DC 10 + spell’s level).",
  },
  fear: {
    name: "Fear",
    level: 3,
    school: "Illusion",
    castingTime: "1 action",
    range: "Self (30-ft. cone)",
    duration: "Concentration, up to 1 min.",
    summary: "Each creature in a 30-ft. cone must succeed on a WIS save or drop whatever it is holding, become frightened, and take the Dash action on each of its turns to move away from you.",
  },
  fireball: {
    name: "Fireball",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "150 ft.",
    duration: "Instantaneous",
    summary: "Bright streak flashes to a point within range and blossoms into a 20-ft.-radius explosion. Each creature in the sphere makes a DEX save, taking 8d6 fire damage on a failed save, or half on a success (+1d6 per higher slot level).",
  },
  fly: {
    name: "Fly",
    level: 3,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Touch",
    duration: "Concentration, up to 10 min.",
    summary: "Touch a willing creature. The target gains a flying speed of 60 feet for the duration.",
  },
  "hunger of hadar": {
    name: "Hunger of Hadar",
    level: 3,
    school: "Conjuration",
    castingTime: "1 action",
    range: "150 ft.",
    duration: "Concentration, up to 1 min.",
    summary: "20-ft.-radius sphere of blackness and bitter cold (difficult terrain, blinded inside). Creatures starting their turn in the area take 2d6 cold damage; creatures ending their turn there make a DEX save or take 2d6 acid damage.",
  },
  "lightning bolt": {
    name: "Lightning Bolt",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (100-ft. line)",
    duration: "Instantaneous",
    summary: "A stroke of lightning forms a line 100 ft. long and 5 ft. wide. Each creature in the line makes a DEX save, taking 8d6 lightning damage on a failed save, or half on a success.",
  },

  // 4th Level
  banishment: {
    name: "Banishment",
    level: 4,
    school: "Abjuration",
    castingTime: "1 action",
    range: "60 ft.",
    duration: "Concentration, up to 1 min.",
    summary: "One creature within range must succeed on a CHA save or be banished to a harmless demiplane (incapacitated there) or its home plane if native to a different plane.",
  },
  blight: {
    name: "Blight",
    level: 4,
    school: "Necromancy",
    castingTime: "1 action",
    range: "30 ft.",
    duration: "Instantaneous",
    summary: "Drain moisture and vitality from one creature within range. CON save or takes 8d8 necrotic damage (half on a success; plant creatures have disadvantage and take maximum damage).",
  },
  "dimension door": {
    name: "Dimension Door",
    level: 4,
    school: "Conjuration",
    castingTime: "1 action",
    range: "500 ft.",
    duration: "Instantaneous",
    summary: "Teleport yourself and up to one willing creature of your size or smaller within 5 ft. to any spot within 500 feet (even without line of sight).",
  },
  "fire shield": {
    name: "Fire Shield",
    level: 4,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self",
    duration: "10 minutes",
    summary: "Wreathe yourself in warm or chill flames: gain resistance to cold or fire damage, and whenever a creature within 5 ft. hits you with a melee attack, it takes 2d8 fire or cold damage.",
  },
  "greater invisibility": {
    name: "Greater Invisibility",
    level: 4,
    school: "Illusion",
    castingTime: "1 action",
    range: "Touch",
    duration: "Concentration, up to 1 min.",
    summary: "You or a creature you touch becomes invisible until the spell ends. Unlike normal invisibility, it does not end when the target attacks or casts a spell.",
  },
  stoneskin: {
    name: "Stoneskin",
    level: 4,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    duration: "Concentration, up to 1 hour",
    summary: "Turn the flesh of a willing creature as hard as stone. Until the spell ends, the target has resistance to nonmagical bludgeoning, piercing, and slashing damage.",
  },

  // 5th Level
  "cone of cold": {
    name: "Cone of Cold",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (60-ft. cone)",
    duration: "Instantaneous",
    summary: "A blast of cold air erupts from your hands in a 60-ft. cone. Each creature in the area makes a CON save, taking 8d8 cold damage on a failed save, or half on a success.",
  },
  scrying: {
    name: "Scrying",
    level: 5,
    school: "Divination",
    castingTime: "10 minutes",
    range: "Self",
    duration: "Concentration, up to 10 min.",
    summary: "See and hear a particular creature you choose that is on the same plane of existence (target makes a WIS save modified by your knowledge/connection to it) or observe a known location.",
  },
  "wall of force": {
    name: "Wall of Force",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 ft.",
    duration: "Concentration, up to 10 min.",
    summary: "An invisible wall of force springs into existence (up to ten 10×10-ft. panels, or a 10-ft.-radius dome/sphere). Nothing can physically pass through it; immune to all damage and can’t be dispelled by dispel magic (disintegrate destroys it).",
  },

  // 6th Level
  "chain lightning": {
    name: "Chain Lightning",
    level: 6,
    school: "Evocation",
    castingTime: "1 action",
    range: "150 ft.",
    duration: "Instantaneous",
    summary: "Create a bolt of lightning that arcs toward a target of your choice, thenthree bolts leap from that target to up to three other targets within 30 ft. Each target makes a DEX save, taking 10d8 lightning damage on a failed save, or half on a success.",
  },
  disintegrate: {
    name: "Disintegrate",
    level: 6,
    school: "Transmutation",
    castingTime: "1 action",
    range: "60 ft.",
    duration: "Instantaneous",
    summary: "Thin green ray at a target within range. Creature makes a DEX save or takes 10d6 + 40 force damage (0 damage on a successful save). If this reduces the target to 0 HP, it is disintegrated into fine gray dust.",
  },
  "globe of invulnerability": {
    name: "Globe of Invulnerability",
    level: 6,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Self (10-ft. radius)",
    duration: "Concentration, up to 1 min.",
    summary: "An immobile, faintly shimmering barrier appears in a 10-ft. radius around you. Any spell of 5th level or lower cast from outside the barrier can’t affect creatures or objects within it.",
  },

  // 7th Level
  "prismatic spray": {
    name: "Prismatic Spray",
    level: 7,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (60-ft. cone)",
    duration: "Instantaneous",
    summary: "Eight multicolored rays of light flash from your hand in a 60-ft. cone. For each target, roll a d8 to determine which color ray affects it (10d6 elemental damage, petrification, blindness, or plane shift on failed DEX/WIS saves).",
  },
  teleport: {
    name: "Teleport",
    level: 7,
    school: "Conjuration",
    castingTime: "1 action",
    range: "10 ft.",
    duration: "Instantaneous",
    summary: "Instantly transport yourself and up to eight willing creatures within range to a destination you select on the same plane of existence.",
  },

  // 8th Level
  "mind blank": {
    name: "Mind Blank",
    level: 8,
    school: "Abjuration",
    castingTime: "1 action",
    range: "Touch",
    duration: "24 hours",
    summary: "One willing creature you touch is immune to psychic damage, any effect that would sense its emotions or read its thoughts, divination spells, and the charmed condition.",
  },

  // 9th Level
  "meteor swarm": {
    name: "Meteor Swarm",
    level: 9,
    school: "Evocation",
    castingTime: "1 action",
    range: "1 mile",
    duration: "Instantaneous",
    summary: "Blazing orbs of fire plummet to the ground at four different points you can see within 1 mile. Each creature in a 40-ft.-radius sphere centered on each point makes a DEX save, taking 20d6 fire damage + 20d6 bludgeoning damage on a failed save, or half on a success.",
  },
  "time stop": {
    name: "Time Stop",
    level: 9,
    school: "Transmutation",
    castingTime: "1 action",
    range: "Self",
    duration: "Instantaneous",
    summary: "Briefly stop the flow of time for everyone but yourself. Take 1d4 + 1 turns in a row, during which you can use actions and move as normal. Ends early if an action affects another creature or an object being worn/carried by someone else.",
  },
};

export function lookupSpell(rawName: string): SpellInfo {
  const key = rawName
    .replace(/^Cast\s+/i, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim()
    .toLowerCase();
  if (SPELL_COMPENDIUM[key]) return SPELL_COMPENDIUM[key];
  return {
    name: rawName.replace(/^Cast\s+/i, "").trim(),
    level: 1,
    school: "Arcane / Divine",
    castingTime: "1 action",
    range: "60 ft.",
    duration: "Instantaneous / Concentration",
    summary: "Resolve using its 2014 5e spell or special action entry. Expends a spell slot of the spell’s level or higher unless marked At-Will.",
  };
}

export function lookupSkill(rawSkillToken: string): SkillInfo & { bonus: string } {
  const trimmed = rawSkillToken.trim();
  const match = trimmed.match(/^([A-Za-z\s]+?)\s*([+-]\d+)?$/);
  const namePart = (match ? match[1] : trimmed).trim().toLowerCase();
  const bonus = match?.[2] || "+2";
  const found = SKILL_COMPENDIUM[namePart];
  if (found) return { ...found, bonus };
  return {
    name: match ? match[1].trim() : trimmed,
    ability: "Ability",
    bonus,
    summary: "Roll 1d20 + this bonus when making an ability check involving this trained skill (proficiency bonus already included).",
  };
}

export function parseSpellSlotsFromCharacter(limitedResources: string, spellcasting: string, combatClass: string): { label: string; count: number }[] {
  const slots: { label: string; count: number }[] = [];
  const seen = new Set<string>();
  const regex = /(\d+)\s*[×x]\s*(\d+(?:st|nd|rd|th)-level)\s*slot/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(limitedResources)) !== null) {
    const count = Number(match[1]);
    const levelLabel = match[2].toLowerCase();
    if (!seen.has(levelLabel) && count > 0) {
      seen.add(levelLabel);
      slots.push({ label: `${levelLabel} slots`, count });
    }
  }
  if (slots.length > 0) return slots;
  if (/warlock/i.test(combatClass) || /pact magic/i.test(combatClass)) {
    return [{ label: "Pact slots (3rd level)", count: 2 }];
  }
  if (spellcasting && !/at will:\s*minor illusion$/i.test(spellcasting.trim())) {
    if (/archmage/i.test(spellcasting) || /archmage/i.test(combatClass)) {
      return [
        { label: "1st-level slots", count: 4 },
        { label: "2nd-level slots", count: 3 },
        { label: "3rd-level slots", count: 3 },
        { label: "4th-level slots", count: 3 },
        { label: "5th-level slots", count: 3 },
        { label: "6th-level slots", count: 1 },
        { label: "7th-level slots", count: 1 },
        { label: "8th-level slots", count: 1 },
        { label: "9th-level slots", count: 1 },
      ];
    }
    return [
      { label: "1st-level slots", count: 4 },
      { label: "2nd-level slots", count: 2 },
    ];
  }
  return [];
}
