import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  activateAeatCertificate,
  deactivateAeatCertificate,
  deleteAeatCertificate,
  listAeatCertificates,
  updateAeatCertificateSettings,
  uploadAeatCertificate,
  validateAeatCertificate,
} from "@/lib/aeat-certificate-api";
import { useLanguage } from "@/lib/i18n";

export function AeatCertificateManager({
  taxpayerId,
  title,
  readOnly = false,
}: {
  taxpayerId: number;
  title?: string;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [useSealEndpoint, setUseSealEndpoint] = useState(false);

  const queryKey = ["aeat-certificates", taxpayerId];
  const certificateQuery = useQuery({
    queryKey,
    queryFn: () => listAeatCertificates(taxpayerId),
  });
  const certificates = certificateQuery.data ?? [];
  const activeCertificate = certificates.find((certificate) => certificate.status === "ACTIVE") ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!certificateFile) throw new Error(t("settings.certificateFileRequired"));
      return uploadAeatCertificate(taxpayerId, {
        file: certificateFile,
        password: certificatePassword,
        activate: true,
        useSealCertificateEndpoint: useSealEndpoint,
      });
    },
    onSuccess: () => {
      invalidate();
      setCertificateFile(null);
      setCertificatePassword("");
      toast({ title: t("settings.certificateUploaded") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: t("settings.certificateUploadFailed"), description: error?.message });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ certificateId, checked }: { certificateId: number; checked: boolean }) =>
      updateAeatCertificateSettings(taxpayerId, certificateId, { useSealCertificateEndpoint: checked }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("settings.saved") });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (certificateId: number) => activateAeatCertificate(taxpayerId, certificateId),
    onSuccess: () => {
      invalidate();
      toast({ title: t("settings.saved") });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (certificateId: number) => deactivateAeatCertificate(taxpayerId, certificateId),
    onSuccess: () => {
      invalidate();
      toast({ title: t("settings.saved") });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (certificateId: number) => validateAeatCertificate(taxpayerId, certificateId),
    onSuccess: () => {
      invalidate();
      toast({ title: t("settings.saved") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (certificateId: number) => deleteAeatCertificate(taxpayerId, certificateId),
    onSuccess: () => {
      invalidate();
      toast({ title: t("settings.certificateDeleted") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("settings.certificateDeleteFailed") });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? t("settings.aeatCertificate")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="font-medium">{activeCertificate ? t("settings.certificateReady") : t("settings.certificateMissing")}</p>
          <p className="text-sm text-muted-foreground">
            {activeCertificate
              ? `${activeCertificate.originalFileName} · ${activeCertificate.validTo ? new Date(activeCertificate.validTo).toLocaleDateString() : ""}`
              : t("settings.certificateHelp")}
          </p>
          {activeCertificate?.lastValidationError ? (
            <p className="mt-2 text-sm text-destructive">{activeCertificate.lastValidationError}</p>
          ) : null}
        </div>

        {!readOnly ? (
          <>
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
              <Button type="button" disabled={!certificateFile || !certificatePassword || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
                {uploadMutation.isPending ? t("settings.uploadingCertificate") : t("settings.uploadCertificate")}
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
                    updateSettingsMutation.mutate({ certificateId: activeCertificate.id, checked: event.target.checked });
                  }
                }}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">{t("settings.useSealEndpoint")}</span>
                <span className="block text-sm text-muted-foreground">{t("settings.useSealEndpointHelp")}</span>
              </span>
            </label>
          </>
        ) : null}

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
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => validateMutation.mutate(certificate.id)}>
                        {t("settings.validateCertificate")}
                      </Button>
                      {certificate.status === "ACTIVE" ? (
                        <Button type="button" variant="outline" onClick={() => deactivateMutation.mutate(certificate.id)}>
                          {t("settings.deactivateCertificate")}
                        </Button>
                      ) : (
                        <Button type="button" onClick={() => activateMutation.mutate(certificate.id)}>
                          {t("settings.activateCertificate")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(t("settings.certificateDeleteConfirm"))) {
                            deleteMutation.mutate(certificate.id);
                          }
                        }}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : certificateQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
