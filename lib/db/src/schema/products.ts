import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 4 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("21"),
  unit: text("unit"), // unidad, hora, kg, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
