import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Character, EncounterTemplate } from "@/lib/characters";

export const npcCharacters = pgTable("fable_characters", {
  id: text("id").primaryKey(),
  profile: jsonb("profile").$type<Character>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const npcCollections = pgTable("fable_collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#a6b48c"),
  parentId: text("parent_id"),
  kind: text("kind").notNull().default("region"),
});
export const npcEncounters = pgTable("fable_encounters", {
  id: text("id").primaryKey(),
  encounter: jsonb("encounter").$type<EncounterTemplate>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const workspaceSettings = pgTable("fable_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
