import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/hooks/use-app-context";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useSidebarTheme, type SidebarTheme } from "@/lib/sidebar-theme";
import { getListTaxpayersQueryKey, useUpdateTaxpayer } from "@workspace/api-client-react";
import {
  activateAeatCertificate,
  deactivateAeatCertificate,
  deleteAeatCertificate,
  listAeatCertificates,
  updateAeatCertificateSettings,
  uploadAeatCertificate,
  validateAeatCertificate,
} from "@/lib/aeat-certificate-api";

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
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [useSealEndpoint, setUseSealEndpoint] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: taxpayer?.name || "",
      address: taxpayer?.address || "",
      city: taxpayer?.city || "",
      postalCode: taxpayer?.postalCode || "",
      province: taxpayer?.province || "",
      aeatEnvironment: taxpayer?.aeatEnvironment || "sandbox",
    },
  });

  const themeLabels: Record<SidebarTheme, string> = {
    azul: t("settings.themeAzul"),
    grafito: t("settings.themeGrafito"),
    esmeralda: t("settings.themeEsmeralda"),
    vino: t("settings.themeVino"),
    ambar: t("settings.themeAmbar"),
  };

  const certificateQuery = useQuery({
    queryKey: ["aeat-certificates", taxpayer?.id],
    queryFn: () => listAeatCertificates(taxpayer!.id),
    enabled: !!taxpayer,
  });
  const certificates = certificateQuery.data ?? [];
  const activeCertificate = certificates.find((certificate) => certificate.status === "ACTIVE") ?? null;

  const invalidateCertificates = () => {
    queryClient.invalidateQueries({ queryKey: ["aeat-certificates", taxpayer?.id] });
  };

  const uploadCertificateMutation = useMutation({
    mutationFn: async () => {
      if (!taxpayer || !certificateFile) throw new Error(t("settings.certificateFileRequired"));
      return uploadAeatCertificate(taxpayer.id, {
        file: certificateFile,
        password: certificatePassword,
        activate: true,
        useSealCertificateEndpoint: useSealEndpoint,
      });
    },
    onSuccess: () => {
      invalidateCertificates();
      setCertificateFile(null);
      setCertificatePassword("");
      toast({ title: t("settings.certificateUploaded") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: t("settings.certificateUploadFailed"), description: error?.message });
    },
  });

  const updateCertificateSettingsMutation = useMutation({
    mutationFn: ({ certificateId, checked }: { certificateId: number; checked: boolean }) => {
      if (!taxpayer) throw new Error(t("settings.taxpayerRequired"));
      return updateAeatCertificateSettings(taxpayer.id, certificateId, { useSealCertificateEndpoint: checked });
    },
    onSuccess: () => {
      invalidateCertificates();
      toast({ title: t("settings.saved") });
    },
  });

  const activateCertificateMutation = useMutation({
    mutationFn: (certificateId: number) => activateAeatCertificate(taxpayer!.id, certificateId),
    onSuccess: () => {
      invalidateCertificates();
      toast({ title: t("settings.saved") });
    },
  });

  const deactivateCertificateMutation = useMutation({
    mutationFn: (certificateId: number) => deactivateAeatCertificate(taxpayer!.id, certificateId),
    onSuccess: () => {
      invalidateCertificates();
      toast({ title: t("settings.saved") });
    },
  });

  const validateCertificateMutation = useMutation({
    mutationFn: (certificateId: number) => validateAeatCertificate(taxpayer!.id, certificateId),
    onSuccess: () => {
      invalidateCertificates();
      toast({ title: t("settings.saved") });
    },
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: (certificateId: number) => deleteAeatCertificate(taxpayer!.id, certificateId),
    onSuccess: () => {
      invalidateCertificates();
      toast({ title: t("settings.certificateDeleted") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("settings.certificateDeleteFailed") });
    },
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
        },
      },
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
              <p className="text-muted-foreground">{t("settings.taxpayerRequiredDescription")}</p>
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
                      <FormControl><Input {...field} /></FormControl>
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
                          <SelectTrigger><SelectValue placeholder={t("placeholder.aeatEnvironment")} /></SelectTrigger>
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

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.aeatCertificate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="font-medium">{activeCertificate ? t("settings.certificateReady") : t("settings.certificateMissing")}</p>
              <p className="text-sm text-muted-foreground">
                {activeCertificate
                  ? `${activeCertificate.originalFileName} · ${activeCertificate.validTo ? new Date(activeCertificate.validTo).toLocaleDateString() : ""}`
                  : t("settings.certificateHelp")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.certificateFile")}</label>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-sm transition hover:border-primary hover:bg-primary/5">
                  <input type="file" accept=".pfx,.p12" className="sr-only" onChange={(event) => setCertificateFile(event.target.files?.[0] ?? null)} />
                  {certificateFile ? certificateFile.name : t("settings.selectPfx")}
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.certificatePassword")}</label>
                <Input type="password" value={certificatePassword} placeholder={t("placeholder.certificatePassword")} onChange={(event) => setCertificatePassword(event.target.value)} />
              </div>
              <Button type="button" disabled={!certificateFile || !certificatePassword || uploadCertificateMutation.isPending} onClick={() => uploadCertificateMutation.mutate()}>
                {uploadCertificateMutation.isPending ? t("settings.uploadingCertificate") : t("settings.uploadCertificate")}
              </Button>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 cursor-pointer"
                checked={activeCertificate?.useSealCertificateEndpoint ?? useSealEndpoint}
                onChange={(event) => {
                  setUseSealEndpoint(event.target.checked);
                  if (activeCertificate) {
                    updateCertificateSettingsMutation.mutate({ certificateId: activeCertificate.id, checked: event.target.checked });
                  }
                }}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">{t("settings.useSealEndpoint")}</span>
                <span className="block text-sm text-muted-foreground">{t("settings.useSealEndpointHelp")}</span>
              </span>
            </label>

            {certificates.length ? (
              <div className="space-y-3">
                {certificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{certificate.originalFileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {certificate.status} · {certificate.validTo ? new Date(certificate.validTo).toLocaleDateString() : t("common.optional")}
                        </p>
                        <p className="text-sm text-muted-foreground">{certificate.subject ?? "Subject no disponible"}</p>
                        {certificate.lastValidationError ? <p className="text-sm text-destructive">{certificate.lastValidationError}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => validateCertificateMutation.mutate(certificate.id)}>
                          {t("settings.validateCertificate")}
                        </Button>
                        {certificate.status === "ACTIVE" ? (
                          <Button type="button" variant="outline" onClick={() => deactivateCertificateMutation.mutate(certificate.id)}>
                            {t("settings.deactivateCertificate")}
                          </Button>
                        ) : (
                          <Button type="button" onClick={() => activateCertificateMutation.mutate(certificate.id)}>
                            {t("settings.activateCertificate")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={deleteCertificateMutation.isPending}
                          onClick={() => {
                            if (window.confirm(t("settings.certificateDeleteConfirm"))) {
                              deleteCertificateMutation.mutate(certificate.id);
                            }
                          }}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
