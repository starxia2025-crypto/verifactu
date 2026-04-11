import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getListOrganizationsQueryKey,
  useCreateOrganization,
  useListOrganizations,
  useUpdateOrganization,
} from "@workspace/api-client-react";
import { Building2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { BulkImportDialog, type ImportRow } from "@/components/bulk-import-dialog";

const orgSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  nif: z.string().optional().or(z.literal("")),
  email: z.string().email("Introduce un email válido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
});

type OrgFormValues = z.infer<typeof orgSchema>;

function readCell(row: ImportRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

export default function OrganizationsPage() {
  const { user, organization: currentOrg, setOrganizationId } = useAppContext();
  const { data: organizations, isLoading } = useListOrganizations({ query: { enabled: !!user } as any });
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateOrganization = useUpdateOrganization();
  const createOrganization = useCreateOrganization();
  const [editingOrg, setEditingOrg] = useState<any | null>(null);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      nif: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
    },
  });

  const organizationTypeLabel = (type: string) => {
    if (type === "empresa") return t("organizations.typeEmpresa");
    if (type === "gestoria") return t("organizations.typeGestoria");
    return t("organizations.typeAutonomo");
  };

  const openEdit = (org: any) => {
    setEditingOrg(org);
    form.reset({
      name: org.name || "",
      nif: org.nif || "",
      email: org.email || "",
      phone: org.phone || "",
      address: org.address || "",
      city: org.city || "",
      postalCode: org.postalCode || "",
      province: org.province || "",
    });
  };

  const onSubmitEdit = (data: OrgFormValues) => {
    if (!editingOrg) return;
    updateOrganization.mutate(
      {
        id: editingOrg.id,
        data: {
          ...data,
          nif: data.nif || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          postalCode: data.postalCode || null,
          province: data.province || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          toast({ title: t("common.updated") });
          setEditingOrg(null);
        },
        onError: () => toast({ variant: "destructive", title: t("common.updateFailed") }),
      },
    );
  };

  const deleteOrganization = async (orgId: number) => {
    const token = localStorage.getItem("verifactu_token");
    const apiBaseUrl = ((window as any).__APP_CONFIG__?.API_BASE_URL || "").replace(/\/+$/, "");
    const response = await fetch(`${apiBaseUrl}/api/organizations/${orgId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) throw new Error(await response.text());
  };

  const handleDelete = (org: any) => {
    deleteOrganization(org.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
        if (currentOrg?.id === org.id) setOrganizationId(null);
        toast({ title: t("common.deleted") });
      })
      .catch(() => toast({ variant: "destructive", title: t("common.deleteFailed") }));
  };

  const importOrganizations = async (rows: ImportRow[]) => {
    for (const row of rows) {
      const name = readCell(row, ["name", "nombre", "razonSocial", "razón social"]);
      if (!name) continue;
      await createOrganization.mutateAsync({
        data: {
          name,
          type: (readCell(row, ["type", "tipo"]) as any) || "autonomo",
          nif: readCell(row, ["nif", "cif"]) || undefined,
        },
      });
    }
    queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
  };

  const importColumns = language === "es" ? ["nombre", "tipo", "nif"] : ["name", "type", "nif"];
  const sampleRow =
    language === "es"
      ? { nombre: "Empresa Demo S.L.", tipo: "empresa", nif: "B12345678" }
      : { name: "Demo Company Ltd", type: "empresa", nif: "B12345678" };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("organizations.title")}</h1>
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog
              title={`${t("import.button")} - ${t("organizations.title")}`}
              columns={importColumns}
              sampleRow={sampleRow}
              templateFileName={language === "es" ? "plantilla-organizaciones.xlsx" : "organizations-template.xlsx"}
              onImport={importOrganizations}
            />
            <Button asChild>
              <Link href="/organizations/new">{t("app.newOrganization")}</Link>
            </Button>
          </div>
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
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("organizations.nif")}: {org.nif || "N/A"}
                  </p>
                  <Button
                    variant={currentOrg?.id === org.id ? "default" : "outline"}
                    onClick={() => setOrganizationId(org.id)}
                    className="w-full"
                  >
                    {currentOrg?.id === org.id ? t("organizations.active") : t("organizations.switch")}
                  </Button>
                  <div className="flex gap-2">
                    <Dialog open={editingOrg?.id === org.id} onOpenChange={(open) => !open && setEditingOrg(null)}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(org)}>
                          {t("common.edit")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("common.edit")} {org.name}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("organizations.name")}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="nif" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("organizations.nif")}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("common.email")}</FormLabel>
                                <FormControl><Input type="email" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <Button type="submit" disabled={updateOrganization.isPending}>
                              {updateOrganization.isPending ? t("common.saving") : t("common.save")}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    <ConfirmDeleteDialog itemName={org.name} onConfirm={() => handleDelete(org)} />
                  </div>
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
