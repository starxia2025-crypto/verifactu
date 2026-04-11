import { index, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { taxpayerProfilesTable } from "./taxpayers";
import { invoicesTable } from "./invoices";
import { verifactuRecordsTable } from "./verifactu";

export const sifEventsTable = pgTable("sif_events", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id),
  verifactuRecordId: integer("verifactu_record_id").references(() => verifactuRecordsTable.id),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  previousEventHash: text("previous_event_hash"),
  eventHashInput: text("event_hash_input").notNull(),
  eventHash: text("event_hash").notNull(),
  payload: text("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    taxpayerOccurredIdx: index("sif_events_taxpayer_occurred_idx").on(table.taxpayerId, table.occurredAt),
    invoiceIdx: index("sif_events_invoice_idx").on(table.invoiceId),
    recordIdx: index("sif_events_record_idx").on(table.verifactuRecordId),
  };
});

export const insertSifEventSchema = createInsertSchema(sifEventsTable).omit({ id: true, createdAt: true });
export type InsertSifEvent = z.infer<typeof insertSifEventSchema>;
export type SifEvent = typeof sifEventsTable.$inferSelect;
