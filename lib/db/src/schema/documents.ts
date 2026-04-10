import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";
import { invoicesTable } from "./invoices";

export const uploadedDocumentsTable = pgTable("uploaded_documents", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // pdf, jpg, png, etc.
  ocrStatus: text("ocr_status").notNull().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
  linkedInvoiceId: integer("linked_invoice_id").references(() => invoicesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ocrExtractionsTable = pgTable("ocr_extractions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => uploadedDocumentsTable.id).unique(),
  isInvoice: boolean("is_invoice"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  supplierName: text("supplier_name"),
  supplierNif: text("supplier_nif"),
  clientName: text("client_name"),
  clientNif: text("client_nif"),
  invoiceNumber: text("invoice_number"),
  issueDate: text("issue_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 4 }),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 4 }),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }),
  total: numeric("total", { precision: 14, scale: 4 }),
  iban: text("iban"),
  rawText: text("raw_text"),
  // JSON stored as text for per-field confidence
  fieldConfidencesJson: text("field_confidences_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOcrExtractionSchema = createInsertSchema(ocrExtractionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;
export type InsertOcrExtraction = z.infer<typeof insertOcrExtractionSchema>;
export type UploadedDocument = typeof uploadedDocumentsTable.$inferSelect;
export type OcrExtraction = typeof ocrExtractionsTable.$inferSelect;
