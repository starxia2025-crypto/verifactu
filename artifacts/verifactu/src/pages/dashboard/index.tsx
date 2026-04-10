import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useGetDashboardSummary, useGetAeatStatus, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, AlertCircle, Ban } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const { taxpayer } = useAppContext();

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer }
  });

  const { data: aeatStatus, isLoading: isStatusLoading } = useGetAeatStatus(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer }
  });

  if (!taxpayer) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select an organization and taxpayer.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalInvoices || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <span className="text-sm text-muted-foreground">€</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.totalRevenue || 0).toFixed(2)} €</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AEAT Accepted</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aeatStatus?.accepted || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AEAT Rejected/Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(aeatStatus?.rejected || 0) + (aeatStatus?.error || 0)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}