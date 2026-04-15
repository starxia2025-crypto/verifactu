import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";
import { usersTable } from "./users";

export const aeatCertificatesTable = pgTable("aeat_certificates", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  status: text("status").notNull().default("INACTIVE"), // ACTIVE, INACTIVE, REVOKED, EXPIRED, INVALID
  originalFileName: text("original_file_name").notNull(),
  storedFilePath: text("stored_file_path").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  subject: text("subject"),
  issuer: text("issuer"),
  serialNumber: text("serial_number"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  nif: text("nif"),
  hasPrivateKey: boolean("has_private_key").notNull().default(false),
  fingerprintSha256: text("fingerprint_sha256"),
  useSealCertificateEndpoint: boolean("use_seal_certificate_endpoint").notNull().default(false),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => usersTable.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  lastValidationError: text("last_validation_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  taxpayerIdx: index("aeat_certificates_taxpayer_idx").on(table.taxpayerId),
  statusIdx: index("aeat_certificates_status_idx").on(table.status),
  fingerprintIdx: index("aeat_certificates_fingerprint_idx").on(table.fingerprintSha256),
  oneActivePerTaxpayer: uniqueIndex("aeat_certificates_one_active_per_taxpayer")
    .on(table.taxpayerId)
    .where(sql`${table.status} = 'ACTIVE'`),
}));

export const insertAeatCertificateSchema = createInsertSchema(aeatCertificatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAeatCertificate = z.infer<typeof insertAeatCertificateSchema>;
export type AeatCertificate = typeof aeatCertificatesTable.$inferSelect;
