import { sql } from "drizzle-orm";
import { text, sqliteTable } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull().unique(),
  url: text("url").notNull(),
  wechat: text("wechat").notNull(),
  group: text("group_name").notNull(),
  title: text("title").notNull(),
  intro: text("intro").notNull(),
  type: text("type").notNull(),
  tags: text("tags").notNull().default("[]"),
  coverImage: text("cover_image").notNull().default(""),
  raw: text("raw").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
