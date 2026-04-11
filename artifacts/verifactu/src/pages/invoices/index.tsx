import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { getListInvoicesQueryKey, useCreateInvoice, useDeleteInvoice, useListInvoices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { BulkImportDialog, type ImportRow } from "@/components/bulk-import-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function formatMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} €`;
}

export default function InvoicesPage() {
  const { taxpayer } = useAppContext();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const { data: invoicesResponse, isLoading } = useListInvoices(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer } as any
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "DRAFT": return <Badge variant="secondary">{t("invoices.draft")}</Badge>;
      case "EMITTED": return <Badge variant="default" className="bg-blue-600">{t("invoices.emitted")}</Badge>;
      case "CANCELLED": return <Badge variant="destructive">{t("invoices.cancelled")}</Badge>;
      case "RECTIFIED": return <Badge variant="outline" className="text-orange-600 border-orange-600">{t("invoices.rectified")}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const readCell = (row: ImportRow, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
  };

  const importInvoices = async (rows: ImportRow[]) => {
    if (!taxpayer) return;
    for (const row of rows) {
      const description = readCell(row, ["description", "descripcion", "descripción"]);
      if (!description) continue;
      await createInvoice.mutateAsync({
        taxpayerId: taxpayer.id,
        data: {
          clientId: null,
          invoiceType: "STANDARD",
          issueDate: readCell(row, ["issueDate", "fecha"]) || null,
          notes: readCell(row, ["notes", "notas"]) || null,
          emitImmediately: ["true", "si", "sí", "1"].includes(readCell(row, ["emitImmediately", "emitir"]).toLowerCase()),
          lines: [{
            description,
            quantity: Number(readCell(row, ["quantity", "cantidad"]) || 1),
            unitPrice: Number(readCell(row, ["unitPrice", "precio", "precioUnitario"]) || 0),
            vatRate: Number(readCell(row, ["vatRate", "iva"]) || taxpayer.defaultVatRate || 21),
            discount: Number(readCell(row, ["discount", "descuento"]) || 0),
            productId: null,
            sortOrder: 0,
          }],
        },
      });
    }
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(taxpayer.id) });
  };

  const handleDelete = (invoice: any) => {
    if (!taxpayer) return;
    deleteInvoice.mutate(
      { id: invoice.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(taxpayer.id) });
          toast({ title: t("common.deleted") });
        },
        onError: () => toast({ variant: "destructive", title: t("common.deleteFailed") }),
      },
    );
  };

  const importColumns =
    language === "es"
      ? ["descripcion", "cantidad", "precioUnitario", "iva", "descuento", "fecha", "notas", "emitir"]
      : ["description", "quantity", "unitPrice", "vatRate", "discount", "issueDate", "notes", "emitImmediately"];
  const sampleRow =
    language === "es"
      ? {
          descripcion: "Servicio de consultoria",
          cantidad: 1,
          precioUnitario: 250,
          iva: 21,
          descuento: 0,
          fecha: new Date().toISOString().split("T")[0],
          notas: "Factura de ejemplo",
          emitir: "no",
        }
      : {
          description: "Consulting service",
          quantity: 1,
          unitPrice: 250,
          vatRate: 21,
          discount: 0,
          issueDate: new Date().toISOString().split("T")[0],
          notes: "Sample invoice",
          emitImmediately: "no",
        };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog
              title={`${t("import.button")} - ${t("invoices.title")}`}
              columns={importColumns}
              sampleRow={sampleRow}
              templateFileName={language === "es" ? "plantilla-facturas.xlsx" : "invoices-template.xlsx"}
              onImport={importInvoices}
            />
            <Button asChild>
              <Link href="/invoices/new">{t("invoices.create")}</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("invoices.all")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>{t("invoices.loading")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices.number")}</TableHead>
                    <TableHead>{t("invoices.date")}</TableHead>
                    <TableHead>{t("invoices.client")}</TableHead>
                    <TableHead>{t("invoices.amount")}</TableHead>
                    <TableHead>{t("invoices.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesResponse?.items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber || t("invoices.draft")}</TableCell>
                      <TableCell>{invoice.issueDate ? format(new Date(invoice.issueDate), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell>{invoice.client?.name || "-"}</TableCell>
                      <TableCell>{formatMoney(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/invoices/${invoice.id}`}>{t("invoices.view")}</Link>
                          </Button>
                          {invoice.status === "DRAFT" && (
                            <>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/invoices/${invoice.id}/edit`}>{t("common.edit")}</Link>
                              </Button>
                              <ConfirmDeleteDialog
                                itemName={invoice.invoiceNumber || t("invoices.draft")}
                                isDeleting={deleteInvoice.isPending}
                                onConfirm={() => handleDelete(invoice)}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoicesResponse?.items || invoicesResponse.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        {t("invoices.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
