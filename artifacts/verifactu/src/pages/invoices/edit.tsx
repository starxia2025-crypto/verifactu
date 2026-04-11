import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getListInvoicesQueryKey,
  useGetInvoice,
  useListClients,
  useUpdateInvoice,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const NO_CLIENT_VALUE = "none";

const invoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().min(2, "La descripción es obligatoria"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que 0"),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  vatRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function toDateInputValue(value: unknown): string {
  if (!value) return "";
  return String(value).split("T")[0];
}

export default function EditInvoicePage({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateInvoice = useUpdateInvoice();
  const { data: invoice, isLoading } = useGetInvoice(id, { query: { enabled: Number.isFinite(id) } as any });
  const { data: clients } = useListClients(taxpayer?.id || 0, {}, { query: { enabled: !!taxpayer } as any });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: NO_CLIENT_VALUE,
      issueDate: "",
      notes: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      vatRate: taxpayer?.defaultVatRate || 21,
      discount: 0,
    },
  });

  useEffect(() => {
    if (!invoice) return;
    const line = invoice.lines?.[0];
    form.reset({
      clientId: invoice.clientId ? String(invoice.clientId) : NO_CLIENT_VALUE,
      issueDate: toDateInputValue(invoice.issueDate),
      notes: invoice.notes || "",
      description: line?.description || "",
      quantity: Number(line?.quantity ?? 1),
      unitPrice: Number(line?.unitPrice ?? 0),
      vatRate: Number(line?.vatRate ?? taxpayer?.defaultVatRate ?? 21),
      discount: Number(line?.discount ?? 0),
    });
  }, [form, invoice, taxpayer?.defaultVatRate]);

  const onSubmit = (data: InvoiceFormValues) => {
    if (!taxpayer) return;

    updateInvoice.mutate(
      {
        id,
        data: {
          clientId: data.clientId && data.clientId !== NO_CLIENT_VALUE ? Number(data.clientId) : null,
          issueDate: data.issueDate || null,
          notes: data.notes || null,
          lines: [
            {
              description: data.description,
              quantity: data.quantity,
              unitPrice: data.unitPrice,
              vatRate: data.vatRate,
              discount: data.discount,
              productId: null,
              sortOrder: 0,
            },
          ],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(taxpayer.id) });
          toast({ title: t("invoices.updated") });
          setLocation(`/invoices/${id}`);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: t("invoices.updateFailed"),
            description: error?.message,
          });
        },
      },
    );
  };

  if (!taxpayer) {
    return (
      <MainLayout>
        <div className="w-full space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.editTitle")}</h1>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">{t("invoices.taxpayerRequired")}</p>
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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.editTitle")}</h1>
          <Button type="button" variant="outline" asChild>
            <Link href={`/invoices/${id}`}>{t("taxpayer.back")}</Link>
          </Button>
        </div>

        {isLoading ? (
          <p>{t("common.loading")}</p>
        ) : !invoice ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">{t("common.notFound")}</CardContent>
          </Card>
        ) : invoice.status !== "DRAFT" ? (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">{t("invoices.onlyDraftEditable")}</CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("invoices.invoiceData")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoices.client")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("invoices.selectClient")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NO_CLIENT_VALUE}>{t("invoices.noClient")}</SelectItem>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={String(client.id)}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("invoices.issueDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t("invoices.notes")}</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t("invoices.line")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>{t("invoices.description")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("placeholder.invoiceDescription")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("invoices.quantity")}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("invoices.unitPrice")}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vatRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("invoices.vatRate")} (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("invoices.discount")} (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/invoices/${id}`}>{t("common.cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={updateInvoice.isPending}>
                      {updateInvoice.isPending ? t("common.saving") : t("common.save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
