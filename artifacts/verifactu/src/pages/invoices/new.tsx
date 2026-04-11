import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import {
  getListClientsQueryKey,
  getListInvoicesQueryKey,
  useCreateClient,
  useCreateInvoice,
  useListClients,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";

const NO_CLIENT_VALUE = "none";

const invoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.string().optional(),
  notes: z.string().optional(),
  emitImmediately: z.boolean().default(false),
  description: z.string().min(2, "La descripción es obligatoria"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que 0"),
  unitPrice: z.coerce.number().min(0, "El precio no puede ser negativo"),
  vatRate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const quickClientSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  nif: z.string().optional(),
  nifType: z.string().default("NIF"),
  email: z.string().email("Introduce un email válido").optional().or(z.literal("")),
});

type QuickClientFormValues = z.infer<typeof quickClientSchema>;

export default function NewInvoicePage() {
  const [, setLocation] = useLocation();
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const createClient = useCreateClient();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  const { data: clients } = useListClients(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer } as any,
  });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: NO_CLIENT_VALUE,
      issueDate: new Date().toISOString().split("T")[0],
      notes: "",
      emitImmediately: false,
      description: "",
      quantity: 1,
      unitPrice: 0,
      vatRate: taxpayer?.defaultVatRate || 21,
      discount: 0,
    },
  });

  const clientForm = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      nif: "",
      nifType: "NIF",
      email: "",
    },
  });

  const onCreateClient = (data: QuickClientFormValues) => {
    if (!taxpayer) return;

    createClient.mutate(
      {
        taxpayerId: taxpayer.id,
        data: {
          name: data.name,
          nif: data.nif || null,
          nifType: data.nifType || null,
          email: data.email || null,
          phone: null,
          address: null,
          city: null,
          postalCode: null,
          province: null,
          country: "ES",
        },
      },
      {
        onSuccess: (newClient) => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey(taxpayer.id) });
          form.setValue("clientId", String(newClient.id));
          clientForm.reset();
          setIsClientDialogOpen(false);
          toast({ title: t("invoices.clientCreated") });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: t("clients.createFailed"),
            description: error?.message,
          });
        },
      },
    );
  };

  const onSubmit = (data: InvoiceFormValues) => {
    if (!taxpayer) return;

    createInvoice.mutate(
      {
        taxpayerId: taxpayer.id,
        data: {
          clientId: data.clientId && data.clientId !== NO_CLIENT_VALUE ? Number(data.clientId) : null,
          invoiceType: "STANDARD",
          issueDate: data.issueDate || null,
          notes: data.notes || null,
          emitImmediately: data.emitImmediately,
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
          toast({ title: t("invoices.created") });
          setLocation("/invoices");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: t("invoices.createFailed"),
            description: error?.message,
          });
        },
      },
    );
  };

  if (!taxpayer) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("invoices.createTitle")}</h1>
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
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("invoices.createTitle")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("invoices.invoiceData")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
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
                    <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          {t("invoices.createClientHere")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                          <DialogTitle>{t("clients.createTitle")}</DialogTitle>
                        </DialogHeader>
                        <Form {...clientForm}>
                          <form onSubmit={clientForm.handleSubmit(onCreateClient)} className="space-y-4">
                            <FormField
                              control={clientForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("clients.name")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t("placeholder.clientName")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={clientForm.control}
                                name="nifType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("clients.idType")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="NIF">NIF</SelectItem>
                                        <SelectItem value="CIF">CIF</SelectItem>
                                        <SelectItem value="NIE">NIE</SelectItem>
                                        <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                                        <SelectItem value="OTHER">Otro</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={clientForm.control}
                                name="nif"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t("clients.idNumber")}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t("placeholder.nif")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={clientForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("common.email")}</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder={t("placeholder.clientEmail")} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end">
                              <Button type="submit" disabled={createClient.isPending}>
                                {createClient.isPending ? t("clients.saving") : t("clients.save")}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
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

                <FormField
                  control={form.control}
                  name="emitImmediately"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="m-0">{t("invoices.emitImmediately")}</FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/invoices">{t("taxpayer.back")}</Link>
                  </Button>
                  <Button type="submit" disabled={createInvoice.isPending}>
                    {createInvoice.isPending ? t("invoices.saving") : t("invoices.saveDraft")}
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
