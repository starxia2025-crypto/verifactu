import { Link } from "wouter";
import { useGetInvoice } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

function formatMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} €`;
}

function buildQrImageUrl(qrUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(qrUrl)}`;
}

function AeatStatusBadge({ status, t }: { status?: string; t: ReturnType<typeof useLanguage>["t"] }) {
  switch (status) {
    case "ACCEPTED":
      return <Badge className="bg-emerald-600">{t("aeat.accepted")}</Badge>;
    case "ACCEPTED_WITH_ERRORS":
      return <Badge className="bg-amber-600">{t("aeat.acceptedWithErrors")}</Badge>;
    case "SUBMITTED":
      return <Badge className="bg-blue-600">{t("aeat.submitted")}</Badge>;
    case "REJECTED":
    case "ERROR":
      return <Badge variant="destructive">{t("aeat.error")}</Badge>;
    case "PENDING":
      return <Badge variant="outline" className="border-sky-300 text-sky-700">{t("aeat.pending")}</Badge>;
    default:
      return <Badge variant="secondary">{t("aeat.notSent")}</Badge>;
  }
}

export default function InvoiceDetailPage({ id }: { id: number }) {
  const { t } = useLanguage();
  const { data: invoice, isLoading } = useGetInvoice(id, { query: { enabled: Number.isFinite(id) } as any });

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {invoice?.invoiceNumber || t("invoices.draft")}
          </h1>
          <div className="flex gap-2">
            {invoice?.status === "DRAFT" && (
              <Button asChild>
                <Link href={`/invoices/${id}/edit`}>{t("common.edit")}</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/invoices">{t("taxpayer.back")}</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p>{t("common.loading")}</p>
        ) : !invoice ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">{t("common.notFound")}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader>
                  <CardTitle>{t("invoices.invoiceData")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <p><strong>{t("invoices.client")}:</strong> {invoice.client?.name || "-"}</p>
                  <p><strong>{t("invoices.date")}:</strong> {invoice.issueDate || "-"}</p>
                  <p><strong>{t("invoices.status")}:</strong> {invoice.status}</p>
                  <p><strong>{t("invoices.amount")}:</strong> {formatMoney(invoice.total)}</p>
                  <p><strong>{t("aeat.status")}:</strong> <AeatStatusBadge status={invoice.verifactuRecord?.status} t={t} /></p>
                  {invoice.verifactuRecord?.aeatCsv && (
                    <p><strong>{t("aeat.csv")}:</strong> {invoice.verifactuRecord.aeatCsv}</p>
                  )}
                  {invoice.verifactuRecord?.aeatErrorMessage && (
                    <p className="text-destructive md:col-span-2"><strong>{t("aeat.errorDetail")}:</strong> {invoice.verifactuRecord.aeatErrorMessage}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("aeat.qrVerification")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoice.verifactuRecord?.qrUrl ? (
                    <div className="space-y-4">
                      <a href={invoice.verifactuRecord.qrUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border bg-white p-4 shadow-sm transition hover:border-primary/40">
                        <img
                          src={buildQrImageUrl(invoice.verifactuRecord.qrUrl)}
                          alt={t("aeat.qr")}
                          className="mx-auto h-44 w-44"
                        />
                      </a>
                      <p className="break-all text-xs text-muted-foreground">{invoice.verifactuRecord.qrUrl}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("aeat.noQr")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

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
