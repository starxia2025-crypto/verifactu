import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useQuery } from "@tanstack/react-query";
import { useGetDashboardSummary, useGetAeatStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { listAeatCertificates } from "@/lib/aeat-certificate-api";

function formatMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} €`;
}

export default function DashboardPage() {
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer } as any
  });

  const { data: aeatStatus, isLoading: isStatusLoading } = useGetAeatStatus(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer } as any
  });
  const certificateQuery = useQuery({
    queryKey: ["aeat-certificates", taxpayer?.id],
    queryFn: () => listAeatCertificates(taxpayer!.id),
    enabled: !!taxpayer,
  });
  const activeCertificate = certificateQuery.data?.find((certificate) => certificate.status === "ACTIVE");

  if (!taxpayer) {
    return (
      <MainLayout>
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground">
              {t("dashboard.setupDescription")}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.setupTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("dashboard.setupHelp")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/taxpayers/new">{t("app.createTaxpayer")}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/organizations">{t("dashboard.viewOrganizations")}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings">{t("dashboard.openSettings")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalInvoices")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalInvoices || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.revenue")}</CardTitle>
              <span className="text-sm text-muted-foreground">€</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(summary?.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.aeatAccepted")}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aeatStatus?.accepted || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.aeatErrors")}</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(aeatStatus?.rejected || 0) + (aeatStatus?.error || 0)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.activeCertificate")}</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl font-semibold">
                {activeCertificate ? t("settings.certificateReady") : t("settings.certificateMissing")}
              </div>
              <p className="text-sm text-muted-foreground">
                {activeCertificate?.validTo
                  ? `${t("certificates.expires")}: ${new Date(activeCertificate.validTo).toLocaleDateString()}`
                  : t("certificates.businessDescription")}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/digital-certificate">{t("app.digitalCertificate")}</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("dashboard.latestSubmissions")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              <div>{t("aeat.pending")}: {aeatStatus?.pending ?? 0}</div>
              <div>{t("aeat.acceptedWithErrors")}: {aeatStatus?.acceptedWithErrors ?? 0}</div>
              <div>{t("aeat.error")}: {(aeatStatus?.rejected ?? 0) + (aeatStatus?.error ?? 0)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
