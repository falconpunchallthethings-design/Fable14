import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Character } from "@/lib/characters";

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
});
export const workspaceSettings = pgTable("fable_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
