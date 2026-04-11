import { Link } from "wouter";
import { useGetInvoice } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";

function formatMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} €`;
}

export default function InvoiceDetailPage({ id }: { id: number }) {
  const { t } = useLanguage();
  const { data: invoice, isLoading } = useGetInvoice(id, { query: { enabled: Number.isFinite(id) } });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {invoice?.invoiceNumber || t("invoices.draft")}
          </h1>
          <Button variant="outline" asChild>
            <Link href="/invoices">{t("taxpayer.back")}</Link>
          </Button>
        </div>

        {isLoading ? (
          <p>{t("common.loading")}</p>
        ) : !invoice ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">{t("common.notFound")}</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("invoices.invoiceData")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <p><strong>{t("invoices.client")}:</strong> {invoice.client?.name || "-"}</p>
                <p><strong>{t("invoices.date")}:</strong> {invoice.issueDate || "-"}</p>
                <p><strong>{t("invoices.status")}:</strong> {invoice.status}</p>
                <p><strong>{t("invoices.amount")}:</strong> {formatMoney(invoice.total)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("invoices.line")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("invoices.description")}</TableHead>
                      <TableHead>{t("invoices.quantity")}</TableHead>
                      <TableHead>{t("invoices.unitPrice")}</TableHead>
                      <TableHead>{t("invoices.vatRate")}</TableHead>
                      <TableHead>{t("invoices.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{formatMoney(line.unitPrice)}</TableCell>
                        <TableCell>{line.vatRate}%</TableCell>
                        <TableCell>{formatMoney(line.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
