import { test, expect } from "@playwright/test";

const testPrefix = "Fable QA ";
test.afterEach(async ({ request }) => {
  const data = await (await request.get("/api/characters")).json();
  for (const c of data.characters) if (c.name.startsWith(testPrefix)) await request.delete(`/api/characters/${c.id}`);
});

test("library, favorites, player-facing Kanka export, night mode, and session mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Edic Dorianon", exact: true })).toBeVisible();

  // Verify no built-in AI portrait is rendered by default
  await expect(page.locator(".hero-portrait")).toHaveCount(0);

  // Night mode toggle
  await page.getByRole("button", { name: "Switch to night mode", exact: true }).click();
  await expect(page.locator(".app-shell.dark-mode")).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
  await expect(page.locator(".app-shell.dark-mode")).toHaveCount(0);

  // Search & favorites
  await page.getByRole("textbox", { name: "Find a character" }).fill("herbalist");
  await expect(page.locator(".character-list-item")).toHaveCount(1);
  await page.locator(".character-list-item").click();
  await expect(page.getByRole("heading", { name: "Sera Willowmere", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByRole("button", { name: /Favorites/ }).click();
  await expect(page.locator(".character-list-item")).toHaveCount(3);
  await page.locator(".character-list-item").filter({ hasText: "Edic Dorianon" }).click();

  // Full profile & Session sheet tabs
  await page.getByRole("tab", { name: "Full profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Power profile", exact: true })).toBeAttached();
  await page.getByRole("tab", { name: "Session sheet", exact: true }).click();

  // Exports: Obsidian (GM) vs Kanka (strictly player-facing)
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".export-preview pre")).toContainText("type: npc");
  const md = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md", exact: true }).click();
  expect((await md).suggestedFilename()).toBe("edic-dorianon.md");

  await page.getByRole("button", { name: /Kanka/ }).click();
  await expect(page.locator(".kanka-player-safe-banner")).toContainText("Player-facing only");
  const kankaPreview = await page.locator(".export-preview pre").textContent();
  expect(kankaPreview).toContain("<h1>Edic Dorianon</h1>");
  expect(kankaPreview).toContain("Serious and studious");
  expect(kankaPreview).toContain("Dry and understated");
  // Strictly exclude GM-only secrets, combat stats, and seed
  expect(kankaPreview).not.toContain("funnier than she appears");
  expect(kankaPreview).not.toContain("Stop something from happening");
  expect(kankaPreview).not.toContain("Armour Class");
  expect(kankaPreview).not.toContain("487644");

  const html = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .html", exact: true }).click();
  expect((await html).suggestedFilename()).toBe("edic-dorianon.html");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  // Session mode
  await page.getByRole("button", { name: "Expand for session mode", exact: true }).click();
  await expect(page.locator(".session-focus-bar")).toBeVisible();
  await page.getByRole("button", { name: "Next character", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ariun Silverleaf", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".page-heading")).toBeVisible();
  expect(errors).toEqual([]);
});

test("locations & sublocations hierarchy and Combat Mode with Ariun Silverleaf", async ({ page }) => {
  await page.goto("/");

  // Click parent location Almateira in sidebar -> should show Ariun Silverleaf from sublocation Old-World Wine Vaults
  await page.locator(".sidebar-folder-row").filter({ hasText: "Almateira" }).locator(".folder-select-btn").click();
  await expect(page.getByRole("heading", { name: "Ariun Silverleaf", exact: true })).toBeVisible();
  await expect(page.locator(".sheet-eyebrow")).toContainText("Almateira › Old-World Wine Vaults");
  await expect(page.locator(".spellcasting-line")).toContainText("CHA (Save DC 11, spell attack +3)");
  await expect(page.locator(".sidearm-line")).toContainText("Dagger");

  // Open Combat Mode
  await page.getByRole("button", { name: /Combat mode/ }).first().click();
  await expect(page.locator(".combat-workspace")).toBeVisible();
  await expect(page.locator(".combatant-pill").filter({ hasText: "Ariun Silverleaf" })).toBeVisible();
  await expect(page.locator(".combatant-pill").filter({ hasText: "Captain Varek" })).toBeVisible();

  // Select Ariun Silverleaf in combat strip and inspect all combat info
  await page.locator(".combatant-pill").filter({ hasText: "Ariun Silverleaf" }).click();
  await expect(page.locator(".combat-sheet h2")).toHaveText("Ariun Silverleaf");
  await expect(page.locator(".combat-class-badge")).toContainText("Warlock · Veteran");
  await expect(page.locator(".combat-spellcasting-box")).toContainText("CHA (Save DC 11, spell attack +3)");
  await expect(page.locator(".combat-action-pill").filter({ hasText: "eldritch blast (at-will)" })).toBeVisible();
  await expect(page.locator(".combat-action-pill").filter({ hasText: /^counterspell$/i })).toBeVisible();

  // Mark a spell action as used and toggle a condition
  const counterspellPill = page.locator(".combat-action-pill").filter({ hasText: /^counterspell$/i });
  await counterspellPill.click();
  await expect(counterspellPill).toHaveClass(/is-used/);

  const hexCondition = page.locator(".condition-chip").filter({ hasText: "Hex / Mark" });
  await hexCondition.click();
  await expect(hexCondition).toHaveClass(/active/);

  // Switch combatant to Captain Varek via Next turn or clicking pill
  await page.locator(".combatant-pill").filter({ hasText: "Captain Varek" }).click();
  await expect(page.locator(".combat-sheet h2")).toHaveText("Captain Varek");
  await expect(page.locator(".combat-attack-card").first()).toContainText("Longsword");

  // Exit combat mode back to library
  await page.getByRole("button", { name: "Back to library", exact: true }).click();
  await expect(page.locator(".page-heading")).toBeVisible();
});

test("create, edit, HP, notes, persistence and delete", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character name" }).fill(`${testPrefix}Mira`);
  await page.getByRole("textbox", { name: "Occupation", exact: true }).fill("Cartographer");
  await page.getByRole("tab", { name: "At the table", exact: true }).click();
  await page.getByRole("textbox", { name: "Voice", exact: true }).fill("Bright and inquisitive");
  await page.getByRole("button", { name: "Create character", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${testPrefix}Mira`, exact: true })).toBeVisible();
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
  expect(saved.notes).toHaveLength(1);
  expect(saved.voice).toBe("Bright and inquisitive");
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
  const after = await (await request.get("/api/characters")).json();
  expect(after.characters.find((c: { id: string }) => c.id === saved.id)).toBeUndefined();
});

test("long generated text imports spells, sidearms, and combat traits cleanly", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character text" }).fill(`${testPrefix}Ariun\nSea Elf, 631 years (old), he/him, Medium, speed 30 ft\nDarkvision, keen senses, trance instead of sleep, resistant to charm. Aquatic elven lineage.\n\nAt a glance\n  Voice: quick and teasing\n  First impression: Elegant and refined\n\nLife & path\n  Occupation: Merchant / Trader — wine and spirits\n  Current goal: Explore somewhere unknown\n\nCombat statistics\n  Combat class: Warlock · Veteran (Archetype determines the NPC’s combat training and signature mechanics.)\n  Challenge rating: 1/2\n  Armour Class: 10 (Unarmoured)\n  Sidearm: Dagger · carried · +5 to hit · 1d4 + 1 piercing (class feature bonus +2 damage) (Alternate carried weapon.)\n  Hit Points: 5 (1d8) (Damage the NPC can take before falling to 0 hit points.)\n  Ability scores: STR 12 (+1) · DEX 10 (+0) · CON 10 (+0) · INT 16 (+3) · WIS 11 (+0) · CHA 12 (+1)\n  Saving throws: INT +5, WIS +2\n  Attack: Light crossbow · +4 to hit · 1d8 piercing (class feature bonus +2 damage) (Main at-will attack.)\n  Additional actions: eldritch blast ; Cast armor of agathys ; Cast counterspell\n  Skills: Deception +3, Persuasion +3, Perception +2 (Use these bonuses for checks involving the named skills.)\n  Movement & senses: walk 30 ft. · swim 30 ft. · darkvision 60 ft.\n  Spellcasting: CHA (Combat class. CHA save DC 11, spell attack +3; spells: armor of agathys, hex, counterspell. Daily uses and spell slots appear on the individual spell actions.)\n\nTraits\n  Whimsical: Very strong\n  Affectionate: Strong\n\nUnder pressure\n  Under physical threat: reacts first and thinks later, fast to anger in a real fight\n\nSeed: 673299`);
  await page.getByRole("dialog").getByRole("button", { name: "Import character", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${testPrefix}Ariun`, exact: true })).toBeVisible();
  await expect(page.locator(".skills-line")).toContainText("Deception +3");
  await expect(page.locator(".spellcasting-line")).toContainText("CHA (CHA save DC 11, spell attack +3; spells: armor of agathys, hex, counterspell)");
  await expect(page.locator(".sidearm-line")).toContainText("Dagger");
  const data = await (await request.get("/api/characters")).json();
  const c = data.characters.find((c: { name: string }) => c.name === `${testPrefix}Ariun`);
  expect(c.abilities.INT).toBe(16);
  expect(c.hitDice).toBe("1d8");
  expect(c.savingThrows).toBe("INT +5, WIS +2");
  expect(c.threatResponse).toContain("reacts first and thinks later");
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
  await page.getByRole("combobox", { name: "Choose a character", exact: true }).selectOption("ariun-silverleaf");
  await expect(page.getByRole("heading", { name: "Ariun Silverleaf", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Toggle navigation", exact: true }).click();
  await expect(page.locator(".sidebar")).toBeInViewport();
});
