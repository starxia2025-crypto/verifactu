import { index, pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";
import { verifactuRecordsTable } from "./verifactu";

export const aeatSubmissionsTable = pgTable("aeat_submissions", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  verifactuRecordId: integer("verifactu_record_id").notNull().references(() => verifactuRecordsTable.id),
  environment: text("environment").notNull().default("sandbox"),
  status: text("status").notNull().default("QUEUED"), // QUEUED, SENT, ACCEPTED, ACCEPTED_WITH_ERRORS, REJECTED, ERROR
  requestPayload: text("request_payload").notNull(),
  responsePayload: text("response_payload"),
  csv: text("csv"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    taxpayerStatusIdx: index("aeat_submissions_taxpayer_status_idx").on(table.taxpayerId, table.status),
    recordIdx: index("aeat_submissions_record_idx").on(table.verifactuRecordId),
  };
});

export const insertAeatSubmissionSchema = createInsertSchema(aeatSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertAeatSubmission = z.infer<typeof insertAeatSubmissionSchema>;
export type AeatSubmission = typeof aeatSubmissionsTable.$inferSelect;
