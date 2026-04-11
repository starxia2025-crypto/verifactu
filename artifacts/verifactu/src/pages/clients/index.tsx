import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListClientsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { BulkImportDialog, type ImportRow } from "@/components/bulk-import-dialog";

const clientSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  nif: z.string().min(1, "El NIF/CIF es obligatorio"),
  nifType: z.string().min(1, "El tipo es obligatorio"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  country: z.string().default("ES"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { taxpayer } = useAppContext();
  const { data: clients, isLoading } = useListClients(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer } as any
  });

  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [editingClient, setEditingClient] = useState<any | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      nif: "",
      nifType: "NIF",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      country: "ES"
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    if (!taxpayer) return;
    createClient.mutate(
      {
        taxpayerId: taxpayer.id,
        data: {
          ...data,
          nif: data.nif || null,
          nifType: data.nifType || null,
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
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey(taxpayer.id) });
          toast({ title: t("clients.created") });
          setIsOpen(false);
          setEditingClient(null);
          form.reset();
        },
        onError: () => {
          toast({ variant: "destructive", title: t("clients.createFailed") });
        }
      }
    );
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    form.reset({
      name: client.name || "",
      nif: client.nif || "",
      nifType: client.nifType || "NIF",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      postalCode: client.postalCode || "",
      province: client.province || "",
      country: client.country || "ES",
    });
    setIsOpen(true);
  };

  const onSubmitEdit = (data: ClientFormValues) => {
    if (!editingClient || !taxpayer) return;
    updateClient.mutate(
      {
        id: editingClient.id,
        data: {
          ...data,
          nif: data.nif || null,
          nifType: data.nifType || null,
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
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey(taxpayer.id) });
          toast({ title: t("common.updated") });
          setIsOpen(false);
          setEditingClient(null);
          form.reset();
        },
        onError: () => toast({ variant: "destructive", title: t("common.updateFailed") }),
      },
    );
  };

  const handleDelete = (client: any) => {
    if (!taxpayer) return;
    deleteClient.mutate(
      { id: client.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey(taxpayer.id) });
          toast({ title: t("common.deleted") });
        },
        onError: () => toast({ variant: "destructive", title: t("common.deleteFailed") }),
      },
    );
  };

  const readCell = (row: ImportRow, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
  };

  const importClients = async (rows: ImportRow[]) => {
    if (!taxpayer) return;
    for (const row of rows) {
      const name = readCell(row, ["name", "nombre", "razonSocial", "razón social"]);
      if (!name) continue;
      await createClient.mutateAsync({
        taxpayerId: taxpayer.id,
        data: {
          name,
          nif: readCell(row, ["nif", "cif"]) || null,
          nifType: readCell(row, ["nifType", "tipoDocumento", "tipo"]) || "NIF",
          email: readCell(row, ["email", "correo"]) || null,
          phone: readCell(row, ["phone", "telefono", "teléfono"]) || null,
          address: readCell(row, ["address", "direccion", "dirección"]) || null,
          city: readCell(row, ["city", "ciudad"]) || null,
          postalCode: readCell(row, ["postalCode", "codigoPostal", "código postal"]) || null,
          province: readCell(row, ["province", "provincia"]) || null,
          country: readCell(row, ["country", "pais", "país"]) || "ES",
        },
      });
    }
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey(taxpayer.id) });
  };

  const importColumns =
    language === "es"
      ? ["nombre", "nif", "tipoDocumento", "email", "telefono", "direccion", "ciudad", "codigoPostal", "provincia", "pais"]
      : ["name", "nif", "nifType", "email", "phone", "address", "city", "postalCode", "province", "country"];
  const sampleRow =
    language === "es"
      ? {
          nombre: "Cliente Demo S.L.",
          nif: "B12345678",
          tipoDocumento: "CIF",
          email: "cliente@ejemplo.com",
          telefono: "+34 600 000 000",
          direccion: "Calle Mayor 1",
          ciudad: "Madrid",
          codigoPostal: "28013",
          provincia: "Madrid",
          pais: "ES",
        }
      : {
          name: "Demo Client Ltd",
          nif: "B12345678",
          nifType: "CIF",
          email: "client@example.com",
          phone: "+34 600 000 000",
          address: "Main Street 1",
          city: "Madrid",
          postalCode: "28013",
          province: "Madrid",
          country: "ES",
        };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("clients.title")}</h1>
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog
              title={`${t("import.button")} - ${t("clients.title")}`}
              columns={importColumns}
              sampleRow={sampleRow}
              templateFileName={language === "es" ? "plantilla-clientes.xlsx" : "clients-template.xlsx"}
              onImport={importClients}
            />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingClient(null); form.reset(); }}>{t("clients.new")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingClient ? `${t("common.edit")} ${editingClient.name}` : t("clients.createTitle")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingClient ? onSubmitEdit : onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>{t("clients.name")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("placeholder.clientName")} {...field} />
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
                          <FormLabel>{t("clients.idType")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("placeholder.selectType")} />
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
                      control={form.control}
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

                    <FormField
                      control={form.control}
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

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("clients.phone")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("placeholder.phone")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                      {createClient.isPending || updateClient.isPending ? t("clients.saving") : t("clients.save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">{t("clients.loading")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clients.name")}</TableHead>
                    <TableHead>ID (NIF/CIF)</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{t("clients.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.nif || "-"}</TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell>
                        {client.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">{t("clients.active")}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">{t("clients.inactive")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(client)}>
                            {t("common.edit")}
                          </Button>
                          <ConfirmDeleteDialog
                            itemName={client.name}
                            isDeleting={deleteClient.isPending}
                            onConfirm={() => handleDelete(client)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!clients || clients.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("clients.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
