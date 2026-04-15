import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const taxpayerProfilesTable = pgTable("taxpayer_profiles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id),
  name: text("name").notNull(),
  tradeName: text("trade_name"),
  nif: text("nif").notNull(),
  nifType: text("nif_type").notNull().default("NIF"), // NIF, NIE, CIF, PASSPORT, OTHER
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  province: text("province").notNull(),
  country: text("country").notNull().default("ES"),
  email: text("email"),
  phone: text("phone"),
  defaultVatRate: numeric("default_vat_rate", { precision: 5, scale: 2 }).notNull().default("21"),
  sifInstallationNumber: text("sif_installation_number"),
  sifProductCode: text("sif_product_code").default("VERIFACTU-SIF-v1"),
  aeatEnvironment: text("aeat_environment").notNull().default("sandbox"), // sandbox, production
  aeatCertificatePath: text("aeat_certificate_path"),
  aeatCertificateFileName: text("aeat_certificate_file_name"),
  aeatCertificatePasswordEncrypted: text("aeat_certificate_password_encrypted"),
  aeatCertificateUploadedAt: timestamp("aeat_certificate_uploaded_at", { withTimezone: true }),
  aeatUseSealCertificateEndpoint: boolean("aeat_use_seal_certificate_endpoint").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxpayerProfileSchema = createInsertSchema(taxpayerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxpayerProfile = z.infer<typeof insertTaxpayerProfileSchema>;
export type TaxpayerProfile = typeof taxpayerProfilesTable.$inferSelect;
