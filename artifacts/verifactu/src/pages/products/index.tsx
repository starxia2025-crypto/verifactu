import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListProducts, useCreateProduct } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";

const productSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
  unit: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { taxpayer } = useAppContext();
  const { data: products, isLoading } = useListProducts(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer }
  });

  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      unitPrice: 0,
      vatRate: taxpayer?.defaultVatRate || 21,
      unit: "ud",
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    if (!taxpayer) return;
    createProduct.mutate(
      {
        taxpayerId: taxpayer.id,
        data: {
          ...data,
          description: data.description || null,
          unit: data.unit || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(taxpayer.id) });
          toast({ title: t("products.created") });
          setIsOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ variant: "destructive", title: t("products.createFailed") });
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("products.title")}</h1>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>{t("products.new")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("products.createTitle")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("products.name")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("products.name")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("products.description")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("products.description")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (€)</FormLabel>
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
                          <FormLabel>{t("products.vatRate")}</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createProduct.isPending}>
                      {createProduct.isPending ? t("products.saving") : t("products.save")}
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
              <div className="p-8 text-center text-muted-foreground">{t("products.loading")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products.name")}</TableHead>
                    <TableHead>{t("products.description")}</TableHead>
                    <TableHead className="text-right">{t("products.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("products.vatRate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.description || "-"}</TableCell>
                      <TableCell className="text-right">{product.unitPrice.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{product.vatRate}%</TableCell>
                    </TableRow>
                  ))}
                  {(!products || products.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {t("products.empty")}
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
