import { test, expect } from "@playwright/test";
import { toMarkdown } from "../src/lib/exports";
import type { Character } from "../src/lib/characters";

test.afterEach(async ({ request }) => {
  const data = await (await request.get("/api/characters")).json();
  for (const c of data.characters) if (c.name.startsWith("Fable QA ")) await request.delete(`/api/characters/${c.id}`);
});

test("Obsidian Markdown round-trip preserves the compact profile and current HP", async ({ page, request }) => {
  const workspace = await (await request.get("/api/characters")).json();
  const edic = workspace.characters.find((c: Character) => c.id === "edic-dorianon") as Character;
  const markdown = toMarkdown({ ...edic, name: "Fable QA Markdown", hp: 2 }, false, false);
  await page.goto("/");
  await page.getByRole("button", { name: "Import character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character text", exact: true }).fill(markdown);
  await page.getByRole("dialog").getByRole("button", { name: "Import character", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fable QA Markdown", exact: true })).toBeVisible();
  const updated = await (await request.get("/api/characters")).json();
  const imported = updated.characters.find((c: Character) => c.name === "Fable QA Markdown") as Character;
  expect(imported.ancestry).toBe(edic.ancestry);
  expect(imported.occupation).toBe(edic.occupation);
  expect(imported.location).toBe(edic.location);
  expect(imported.background).toBe(edic.background);
  expect(imported.faith).toBe(edic.faith);
  expect(imported.age).toBe("34");
  expect(imported.pronouns).toBe("she/her");
  expect(imported.goal).toBe(edic.goal);
  expect(imported.traits).toEqual(edic.traits);
  expect(imported.abilities).toEqual(edic.abilities);
  expect(imported.hp).toBe(2);
  expect(imported.maxHp).toBe(4);
  expect(imported.languages).toBe(edic.languages);
});

test("workspace backup reuses matching collections and preserves all notes", async ({ page, request }) => {
  const workspace = await (await request.get("/api/characters")).json();
  const edic = workspace.characters.find((c: Character) => c.id === "edic-dorianon") as Character;
  const backup = { version: 1, collections: [{ id: "old-workspace-rimel", name: "The Rimel campaign", color: "#a6b48c" }], characters: [{ ...edic, name: "Fable QA Backup", collectionId: "old-workspace-rimel" }] };
  await page.goto("/");
  await page.getByRole("button", { name: "Import character", exact: true }).click();
  await page.getByRole("textbox", { name: "Character text", exact: true }).fill(JSON.stringify(backup));
  await page.getByRole("dialog").getByRole("button", { name: "Import character", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fable QA Backup", exact: true })).toBeVisible();
  const updated = await (await request.get("/api/characters")).json();
  const imported = updated.characters.find((c: Character) => c.name === "Fable QA Backup") as Character;
  expect(imported.collectionId).toBe("rimel");
  expect(imported.notes).toEqual(edic.notes);
  expect(imported.details).toEqual(edic.details);
  expect(updated.collections).toHaveLength(workspace.collections.length);
});
