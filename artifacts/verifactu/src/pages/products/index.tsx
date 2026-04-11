import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { BulkImportDialog, type ImportRow } from "@/components/bulk-import-dialog";

const productSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100),
  unit: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function formatMoney(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} €`;
}

export default function ProductsPage() {
  const { taxpayer } = useAppContext();
  const { data: products, isLoading } = useListProducts(taxpayer?.id || 0, {}, {
    query: { enabled: !!taxpayer } as any
  });

  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

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
          setEditingProduct(null);
          form.reset();
        },
        onError: () => {
          toast({ variant: "destructive", title: t("products.createFailed") });
        }
      }
    );
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    form.reset({
      name: product.name || "",
      description: product.description || "",
      unitPrice: Number(product.unitPrice ?? 0),
      vatRate: Number(product.vatRate ?? taxpayer?.defaultVatRate ?? 21),
      unit: product.unit || "ud",
    });
    setIsOpen(true);
  };

  const onSubmitEdit = (data: ProductFormValues) => {
    if (!taxpayer || !editingProduct) return;
    updateProduct.mutate(
      {
        id: editingProduct.id,
        data: {
          ...data,
          description: data.description || null,
          unit: data.unit || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(taxpayer.id) });
          toast({ title: t("common.updated") });
          setIsOpen(false);
          setEditingProduct(null);
          form.reset();
        },
        onError: () => toast({ variant: "destructive", title: t("common.updateFailed") }),
      },
    );
  };

  const handleDelete = (product: any) => {
    if (!taxpayer) return;
    deleteProduct.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(taxpayer.id) });
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

  const importProducts = async (rows: ImportRow[]) => {
    if (!taxpayer) return;
    for (const row of rows) {
      const name = readCell(row, ["name", "nombre"]);
      if (!name) continue;
      await createProduct.mutateAsync({
        taxpayerId: taxpayer.id,
        data: {
          name,
          description: readCell(row, ["description", "descripcion", "descripción"]) || null,
          unitPrice: Number(readCell(row, ["unitPrice", "precio", "precioUnitario"]) || 0),
          vatRate: Number(readCell(row, ["vatRate", "iva"]) || taxpayer.defaultVatRate || 21),
          unit: readCell(row, ["unit", "unidad"]) || null,
        },
      });
    }
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(taxpayer.id) });
  };

  const importColumns =
    language === "es"
      ? ["nombre", "descripcion", "precioUnitario", "iva", "unidad"]
      : ["name", "description", "unitPrice", "vatRate", "unit"];
  const sampleRow =
    language === "es"
      ? { nombre: "Consultoria mensual", descripcion: "Servicio profesional", precioUnitario: 250, iva: 21, unidad: "ud" }
      : { name: "Monthly consulting", description: "Professional service", unitPrice: 250, vatRate: 21, unit: "unit" };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("products.title")}</h1>
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog
              title={`${t("import.button")} - ${t("products.title")}`}
              columns={importColumns}
              sampleRow={sampleRow}
              templateFileName={language === "es" ? "plantilla-productos.xlsx" : "products-template.xlsx"}
              onImport={importProducts}
            />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingProduct(null); form.reset(); }}>{t("products.new")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? `${t("common.edit")} ${editingProduct.name}` : t("products.createTitle")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingProduct ? onSubmitEdit : onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("products.name")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("placeholder.productName")} {...field} />
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
                          <Input placeholder={t("placeholder.productDescription")} {...field} />
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
                          <FormLabel>{t("products.unitPrice")}</FormLabel>
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
                    <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                      {createProduct.isPending || updateProduct.isPending ? t("products.saving") : t("products.save")}
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
              <div className="p-8 text-center text-muted-foreground">{t("products.loading")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products.name")}</TableHead>
                    <TableHead>{t("products.description")}</TableHead>
                    <TableHead className="text-right">{t("products.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("products.vatRate")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.description || "-"}</TableCell>
                      <TableCell className="text-right">{formatMoney(product.unitPrice)}</TableCell>
                      <TableCell className="text-right">{product.vatRate}%</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(product)}>
                            {t("common.edit")}
                          </Button>
                          <ConfirmDeleteDialog
                            itemName={product.name}
                            isDeleting={deleteProduct.isPending}
                            onConfirm={() => handleDelete(product)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!products || products.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
