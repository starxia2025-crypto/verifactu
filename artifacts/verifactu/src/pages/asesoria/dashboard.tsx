import { Link } from "wouter";
import type React from "react";
import { useGetGestoriaOverview } from "@workspace/api-client-react";
import { AlertCircle, Building2, Clock, FileWarning, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { listGlobalAeatCertificates } from "@/lib/aeat-certificate-api";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";

export default function AsesoriaDashboardPage() {
  const { organization } = useAppContext();
  const { t } = useLanguage();
  const overview = useGetGestoriaOverview(organization?.id || 0, {
    query: { enabled: !!organization } as any,
  });
  const certificates = useQuery({
    queryKey: ["asesoria-certificates-dashboard", organization?.id],
    queryFn: () => listGlobalAeatCertificates(organization!.id),
    enabled: !!organization,
  });

  const certificateRows = certificates.data ?? [];
  const missingCertificates = certificateRows.filter((row) => !row.hasCertificate).length;
  const now = Date.now();
  const soon = now + 1000 * 60 * 60 * 24 * 45;
  const expiringCertificates = certificateRows.filter((row) => row.validTo && new Date(row.validTo).getTime() <= soon).length;

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.asesoriaTitle")}</h1>
            <p className="mt-2 text-muted-foreground">{t("dashboard.asesoriaDescription")}</p>
          </div>
          <Button asChild>
            <Link href="/asesoria/clientes-fiscales">{t("app.fiscalClients")}</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title={t("dashboard.totalFiscalClients")} value={overview.data?.totalTaxpayers ?? 0} icon={<Building2 className="h-4 w-4" />} />
          <Metric title={t("dashboard.clientsWithoutCertificate")} value={missingCertificates} icon={<ShieldAlert className="h-4 w-4" />} />
          <Metric title={t("dashboard.expiringCertificates")} value={expiringCertificates} icon={<Clock className="h-4 w-4" />} />
          <Metric title={t("dashboard.pendingSubmissions")} value={overview.data?.pendingSubmissions ?? 0} icon={<FileWarning className="h-4 w-4" />} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.latestIncidents")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview.data?.taxpayerSummaries ?? []).filter((item) => item.hasIncidents || item.pendingSubmissions > 0).slice(0, 6).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">NIF: {item.nif} · {item.pendingSubmissions} {t("aeat.pending")}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/asesoria/clientes-fiscales/${item.id}`}>{t("fiscalClients.open")}</Link>
                </Button>
              </div>
            ))}
            {!overview.data?.taxpayerSummaries?.some((item) => item.hasIncidents || item.pendingSubmissions > 0) ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                {t("dashboard.noIncidents")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
