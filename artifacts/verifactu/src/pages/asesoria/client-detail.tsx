import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useLanguage } from "@/lib/i18n";

export default function AsesoriaFiscalClientDetailPage({ id }: { id: number }) {
  const { taxpayers, setTaxpayerId } = useAppContext();
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{taxpayer.name}</h1>
          <p className="mt-2 text-muted-foreground">NIF: {taxpayer.nif}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <QuickLink title={t("fiscalClients.summary")} href={`/asesoria/clientes-fiscales/${taxpayer.id}`} />
          <QuickLink title={t("app.fiscalData")} href="/settings" onClick={() => setTaxpayerId(taxpayer.id)} />
          <QuickLink title={t("app.certificates")} href={`/asesoria/clientes-fiscales/${taxpayer.id}/certificados`} />
          <QuickLink title={t("app.invoices")} href="/invoices" onClick={() => setTaxpayerId(taxpayer.id)} />
          <QuickLink title={t("app.clients")} href="/clients" onClick={() => setTaxpayerId(taxpayer.id)} />
          <QuickLink title={t("app.products")} href="/products" onClick={() => setTaxpayerId(taxpayer.id)} />
        </div>
      </div>
    </MainLayout>
  );
}

function QuickLink({ title, href, onClick }: { title: string; href: string; onClick?: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild onClick={onClick}>
          <Link href={href}>{title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
