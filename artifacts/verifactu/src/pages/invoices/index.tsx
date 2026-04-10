import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListInvoices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function InvoicesPage() {
  const { taxpayer } = useAppContext();
  const { data: invoicesResponse, isLoading } = useListInvoices(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer }
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "DRAFT": return <Badge variant="secondary">Draft</Badge>;
      case "EMITTED": return <Badge variant="default" className="bg-blue-600">Emitted</Badge>;
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>;
      case "RECTIFIED": return <Badge variant="outline" className="text-orange-600 border-orange-600">Rectified</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <Button asChild>
            <Link href="/invoices/new">Create Invoice</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesResponse?.items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber || "Draft"}</TableCell>
                      <TableCell>{invoice.issueDate ? format(new Date(invoice.issueDate), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell>{invoice.client?.name || "-"}</TableCell>
                      <TableCell>{invoice.total.toFixed(2)} €</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoicesResponse?.items || invoicesResponse.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No invoices found.
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