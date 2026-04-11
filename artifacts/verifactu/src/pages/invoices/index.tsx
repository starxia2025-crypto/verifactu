import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListInvoices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";

export default function InvoicesPage() {
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();
  const { data: invoicesResponse, isLoading } = useListInvoices(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer }
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
          <Button asChild>
            <Link href="/invoices/new">{t("invoices.create")}</Link>
          </Button>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesResponse?.items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber || t("invoices.draft")}</TableCell>
                      <TableCell>{invoice.issueDate ? format(new Date(invoice.issueDate), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell>{invoice.client?.name || "-"}</TableCell>
                      <TableCell>{invoice.total.toFixed(2)} €</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}`}>{t("invoices.view")}</Link>
                        </Button>
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
