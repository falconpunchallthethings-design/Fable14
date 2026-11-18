import { test, expect } from "@playwright/test";

const testPrefix = "Fable QA ";
test.afterEach(async ({ request }) => {
  const data = await (await request.get("/api/characters")).json();
  for (const c of data.characters) if (c.name.startsWith(testPrefix)) await request.delete(`/api/characters/${c.id}`);
  for (const col of data.collections) if (col.name.startsWith(testPrefix)) await request.delete(`/api/collections/${col.id}`);
});

test("Legend stars system, primary god on session sheet, Kanka export, and night mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Edic Dorianon", exact: true })).toBeVisible();

  // Edic has 0 legend stars -> no legend badge shown, and primary god is visible on main session sheet
  await expect(page.locator(".character-header .legend-badge")).toHaveCount(0);
  await expect(page.locator(".deity-dd")).toContainText(/Vesra/i);

  // Ariun has 1 star -> shows ★ without "Legend" title
  await page.locator(".character-list-item").filter({ hasText: "Ariun Silverleaf" }).click();
  await expect(page.getByRole("heading", { name: "Ariun Silverleaf", exact: true })).toBeVisible();
  await expect(page.locator(".character-header .legend-badge")).toBeVisible();
  await expect(page.locator(".character-header .legend-stars")).toHaveText("★");
  await expect(page.locator(".character-header .legend-badge strong")).toHaveCount(0);

  // Daraelle has 5 stars (>= 3) -> shows ★★★★★ AND "Legend" title + primary god Naskyros
  await page.locator(".character-list-item").filter({ hasText: "Daraelle" }).click();
  await expect(page.getByRole("heading", { name: "Daraelle", exact: true })).toBeVisible();
  await expect(page.locator(".character-header .legend-stars")).toHaveText("★★★★★");
  await expect(page.locator(".character-header .legend-badge strong")).toHaveText("Legend");
  await expect(page.locator(".deity-dd")).toContainText("Naskyros — The Sunken King");
  await expect(page.locator(".sheet-eyebrow")).toContainText("The Ruinholds (Los Bastiones Arruinados) › Ashen Bastion › Sunken Spire Archive");

  // Interactive spell & skill inspection on main session sheet
  await page.locator(".skill-inline-btn").filter({ hasText: "Arcana +7" }).click();
  await expect(page.locator(".compendium-popover")).toContainText("Recall lore about spells");

  // Night mode toggle
  await page.getByRole("button", { name: "Switch to night mode", exact: true }).click();
  await expect(page.locator(".app-shell.dark-mode")).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
  await expect(page.locator(".app-shell.dark-mode")).toHaveCount(0);

  // Kanka player-facing export strips secrets, stats, and seeds
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: /Kanka/ }).click();
  const kankaPreview = await page.locator(".export-preview pre").textContent();
  expect(kankaPreview).toContain("<h1>Daraelle</h1>");
  expect(kankaPreview).toContain("Cool and collected");
  expect(kankaPreview).not.toContain("Get revenge");
  expect(kankaPreview).not.toContain("stranger than she appears");
  expect(kankaPreview).not.toContain("759061");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  expect(errors).toEqual([]);
});

test("3-tier locations (Region -> City -> Sublocation) edit & delete, plus Combat Mode MM stat block, direct HP box, spell slots & spell/skill compendium", async ({ page }) => {
  await page.goto("/");

  // Open 3-tier locations manager and test create + edit + delete
  await page.getByRole("button", { name: /Locations & folders/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Category tier").selectOption("city");
  await page.getByPlaceholder("e.g. Ashen Bastion").fill(`${testPrefix}Silverport`);
  await page.getByRole("button", { name: "Create city", exact: true }).click();
  await expect(page.locator(".city-card").filter({ hasText: `${testPrefix}Silverport` })).toBeVisible();

  // Edit the created city
  await page.getByRole("button", { name: `Edit ${testPrefix}Silverport`, exact: true }).click();
  await page.getByRole("textbox", { name: "Edit location name", exact: true }).fill(`${testPrefix}Goldenport`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".city-card").filter({ hasText: `${testPrefix}Goldenport` })).toBeVisible();

  // Delete the edited city
  await page.getByRole("button", { name: `Delete ${testPrefix}Goldenport`, exact: true }).click();
  await expect(page.locator(".city-card").filter({ hasText: `${testPrefix}Goldenport` })).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  // Open Combat Mode and inspect Daraelle's Monster Manual stat block
  await page.getByRole("button", { name: /Combat mode/ }).first().click();
  await expect(page.locator(".combat-workspace")).toBeVisible();
  await page.locator(".combatant-pill").filter({ hasText: "Daraelle" }).click();
  await expect(page.locator(".combat-sheet h2")).toHaveText("Daraelle");
  await expect(page.locator(".combat-sheet .legend-badge strong")).toHaveText("Legend");

  // Direct HP input box: default subtracts HP (damage), '+' prefix adds HP (healing), plus Full button
  const hpInput = page.getByRole("textbox", { name: "Hit points lost or healed", exact: true });
  await hpInput.fill("22");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".combat-hp-readout strong")).toContainText("200");

  await hpInput.fill("+10");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".combat-hp-readout strong")).toContainText("210");

  await page.getByRole("button", { name: "Full", exact: true }).click();
  await expect(page.locator(".combat-hp-readout strong")).toContainText("222");

  // Monster Manual traits, tactics, spell slots & clickable spells/skills
  await expect(page.locator(".mm-traits-list")).toContainText("Magic Resistance.");
  await expect(page.locator(".mm-traits-list")).toContainText("Arcane Recovery.");
  await expect(page.locator(".mm-tactics-box")).toContainText("Ranged controller / spell support");
  await expect(page.locator(".spell-slots-tracker")).toBeVisible();

  // Click a spell in the stat block -> shows 5e spell description and allows expending a slot
  await page.locator(".combat-action-pill").filter({ hasText: /^meteor swarm$/i }).click();
  await expect(page.locator(".mm-inspector-banner")).toContainText("20d6 fire damage");
  await page.getByRole("button", { name: "Cast (expend slot)", exact: true }).click();
  await expect(page.locator(".slot-pip.is-expended")).toHaveCount(1);

  // Click a skill in the stat block -> shows 5e skill description
  await page.locator(".mm-skill-btn").filter({ hasText: "Arcana +7" }).click();
  await expect(page.locator(".mm-inspector-banner")).toContainText("Recall lore about spells");

  await page.getByRole("button", { name: "Back to library", exact: true }).click();
  await expect(page.locator(".page-heading")).toBeVisible();
});

test("create, edit, HP, notes, persistence and delete", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character name" }).fill(`${testPrefix}Mira`);
  await page.getByRole("textbox", { name: "Occupation", exact: true }).fill("Cartographer");
  await page.getByLabel("Legend distinction stars").selectOption("3");
  await page.getByRole("tab", { name: "At the table", exact: true }).click();
  await page.getByRole("textbox", { name: "Voice", exact: true }).fill("Bright and inquisitive");
  await page.getByRole("button", { name: "Create character", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${testPrefix}Mira`, exact: true })).toBeVisible();
  await expect(page.locator(".character-header .legend-badge strong")).toHaveText("Legend");
  await expect(page.locator(".voice-cue")).toContainText("Bright and inquisitive");
  await page.locator(".hp-stat").hover();
  await page.getByRole("button", { name: "Decrease hit points", exact: true }).click();
  await expect(page.locator(".hp-value strong")).toContainText("3");
  await page.getByRole("tab", { name: /Session notes/ }).click();
  await page.getByRole("textbox", { name: "New session note", exact: true }).fill("Promised the party a map of the northern pass.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.locator(".note-card")).toContainText("northern pass");
  const data = await (await request.get("/api/characters")).json();
  const saved = data.characters.find((c: { name: string }) => c.name === `${testPrefix}Mira`);
  expect(saved.hp).toBe(3);
  expect(saved.legendStars).toBe(3);
  expect(saved.notes).toHaveLength(1);
  expect(saved.portrait).toBe("");
  await page.reload();
  await page.getByRole("textbox", { name: "Find a character" }).fill(`${testPrefix}Mira`);
  await page.locator(".character-list-item").click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Occupation", exact: true }).fill("Royal cartographer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".character-tags")).toContainText("Royal cartographer");
  await page.getByRole("button", { name: "Character actions", exact: true }).click();
  await page.getByRole("button", { name: "Delete character", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete character", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("long generated text imports Legend stars, spell slots, tactics, and quests cleanly", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character text" }).fill(`${testPrefix}Daraelle\nGhostwise Halfling, 41 years (adult), she/her, Small, speed 25 ft\nLucky, brave, and nimble enough to slip past larger creatures.\n\nAt a glance\n  Voice: wry and observant\n  First impression: Cool and collected\n\nFaith & religion\n  Deity affinity: Naskyros — The Sunken King\n\nCombat statistics\n  Combat class: Archmage · Exceptional\n  Challenge rating: 12\n  Armour Class: 12\n  Hit Points: 222 (18d8+18)\n  Ability scores: STR 12 (+1) · DEX 14 (+2) · CON 14 (+2) · INT 20 (+5) · WIS 15 (+2) · CHA 16 (+3)\n  Saving throws: INT +7, WIS +4\n  Attack: Dagger · +8 to hit · 1d4 + 2 piercing\n  Class features explained: Arcane Recovery — Once per day after a short rest, recover expended spell slots.; Relentless — Drops to 1 hit point instead of 0.\n  Skills: Arcana +7\n  Limited-use resources: 4×1st-level slot, 3×2nd-level slot, 1×9th-level slot\n  Spellcasting: Monster Manual 2014 archmage + INT (Monster Manual 2014 archmage; Combat class. INT save DC 15, spell attack +7; spells: fire bolt, shield, fireball, meteor swarm. Daily uses and spell slots appear on the individual spell actions.)\n\nQuest they can offer\n  Quest: Locate a source, specimen or missing research\n  Reward: Research access or payment\n\nCombat tactics\n  Combat role: Ranged controller / spell support\n  Preferred positioning: Prefer cover and distance\n\nLegend profile\n  Legend status: Legend-qualified · 5/5 stars\n\nSeed: 759061`);
  await page.getByRole("dialog").getByRole("button", { name: "Import character", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${testPrefix}Daraelle`, exact: true })).toBeVisible();
  await expect(page.locator(".character-header .legend-stars")).toHaveText("★★★★★");
  await expect(page.locator(".character-header .legend-badge strong")).toHaveText("Legend");
  await expect(page.locator(".deity-dd")).toContainText("Naskyros — The Sunken King");
  const data = await (await request.get("/api/characters")).json();
  const c = data.characters.find((c: { name: string }) => c.name === `${testPrefix}Daraelle`);
  expect(c.legendStars).toBe(5);
  expect(c.maxHp).toBe(222);
  expect(c.hitDice).toBe("18d8+18");
  expect(c.combatTactics).toContain("Ranged controller");
  expect(c.questOffer).toContain("Locate a source");
});

test("tablet selector, mobile layout, and single-window desktop sheet", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const footer = await page.locator(".sheet-footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(900);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  const laptopSheet = await page.locator(".character-sheet").boundingBox();
  expect(laptopSheet!.y + laptopSheet!.height).toBeLessThanOrEqual(800);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Expand for session mode", exact: true }).click();
  const focusedSheet = await page.locator(".character-sheet").boundingBox();
  expect(focusedSheet!.y + focusedSheet!.height).toBeLessThanOrEqual(768);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(300);
  await expect(page.getByRole("combobox", { name: "Choose a character", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Choose a character", exact: true }).selectOption("daraelle");
  await expect(page.getByRole("heading", { name: "Daraelle", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Toggle navigation", exact: true }).click();
  await expect(page.locator(".sidebar")).toBeInViewport();
});
