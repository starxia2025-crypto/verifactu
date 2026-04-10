import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { taxpayerProfilesTable } from "./taxpayers";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  taxpayerId: integer("taxpayer_id").references(() => taxpayerProfilesTable.id),
  action: text("action").notNull(), // e.g., INVOICE_CREATED, INVOICE_EMITTED, VERIFACTU_SUBMITTED
  entityType: text("entity_type"), // invoice, verifactu_record, etc.
  entityId: integer("entity_id"),
  description: text("description"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
