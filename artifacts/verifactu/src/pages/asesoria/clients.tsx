import { Link } from "wouter";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useLanguage } from "@/lib/i18n";

export default function AsesoriaFiscalClientsPage() {
  const { taxpayers } = useAppContext();
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("app.fiscalClients")}</h1>
            <p className="mt-2 text-muted-foreground">{t("fiscalClients.description")}</p>
          </div>
          <Button asChild>
            <Link href="/taxpayers/new">{t("fiscalClients.new")}</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taxpayers.map((taxpayer) => (
            <Card key={taxpayer.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {taxpayer.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">NIF: {taxpayer.nif}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/asesoria/clientes-fiscales/${taxpayer.id}`}>{t("fiscalClients.open")}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/asesoria/clientes-fiscales/${taxpayer.id}/certificados`}>{t("app.certificates")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {taxpayers.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">{t("fiscalClients.empty")}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
}
