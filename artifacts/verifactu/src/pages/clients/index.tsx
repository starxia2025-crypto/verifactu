import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListClients, useCreateClient } from "@workspace/api-client-react";
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
    query: { enabled: !!taxpayer }
  });

  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createClient = useCreateClient();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
          form.reset();
        },
        onError: () => {
          toast({ variant: "destructive", title: t("clients.createFailed") });
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("clients.title")}</h1>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>{t("clients.new")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t("clients.createTitle")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>{t("clients.name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Client Name" {...field} />
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
                                <SelectValue placeholder="Select type" />
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
                            <Input placeholder="12345678Z" {...field} />
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
                            <Input type="email" placeholder="client@example.com" {...field} />
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
                            <Input placeholder="+34 600 000 000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createClient.isPending}>
                      {createClient.isPending ? t("clients.saving") : t("clients.save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                    </TableRow>
                  ))}
                  {(!clients || clients.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
