import { useGetAeatStatus, useGetGestoriaOverview } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/hooks/use-app-context";
import { useLanguage } from "@/lib/i18n";

export default function AeatSubmissionsPage() {
  const { organization, organizationType, taxpayer } = useAppContext();
  const { t } = useLanguage();
  const { data } = useGetAeatStatus(taxpayer?.id || 0, {
    query: { enabled: !!taxpayer && organizationType !== "asesoria" } as any,
  });
  const overview = useGetGestoriaOverview(organization?.id || 0, {
    query: { enabled: !!organization && organizationType === "asesoria" } as any,
  });
  const isAdvisory = organizationType === "asesoria";

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.aeatSubmissions")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatusCard title={t("aeat.pending")} value={isAdvisory ? overview.data?.pendingSubmissions ?? 0 : data?.pending ?? 0} />
          <StatusCard title={t("aeat.submitted")} value={data?.submitted ?? 0} />
          <StatusCard title={t("aeat.accepted")} value={data?.accepted ?? 0} />
          <StatusCard title={t("aeat.acceptedWithErrors")} value={data?.acceptedWithErrors ?? 0} />
          <StatusCard title={t("aeat.error")} value={isAdvisory ? overview.data?.pendingIncidents ?? 0 : (data?.rejected ?? 0) + (data?.error ?? 0)} />
        </div>
      </div>
    </MainLayout>
  );
}

function StatusCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
