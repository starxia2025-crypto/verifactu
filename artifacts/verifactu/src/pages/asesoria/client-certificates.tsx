import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AeatCertificateManager } from "@/components/aeat-certificate-manager";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { canManageCertificates } from "@/lib/org-mode";
import { useLanguage } from "@/lib/i18n";

export default function AsesoriaFiscalClientCertificatesPage({ id }: { id: number }) {
  const { taxpayers, organizationRole } = useAppContext();
  const { t } = useLanguage();
  const taxpayer = taxpayers.find((item) => item.id === id);

  if (!taxpayer) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t("common.notFound")}</CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("app.certificates")}</h1>
            <p className="mt-2 text-muted-foreground">{taxpayer.name} · {taxpayer.nif}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/asesoria/clientes-fiscales/${taxpayer.id}`}>{t("taxpayer.back")}</Link>
          </Button>
        </div>
        <AeatCertificateManager
          taxpayerId={taxpayer.id}
          title={t("app.certificates")}
          readOnly={!canManageCertificates(organizationRole)}
        />
      </div>
    </MainLayout>
  );
}
