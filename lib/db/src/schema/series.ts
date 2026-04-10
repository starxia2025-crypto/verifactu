import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";

export const invoiceSeriesTable = pgTable("invoice_series", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  prefix: text("prefix").notNull(), // e.g., "A", "F", "R"
  name: text("name").notNull(),
  currentNumber: integer("current_number").notNull().default(1),
  year: integer("year").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSeriesSchema = createInsertSchema(invoiceSeriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoiceSeries = z.infer<typeof insertInvoiceSeriesSchema>;
export type InvoiceSeries = typeof invoiceSeriesTable.$inferSelect;
