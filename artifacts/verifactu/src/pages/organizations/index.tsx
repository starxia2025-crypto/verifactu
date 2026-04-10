import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListOrganizations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2 } from "lucide-react";

export default function OrganizationsPage() {
  const { user, organization: currentOrg, setOrganizationId } = useAppContext();
  const { data: organizations, isLoading } = useListOrganizations({ query: { enabled: !!user } });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <Button asChild>
            <Link href="/organizations/new">New Organization</Link>
          </Button>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations?.map((org) => (
              <Card key={org.id} className={currentOrg?.id === org.id ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription>{org.type.toUpperCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">NIF: {org.nif || "N/A"}</p>
                  <Button 
                    variant={currentOrg?.id === org.id ? "default" : "outline"} 
                    onClick={() => setOrganizationId(org.id)}
                    className="w-full"
                  >
                    {currentOrg?.id === org.id ? "Active" : "Switch to this"}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {organizations?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No organizations found. Create one to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}