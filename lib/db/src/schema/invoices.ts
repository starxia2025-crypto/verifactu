import { index, pgTable, serial, text, timestamp, integer, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { taxpayerProfilesTable } from "./taxpayers";
import { clientsTable } from "./clients";
import { invoiceSeriesTable } from "./series";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  taxpayerId: integer("taxpayer_id").notNull().references(() => taxpayerProfilesTable.id),
  seriesId: integer("series_id").references(() => invoiceSeriesTable.id),
  clientId: integer("client_id").references(() => clientsTable.id),
  invoiceNumber: text("invoice_number"), // null until emitted
  invoiceType: text("invoice_type").notNull().default("STANDARD"), // STANDARD, SIMPLIFIED, RECTIFICATION, CANCELLATION
  status: text("status").notNull().default("DRAFT"), // DRAFT, EMITTED, CANCELLED, RECTIFIED
  issueDate: date("issue_date"),
  operationDate: date("operation_date"),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 4 }).notNull().default("0"),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 4 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 4 }).notNull().default("0"),
  notes: text("notes"),
  paymentMethod: text("payment_method"), // EFECTIVO, TRANSFERENCIA, TARJETA, etc.
  originSource: text("origin_source").notNull().default("MANUAL"), // MANUAL, AI_DRAFT
  rectifiedInvoiceId: integer("rectified_invoice_id"),
  cancellationReason: text("cancellation_reason"),
  emittedAt: timestamp("emitted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return {
    taxpayerSeriesNumberUnique: uniqueIndex("invoices_taxpayer_series_number_unique").on(table.taxpayerId, table.seriesId, table.invoiceNumber),
    taxpayerStatusIdx: index("invoices_taxpayer_status_idx").on(table.taxpayerId, table.status),
    taxpayerCreatedIdx: index("invoices_taxpayer_created_idx").on(table.taxpayerId, table.createdAt),
  };
});

export const invoiceLinesTable = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 4 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 14, scale: 4 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 14, scale: 4 }).notNull(),
  total: numeric("total", { precision: 14, scale: 4 }).notNull(),
  productId: integer("product_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    invoiceIdx: index("invoice_lines_invoice_idx").on(table.invoiceId),
  };
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceLineSchema = createInsertSchema(invoiceLinesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceLine = z.infer<typeof insertInvoiceLineSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InvoiceLine = typeof invoiceLinesTable.$inferSelect;
