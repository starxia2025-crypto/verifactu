import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListOrganizations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function OrganizationsPage() {
  const { user, organization: currentOrg, setOrganizationId } = useAppContext();
  const { data: organizations, isLoading } = useListOrganizations({ query: { enabled: !!user } });
  const { t } = useLanguage();

  const organizationTypeLabel = (type: string) => {
    if (type === "empresa") return t("organizations.typeEmpresa");
    if (type === "gestoria") return t("organizations.typeGestoria");
    return t("organizations.typeAutonomo");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("organizations.title")}</h1>
          <Button asChild>
            <Link href="/organizations/new">{t("app.newOrganization")}</Link>
          </Button>
        </div>

        {isLoading ? (
          <div>{t("common.loading")}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations?.map((org) => (
              <Card key={org.id} className={currentOrg?.id === org.id ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription>{organizationTypeLabel(org.type)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("organizations.nif")}: {org.nif || "N/A"}
                  </p>
                  <Button
                    variant={currentOrg?.id === org.id ? "default" : "outline"}
                    onClick={() => setOrganizationId(org.id)}
                    className="w-full"
                  >
                    {currentOrg?.id === org.id ? t("organizations.active") : t("organizations.switch")}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {organizations?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No hay organizaciones. Crea una para empezar.
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
