import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppContext } from "@/hooks/use-app-context";
import { useToast } from "@/hooks/use-toast";
import {
  deactivateAeatCertificate,
  listGlobalAeatCertificates,
  type GlobalCertificateRow,
  uploadAeatCertificate,
  validateAeatCertificate,
} from "@/lib/aeat-certificate-api";
import { useLanguage } from "@/lib/i18n";

type UploadState = {
  file: File | null;
  password: string;
  useSealCertificateEndpoint: boolean;
};

const statusOptions = ["all", "MISSING", "ACTIVE", "INACTIVE", "EXPIRED", "INVALID", "REVOKED"] as const;

function statusVariant(status: string) {
  if (status === "ACTIVE") return "default";
  if (status === "MISSING" || status === "INVALID" || status === "EXPIRED" || status === "REVOKED") return "destructive";
  return "secondary";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function GestoriaCertificatesPage() {
  const { organization } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [uploads, setUploads] = useState<Record<number, UploadState>>({});

  const queryKey = ["gestoria-certificates", organization?.id, status, missingOnly];
  const certificatesQuery = useQuery({
    queryKey,
    queryFn: () =>
      listGlobalAeatCertificates(organization!.id, {
        status,
        missing: missingOnly,
      }),
    enabled: !!organization,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["gestoria-certificates", organization?.id] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (row: GlobalCertificateRow) => {
      const upload = uploads[row.taxpayerId];
      if (!upload?.file || !upload.password) throw new Error(t("certificates.fileAndPasswordRequired"));
      return uploadAeatCertificate(row.taxpayerId, {
        file: upload.file,
        password: upload.password,
        activate: true,
        useSealCertificateEndpoint: upload.useSealCertificateEndpoint,
      });
    },
    onSuccess: (_, row) => {
      setUploads((current) => ({
        ...current,
        [row.taxpayerId]: { file: null, password: "", useSealCertificateEndpoint: false },
      }));
      invalidate();
      toast({ title: t("certificates.uploaded") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: t("certificates.uploadFailed"), description: error?.message });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (row: GlobalCertificateRow) => {
      if (!row.activeCertificateId) throw new Error(t("certificates.noActiveCertificate"));
      return validateAeatCertificate(row.taxpayerId, row.activeCertificateId);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("certificates.validated") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: t("certificates.validateFailed"), description: error?.message });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (row: GlobalCertificateRow) => {
      if (!row.activeCertificateId) throw new Error(t("certificates.noActiveCertificate"));
      return deactivateAeatCertificate(row.taxpayerId, row.activeCertificateId);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: t("certificates.deactivated") });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: t("certificates.deactivateFailed"), description: error?.message });
    },
  });

  const updateUpload = (taxpayerId: number, patch: Partial<UploadState>) => {
    setUploads((current) => ({
      ...current,
      [taxpayerId]: {
        file: current[taxpayerId]?.file ?? null,
        password: current[taxpayerId]?.password ?? "",
        useSealCertificateEndpoint: current[taxpayerId]?.useSealCertificateEndpoint ?? false,
        ...patch,
      },
    }));
  };

  const rows = certificatesQuery.data ?? [];

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("certificates.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("certificates.description")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("certificates.filters")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="w-full space-y-2 lg:max-w-xs">
              <label className="text-sm font-medium">{t("certificates.statusFilter")}</label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all" ? t("certificates.allStatuses") : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer"
                checked={missingOnly}
                onChange={(event) => setMissingOnly(event.target.checked)}
              />
              <span className="text-sm font-medium">{t("certificates.missingOnly")}</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("certificates.taxpayer")}</TableHead>
                  <TableHead>{t("certificates.nif")}</TableHead>
                  <TableHead>{t("certificates.status")}</TableHead>
                  <TableHead>{t("certificates.expires")}</TableHead>
                  <TableHead>{t("certificates.lastError")}</TableHead>
                  <TableHead>{t("certificates.actions")}</TableHead>
                  <TableHead>{t("certificates.addOrReplace")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((row) => {
                    const upload = uploads[row.taxpayerId] ?? {
                      file: null,
                      password: "",
                      useSealCertificateEndpoint: row.useSealCertificateEndpoint,
                    };
                    return (
                      <TableRow key={row.taxpayerId}>
                        <TableCell className="min-w-52">
                          <div className="font-medium">{row.taxpayerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.certificateCount} {t("certificates.registeredCertificates")}
                          </div>
                        </TableCell>
                        <TableCell>{row.taxpayerNif || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.certificateStatus) as any}>{row.certificateStatus}</Badge>
                          {row.certificateFileName ? (
                            <div className="mt-1 max-w-44 truncate text-xs text-muted-foreground">{row.certificateFileName}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatDate(row.validTo)}</TableCell>
                        <TableCell className="max-w-64">
                          {row.lastValidationError ? (
                            <span className="text-sm text-destructive">{row.lastValidationError}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!row.activeCertificateId || validateMutation.isPending}
                              onClick={() => validateMutation.mutate(row)}
                            >
                              {t("certificates.validate")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!row.activeCertificateId || deactivateMutation.isPending}
                              onClick={() => deactivateMutation.mutate(row)}
                            >
                              {t("certificates.deactivate")}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-80">
                          <div className="grid gap-2">
                            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-2 text-sm transition hover:border-primary hover:bg-primary/5">
                              <input
                                type="file"
                                accept=".pfx,.p12"
                                className="sr-only"
                                onChange={(event) => updateUpload(row.taxpayerId, { file: event.target.files?.[0] ?? null })}
                              />
                              {upload.file ? upload.file.name : t("certificates.selectPfx")}
                            </label>
                            <Input
                              type="password"
                              value={upload.password}
                              placeholder={t("placeholder.certificatePassword")}
                              onChange={(event) => updateUpload(row.taxpayerId, { password: event.target.value })}
                            />
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer"
                                checked={upload.useSealCertificateEndpoint}
                                onChange={(event) =>
                                  updateUpload(row.taxpayerId, { useSealCertificateEndpoint: event.target.checked })
                                }
                              />
                              {t("settings.useSealEndpoint")}
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!upload.file || !upload.password || uploadMutation.isPending}
                              onClick={() => uploadMutation.mutate(row)}
                            >
                              {row.hasCertificate ? t("certificates.replace") : t("certificates.upload")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {certificatesQuery.isLoading ? t("common.loading") : t("certificates.noRows")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
