import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { useSidebarTheme, type SidebarTheme } from "@/lib/sidebar-theme";
import { useUpdateTaxpayer } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getListTaxpayersQueryKey } from "@workspace/api-client-react";

const settingsSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  postalCode: z.string().min(2),
  province: z.string().min(2),
  aeatEnvironment: z.enum(["sandbox", "production"]),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { taxpayer, organization } = useAppContext();
  const { toast } = useToast();
  const updateTaxpayer = useUpdateTaxpayer();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { theme, setTheme, themes } = useSidebarTheme();

  const themeLabels: Record<SidebarTheme, string> = {
    azul: t("settings.themeAzul"),
    grafito: t("settings.themeGrafito"),
    esmeralda: t("settings.themeEsmeralda"),
    vino: t("settings.themeVino"),
    ambar: t("settings.themeAmbar"),
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: taxpayer?.name || "",
      address: taxpayer?.address || "",
      city: taxpayer?.city || "",
      postalCode: taxpayer?.postalCode || "",
      province: taxpayer?.province || "",
      aeatEnvironment: taxpayer?.aeatEnvironment || "sandbox",
    }
  });

  const onSubmit = (data: SettingsFormValues) => {
    if (!taxpayer) return;
    updateTaxpayer.mutate(
      { id: taxpayer.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTaxpayersQueryKey(organization?.id || 0) });
          toast({ title: t("settings.saved") });
        },
        onError: () => {
          toast({ variant: "destructive", title: t("settings.saveFailed") });
        }
      }
    );
  };

  if (!taxpayer) {
    return (
      <MainLayout>
        <div className="w-full space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.taxpayerRequired")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("settings.taxpayerRequiredDescription")}
              </p>
              <Button asChild>
                <Link href="/taxpayers/new">{t("app.createTaxpayer")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.appearance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.sidebarColor")}</label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {themes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTheme(item)}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${theme === item ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                  >
                    <span className={`mb-3 block h-9 rounded-lg sidebar-theme-preview sidebar-theme-preview-${item}`} />
                    <span className="text-sm font-medium">{themeLabels[item]}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{t("settings.sidebarColorHelp")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.taxpayerProfile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="aeatEnvironment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings.aeatEnvironment")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("placeholder.aeatEnvironment")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sandbox">{t("settings.sandbox")}</SelectItem>
                          <SelectItem value="production">{t("settings.production")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="lg:col-span-2 lg:w-fit" disabled={updateTaxpayer.isPending}>
                  {updateTaxpayer.isPending ? t("settings.saving") : t("settings.save")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
