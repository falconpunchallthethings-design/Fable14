import { Character, getProfileSections, abilityNames, modifier, signed, ProfileSection } from "@/lib/characters";

function sessionSections(c: Character): ProfileSection[] {
  return [
    {
      title: "At the table",
      fields: [
        ["First impression", c.impression],
        ["Voice", c.voice],
        ["Traits", c.traits.join(" · ")],
        ["Habit", c.habit],
        ["Beneath the surface", c.secret],
      ],
    },
    {
      title: "Wants & worries",
      fields: [
        ["Wants", c.goal],
        ["Why", c.motivation],
        ["Needs", c.need],
        ["Flaw", c.flaw],
        ["Under pressure", c.stress],
        ["Under physical threat", c.threatResponse],
      ],
    },
    {
      title: "Combat",
      fields: [
        ["Combat class", c.combatClass],
        ["AC", String(c.ac)],
        ["HP", `${c.hp} / ${c.maxHp}${c.hitDice ? ` (${c.hitDice})` : ""}`],
        ["Speed", c.speed],
        ["Movement & senses", c.movement],
        ["Passive Perception", String(c.passive)],
        ["CR", c.cr],
        ["Saving throws", c.savingThrows],
        ["Abilities", abilityNames.map(a => `${a} ${c.abilities[a]} (${signed(modifier(c.abilities[a]))})`).join(" · ")],
        ["Attack", c.attack],
        ["Sidearm", c.sidearm],
        ["Additional actions", c.additionalActions],
        ["Spellcasting", c.spellcasting],
        ["Bonus actions / reactions", c.bonusActions !== "None" ? c.bonusActions : ""],
        ["Ancestry traits", c.ancestryTraits],
        ["Resistances / immunities", c.resistances !== "None registered" ? c.resistances : ""],
        ["Skills", c.skills],
      ].filter(([, v]) => Boolean(v)) as [string, string][],
    },
    {
      title: "Details & belongings",
      fields: [
        ["Appearance", c.appearance],
        ["Home", c.location],
        ["Background", c.background],
        ["Faith", c.faith],
        ["Languages", c.languages],
        ["Carried", c.equipment],
        ["Money", c.money],
      ],
    },
  ];
}

export function playerFacingSections(c: Character): ProfileSection[] {
  const appearanceExtra = c.details.find(s => s.title.toLowerCase() === "appearance")?.fields ?? [];
  const outfitField = appearanceExtra.find(([k]) => k.toLowerCase() === "outfit")?.[1] || "";
  const stylingField = appearanceExtra.find(([k]) => k.toLowerCase() === "cultural styling")?.[1] || "";

  const raw: ProfileSection[] = [
    {
      title: "First impression & demeanor",
      fields: [
        ["First impression", c.impression],
        ["How others see them", c.perceived],
        ["Voice & cadence", c.voice],
        ["Noticeable habit", c.habit],
        ["Pronouns", c.pronouns],
        ["Gender", c.gender !== "Not specified" ? c.gender : ""],
      ],
    },
    {
      title: "Appearance & attire",
      fields: [
        ["At a glance", c.appearance],
        ["Height", c.height !== "Average" ? c.height : ""],
        ["Build", c.build !== "Average" ? c.build : ""],
        ["Skin", c.skin],
        ["Hair", c.hair],
        ["Eyes", c.eyes],
        ["Distinguishing feature", c.distinguishingFeature],
        ["Notable mark", c.mark],
        ["Clothing style", c.clothing],
        ["Cultural styling", stylingField],
        ["Outfit details", outfitField && outfitField !== c.appearance ? outfitField : ""],
      ],
    },
    {
      title: "Public life & background",
      fields: [
        ["Occupation", c.occupation],
        ["Known residence", c.location],
        ["Social standing", c.standing],
        ["Languages spoken", c.languages],
        ["Cultural or religious ties", c.faith !== "No strong affiliation" ? c.faith : ""],
      ],
    },
  ];
  return raw
    .map(section => ({ ...section, fields: section.fields.filter(([, value]) => Boolean(value && value.trim())) }))
    .filter(section => section.fields.length > 0);
}

function sections(c: Character, full: boolean, notes: boolean) {
  const list = full ? getProfileSections(c) : sessionSections(c);
  if (notes && c.notes.length) {
    list.push({
      title: "Session notes",
      fields: c.notes.map(n => [
        new Date(n.date).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }),
        n.text,
      ]),
    });
  }
  return list;
}

const yaml = (v: string) => JSON.stringify(v);
export function toMarkdown(c: Character, full: boolean, notes: boolean) {
  const frontmatter = `---\ntype: npc\nname: ${yaml(c.name)}\nancestry: ${yaml(c.ancestry)}\npronouns: ${yaml(c.pronouns)}\nlocation: ${yaml(c.location)}\noccupation: ${yaml(c.occupation)}\ntags:\n  - npc\n  - fable\n${c.seed ? `seed: ${yaml(c.seed)}\n` : ""}---`;
  return `${frontmatter}\n\n# ${c.name}\n\n*${c.ancestry} · ${c.age} years · ${c.pronouns}*\n\n> ${c.tagline}\n\n${sections(c, full, notes)
    .map(s => `## ${s.title}\n\n${s.fields.map(([key, value]) => `- **${key}:** ${value}`).join("\n")}`)
    .join("\n\n")}\n`;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));

export function toKankaHtml(c: Character) {
  const publicLead = c.impression ? `${c.impression} — ${c.occupation.toLowerCase()} in ${c.location}.` : c.occupation;
  const publicSections = playerFacingSections(c);
  return `<h1>${escapeHtml(c.name)}</h1>\n<p><em>${escapeHtml(`${c.ancestry} · ${c.age} years · ${c.pronouns}`)}</em></p>\n<blockquote>${escapeHtml(publicLead)}</blockquote>\n${publicSections
    .map(
      s =>
        `<h2>${escapeHtml(s.title)}</h2>\n<ul>\n${s.fields
          .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value).replace(/\n/g, "<br>")}</li>`)
          .join("\n")}\n</ul>`
    )
    .join("\n")}`;
}

export function downloadFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function filename(c: Character) {
  return c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
