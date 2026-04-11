import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useCreateOrganization, getListOrganizationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";

const orgSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["autonomo", "empresa", "gestoria"]),
  nif: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

export default function NewOrganizationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrg = useCreateOrganization();
  const queryClient = useQueryClient();
  const { setOrganizationId } = useAppContext();
  const { t } = useLanguage();

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      type: "autonomo",
      nif: "",
    },
  });

  const onSubmit = (data: OrgFormValues) => {
    createOrg.mutate(
      { data },
      {
        onSuccess: (newOrg) => {
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setOrganizationId(newOrg.id);
          toast({ title: t("organizations.created") });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ variant: "destructive", title: t("organizations.createFailed") });
        },
      },
    );
  };

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.newOrganization")}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("organizations.details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("placeholder.organizationName")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.type")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="autonomo">{t("organizations.typeAutonomo")}</SelectItem>
                          <SelectItem value="empresa">{t("organizations.typeEmpresa")}</SelectItem>
                          <SelectItem value="gestoria">{t("organizations.typeGestoria")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nif"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.nifOptional")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("placeholder.nif")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createOrg.isPending}>
                  {createOrg.isPending ? t("organizations.creating") : t("organizations.create")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
