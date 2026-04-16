import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AeatCertificateManager } from "@/components/aeat-certificate-manager";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { canManageCertificates } from "@/lib/org-mode";
import { useLanguage } from "@/lib/i18n";

export default function DigitalCertificatePage() {
  const { taxpayer, organizationRole } = useAppContext();
  const { t } = useLanguage();

  if (!taxpayer) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.taxpayerRequired")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t("settings.taxpayerRequiredDescription")}</p>
            <Button asChild>
              <Link href="/taxpayers/new">{t("app.createTaxpayer")}</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("app.digitalCertificate")}</h1>
          <p className="mt-2 text-muted-foreground">{t("certificates.businessDescription")}</p>
        </div>
        <AeatCertificateManager
          taxpayerId={taxpayer.id}
          title={t("app.digitalCertificate")}
          readOnly={!canManageCertificates(organizationRole)}
        />
      </div>
    </MainLayout>
  );
}
