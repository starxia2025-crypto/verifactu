import { index, pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { invoicesTable } from "./invoices";
import { taxpayerProfilesTable } from "./taxpayers";

export const verifactuRecordsTable = pgTable("verifactu_records", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  chainSequence: integer("chain_sequence").notNull().default(0),
  recordType: text("record_type").notNull().default("ALTA"), // ALTA, ANULACION, SUBSANACION
  status: text("status").notNull().default("PENDING"), // PENDING, SUBMITTED, ACCEPTED, ACCEPTED_WITH_ERRORS, REJECTED, ERROR
  hashAlgorithm: text("hash_algorithm").notNull().default("SHA-256"),
  hashInput: text("hash_input").notNull().default(""),
  hash: text("hash").notNull().default(""), // SHA-256 hash of this record
  previousHash: text("previous_hash"), // hash of previous record (chaining)
  qrUrl: text("qr_url"), // QR verification URL
  xmlPayload: text("xml_payload"), // full XML sent to AEAT
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  aeatResponse: text("aeat_response"), // raw AEAT SOAP response
  aeatCsv: text("aeat_csv"), // AEAT CSV identifier
  aeatErrorCode: text("aeat_error_code"),
  aeatErrorMessage: text("aeat_error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return {
    invoiceRecordTypeUnique: uniqueIndex("verifactu_records_invoice_record_type_unique").on(table.invoiceId, table.recordType),
    taxpayerChainUnique: uniqueIndex("verifactu_records_taxpayer_chain_unique").on(table.taxpayerId, table.chainSequence),
    taxpayerStatusIdx: index("verifactu_records_taxpayer_status_idx").on(table.taxpayerId, table.status),
    taxpayerCreatedIdx: index("verifactu_records_taxpayer_created_idx").on(table.taxpayerId, table.createdAt),
  };
});

export const insertVeriFactuRecordSchema = createInsertSchema(verifactuRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVeriFactuRecord = z.infer<typeof insertVeriFactuRecordSchema>;
export type VeriFactuRecord = typeof verifactuRecordsTable.$inferSelect;
