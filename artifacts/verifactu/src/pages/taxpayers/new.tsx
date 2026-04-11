import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useCreateTaxpayer, getListTaxpayersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";

const taxpayerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  tradeName: z.string().optional().or(z.literal("")),
  nif: z.string().min(2, "El NIF/CIF es obligatorio"),
  nifType: z.enum(["NIF", "NIE", "CIF", "PASSPORT", "OTHER"]),
  address: z.string().min(2, "La dirección es obligatoria"),
  city: z.string().min(2, "La ciudad es obligatoria"),
  postalCode: z.string().min(2, "El código postal es obligatorio"),
  province: z.string().min(2, "La provincia es obligatoria"),
  country: z.string().min(2).default("ES"),
  email: z.string().email("Introduce un email válido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  defaultVatRate: z.coerce.number().min(0).max(100),
});

type TaxpayerFormValues = z.infer<typeof taxpayerSchema>;

export default function NewTaxpayerPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTaxpayer = useCreateTaxpayer();
  const { organization, setTaxpayerId } = useAppContext();
  const { t } = useLanguage();

  const form = useForm<TaxpayerFormValues>({
    resolver: zodResolver(taxpayerSchema),
    defaultValues: {
      name: organization?.name || "",
      tradeName: "",
      nif: organization?.nif || "",
      nifType: "NIF",
      address: organization?.address || "",
      city: organization?.city || "",
      postalCode: organization?.postalCode || "",
      province: organization?.province || "",
      country: organization?.country || "ES",
      email: organization?.email || "",
      phone: organization?.phone || "",
      defaultVatRate: 21,
    },
  });

  const onSubmit = (data: TaxpayerFormValues) => {
    if (!organization) return;

    createTaxpayer.mutate(
      {
        orgId: organization.id,
        data: {
          ...data,
          tradeName: data.tradeName || null,
          email: data.email || null,
          phone: data.phone || null,
        },
      },
      {
        onSuccess: (newTaxpayer) => {
          queryClient.invalidateQueries({ queryKey: getListTaxpayersQueryKey(organization.id) });
          setTaxpayerId(newTaxpayer.id);
          toast({ title: t("taxpayer.created") });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: t("taxpayer.createFailed"),
            description: error?.message || t("taxpayer.reviewForm"),
          });
        },
      },
    );
  };

  if (!organization) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("taxpayer.title")}</h1>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">
                {t("taxpayer.requiredDescription")}
              </p>
              <Button asChild>
                <Link href="/organizations/new">{t("organizations.create")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("taxpayer.title")}</h1>
          <p className="text-muted-foreground">
            {t("taxpayer.description", { organization: organization.name })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("taxpayer.fiscalInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.legalName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("placeholder.organizationName")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.tradeName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("common.optional")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nifType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.documentType")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NIF">NIF</SelectItem>
                            <SelectItem value="NIE">NIE</SelectItem>
                            <SelectItem value="CIF">CIF</SelectItem>
                            <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                            <SelectItem value="OTHER">Otro</SelectItem>
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
                        <FormLabel>{t("taxpayer.nif")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("placeholder.nif")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>{t("taxpayer.address")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("placeholder.address")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.city")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.province")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.postalCode")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.country")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t("placeholder.billingEmail")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.phone")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("placeholder.phone")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultVatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("taxpayer.defaultVatRate")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/organizations">{t("taxpayer.back")}</Link>
                  </Button>
                  <Button type="submit" disabled={createTaxpayer.isPending}>
                    {createTaxpayer.isPending ? t("taxpayer.creating") : t("taxpayer.create")}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
