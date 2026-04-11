import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";

export const integrationSourcesTable = pgTable("integration_sources", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // excel, csv, postgres, mysql, sqlserver, dbf
  status: text("status").notNull().default("draft"), // draft, ready, error
  config: jsonb("config").notNull().default({}),
  lastTestStatus: text("last_test_status"),
  lastTestMessage: text("last_test_message"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIntegrationSourceSchema = createInsertSchema(integrationSourcesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIntegrationSource = z.infer<typeof insertIntegrationSourceSchema>;
export type IntegrationSource = typeof integrationSourcesTable.$inferSelect;
