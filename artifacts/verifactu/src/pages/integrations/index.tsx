import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, FileSpreadsheet } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import {
  createIntegrationSource,
  deleteIntegrationSource,
  listIntegrationSources,
  previewIntegrationSource,
  testIntegrationSource,
  type IntegrationSource,
  type IntegrationSourceType,
  type PreviewResult,
} from "@/lib/integration-sources-api";
import { createApiKey, deleteApiKey, listApiKeys, type ApiKey } from "@/lib/api-keys-api";

const sourceTypes: Array<{ value: IntegrationSourceType; labelKey: string }> = [
  { value: "excel", labelKey: "integrations.typeExcel" },
  { value: "csv", labelKey: "integrations.typeCsv" },
  { value: "postgres", labelKey: "integrations.typePostgres" },
  { value: "mysql", labelKey: "integrations.typeMysql" },
  { value: "sqlserver", labelKey: "integrations.typeSqlServer" },
  { value: "dbf", labelKey: "integrations.typeDbf" },
];

function defaultPort(type: IntegrationSourceType) {
  if (type === "postgres") return "5432";
  if (type === "mysql") return "3306";
  if (type === "sqlserver") return "1433";
  return "";
}

export default function IntegrationsPage() {
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewSource, setPreviewSource] = useState<IntegrationSource | null>(null);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [newApiToken, setNewApiToken] = useState<string | null>(null);
  const [apiKeyForm, setApiKeyForm] = useState({ name: "", allowEmit: false });
  const [form, setForm] = useState({
    name: "",
    type: "excel" as IntegrationSourceType,
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    tableName: "",
    query: "",
    filePath: "",
    sheetName: "",
  });

  const queryKey = ["integration-sources", taxpayer?.id];
  const apiKeysQueryKey = ["api-keys", taxpayer?.id];
  const { data: sources = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listIntegrationSources(taxpayer!.id),
    enabled: !!taxpayer,
  });
  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: apiKeysQueryKey,
    queryFn: () => listApiKeys(taxpayer!.id),
    enabled: !!taxpayer,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!taxpayer) throw new Error(t("integrations.taxpayerRequired"));
      const config =
        form.type === "excel" || form.type === "csv" || form.type === "dbf"
          ? {
              filePath: form.filePath,
              sheetName: form.type === "excel" ? form.sheetName || undefined : undefined,
            }
          : {
              host: form.host,
              port: form.port ? Number(form.port) : undefined,
              database: form.database,
              username: form.username,
              password: form.password,
              tableName: form.tableName || undefined,
              query: form.query || undefined,
              trustServerCertificate: true,
            };

      return createIntegrationSource(taxpayer.id, {
        name: form.name,
        type: form.type,
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setOpen(false);
      setForm({
        name: "",
        type: "excel",
        host: "",
        port: "",
        database: "",
        username: "",
        password: "",
        tableName: "",
        query: "",
        filePath: "",
        sheetName: "",
      });
      toast({ title: t("integrations.created") });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: t("integrations.createFailed"), description: error.message }),
  });

  const testMutation = useMutation({
    mutationFn: testIntegrationSource,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: result.message });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: t("integrations.testFailed"), description: error.message }),
  });

  const previewMutation = useMutation({
    mutationFn: previewIntegrationSource,
    onSuccess: (result) => setPreview(result),
    onError: (error: Error) => toast({ variant: "destructive", title: t("integrations.previewFailed"), description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIntegrationSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: t("common.deleted") });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: t("common.deleteFailed"), description: error.message }),
  });
  const createApiKeyMutation = useMutation({
    mutationFn: () => {
      if (!taxpayer) throw new Error(t("integrations.taxpayerRequired"));
      const scopes = apiKeyForm.allowEmit ? ["ingest:write", "invoices:emit"] : ["ingest:write"];
      return createApiKey(taxpayer.id, { name: apiKeyForm.name, scopes });
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });
      setNewApiToken(key.token || null);
      setApiKeyForm({ name: "", allowEmit: false });
      toast({ title: t("integrations.apiKeyCreated") });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: t("integrations.apiKeyCreateFailed"), description: error.message }),
  });
  const deleteApiKeyMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });
      toast({ title: t("common.deleted") });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: t("common.deleteFailed"), description: error.message }),
  });

  const selectedType = sourceTypes.find((item) => item.value === form.type);
  const isFileType = form.type === "excel" || form.type === "csv" || form.type === "dbf";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("integrations.title")}</h1>
            <p className="text-muted-foreground">{t("integrations.description")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>{t("integrations.new")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[760px]">
              <DialogHeader>
                <DialogTitle>{t("integrations.createTitle")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("integrations.name")}</Label>
                  <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("integrations.namePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("integrations.type")}</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: IntegrationSourceType) => setForm({ ...form, type: value, port: defaultPort(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{t(type.labelKey as any)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isFileType ? (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label>{t("integrations.filePath")}</Label>
                      <Input value={form.filePath} onChange={(event) => setForm({ ...form, filePath: event.target.value })} placeholder="/mnt/importaciones/facturas.xlsx" />
                      <p className="text-xs text-muted-foreground">{t("integrations.filePathHelp")}</p>
                    </div>
                    {form.type === "excel" && (
                      <div className="space-y-2">
                        <Label>{t("integrations.sheetName")}</Label>
                        <Input value={form.sheetName} onChange={(event) => setForm({ ...form, sheetName: event.target.value })} placeholder={t("common.optional")} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t("integrations.host")}</Label>
                      <Input value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} placeholder="192.168.1.10" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("integrations.port")}</Label>
                      <Input value={form.port || defaultPort(form.type)} onChange={(event) => setForm({ ...form, port: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("integrations.database")}</Label>
                      <Input value={form.database} onChange={(event) => setForm({ ...form, database: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("integrations.username")}</Label>
                      <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("integrations.password")}</Label>
                      <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("integrations.tableName")}</Label>
                      <Input value={form.tableName} onChange={(event) => setForm({ ...form, tableName: event.target.value })} placeholder="facturas" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>{t("integrations.query")}</Label>
                      <Textarea value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="SELECT * FROM facturas WHERE fecha >= '2026-01-01'" rows={3} />
                      <p className="text-xs text-muted-foreground">{t("integrations.queryHelp")}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!taxpayer ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">{t("integrations.taxpayerRequired")}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <p>{t("common.loading")}</p>
            ) : sources.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent className="pt-6 text-muted-foreground">{t("integrations.empty")}</CardContent>
              </Card>
            ) : (
              sources.map((source) => (
                <Card key={source.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        {source.type === "excel" || source.type === "csv" || source.type === "dbf" ? <FileSpreadsheet className="h-5 w-5 text-primary" /> : <Database className="h-5 w-5 text-primary" />}
                        <div>
                          <CardTitle>{source.name}</CardTitle>
                          <CardDescription>{t(sourceTypes.find((type) => type.value === source.type)?.labelKey as any)}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={source.status === "ready" ? "default" : source.status === "error" ? "destructive" : "secondary"}>
                        {source.status === "ready" ? t("integrations.ready") : source.status === "error" ? t("integrations.error") : t("integrations.draft")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {source.lastTestMessage || t("integrations.notTested")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => testMutation.mutate(source.id)} disabled={testMutation.isPending}>
                        {t("integrations.test")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewSource(source);
                          setPreview(null);
                          previewMutation.mutate(source.id);
                        }}
                        disabled={previewMutation.isPending}
                      >
                        {t("integrations.preview")}
                      </Button>
                      <ConfirmDeleteDialog itemName={source.name} isDeleting={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(source.id)} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {taxpayer && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{t("integrations.apiKeysTitle")}</CardTitle>
                  <CardDescription>{t("integrations.apiKeysDescription")}</CardDescription>
                </div>
                <Dialog open={apiKeyOpen} onOpenChange={(nextOpen) => { setApiKeyOpen(nextOpen); if (!nextOpen) setNewApiToken(null); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline">{t("integrations.newApiKey")}</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                      <DialogTitle>{t("integrations.newApiKey")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("integrations.apiKeyName")}</Label>
                        <Input value={apiKeyForm.name} onChange={(event) => setApiKeyForm({ ...apiKeyForm, name: event.target.value })} placeholder={t("integrations.apiKeyNamePlaceholder")} />
                      </div>
                      <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                        <input type="checkbox" checked={apiKeyForm.allowEmit} onChange={(event) => setApiKeyForm({ ...apiKeyForm, allowEmit: event.target.checked })} />
                        {t("integrations.allowEmit")}
                      </label>
                      {newApiToken && (
                        <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                          <p className="text-sm font-medium">{t("integrations.apiKeyTokenHelp")}</p>
                          <code className="block break-all rounded bg-background p-2 text-sm">{newApiToken}</code>
                        </div>
                      )}
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setApiKeyOpen(false)}>{t("common.cancel")}</Button>
                        <Button type="button" onClick={() => createApiKeyMutation.mutate()} disabled={createApiKeyMutation.isPending || !apiKeyForm.name}>
                          {createApiKeyMutation.isPending ? t("common.saving") : t("common.save")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{t("integrations.apiDocsTitle")}</p>
                <p className="text-muted-foreground">{t("integrations.apiDocsDescription")}</p>
                <div className="mt-2 grid gap-1 font-mono text-xs">
                  <span>POST /api/public/v1/clients</span>
                  <span>POST /api/public/v1/products</span>
                  <span>POST /api/public/v1/invoices</span>
                </div>
              </div>
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("integrations.apiKeysEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("integrations.apiKeyName")}</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>{t("integrations.lastUsed")}</TableHead>
                      <TableHead>{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.name}</TableCell>
                        <TableCell><code>{key.keyPrefix}</code></TableCell>
                        <TableCell>{key.scopes.join(", ")}</TableCell>
                        <TableCell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "-"}</TableCell>
                        <TableCell>
                          <ConfirmDeleteDialog itemName={key.name} isDeleting={deleteApiKeyMutation.isPending} onConfirm={() => deleteApiKeyMutation.mutate(key.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!previewSource} onOpenChange={(nextOpen) => !nextOpen && setPreviewSource(null)}>
          <DialogContent className="sm:max-w-[920px]">
            <DialogHeader>
              <DialogTitle>{t("integrations.preview")} {previewSource?.name}</DialogTitle>
            </DialogHeader>
            {previewMutation.isPending ? (
              <p>{t("common.loading")}</p>
            ) : !preview || preview.rows.length === 0 ? (
              <p className="text-muted-foreground">{t("integrations.previewEmpty")}</p>
            ) : (
              <div className="max-h-[520px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, index) => (
                      <TableRow key={index}>
                        {preview.columns.map((column) => (
                          <TableCell key={column}>{String(row[column] ?? "")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
