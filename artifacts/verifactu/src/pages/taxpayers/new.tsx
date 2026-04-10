import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useCreateTaxpayer, getListTaxpayersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const taxpayerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  tradeName: z.string().optional().or(z.literal("")),
  nif: z.string().min(2, "NIF/CIF is required"),
  nifType: z.enum(["NIF", "NIE", "CIF", "PASSPORT", "OTHER"]),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  province: z.string().min(2, "Province is required"),
  country: z.string().min(2).default("ES"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  defaultVatRate: z.coerce.number().min(0).max(100),
});

type TaxpayerFormValues = z.infer<typeof taxpayerSchema>;

export default function NewTaxpayerPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTaxpayer = useCreateTaxpayer();
  const { organization, setTaxpayerId } = useAppContext();

  const form = useForm<TaxpayerFormValues>({
    resolver: zodResolver(taxpayerSchema),
    defaultValues: {
      name: organization?.name || "",
      tradeName: "",
      nif: organization?.nif || "",
      nifType: "NIF",
      address: organization?.address || "",
      city: organization?.city || "",
      postalCode: organization?.postalCode || "",
      province: organization?.province || "",
      country: organization?.country || "ES",
      email: organization?.email || "",
      phone: organization?.phone || "",
      defaultVatRate: 21,
    },
  });

  const onSubmit = (data: TaxpayerFormValues) => {
    if (!organization) return;

    createTaxpayer.mutate(
      {
        orgId: organization.id,
        data: {
          ...data,
          tradeName: data.tradeName || null,
          email: data.email || null,
          phone: data.phone || null,
        },
      },
      {
        onSuccess: (newTaxpayer) => {
          queryClient.invalidateQueries({ queryKey: getListTaxpayersQueryKey(organization.id) });
          setTaxpayerId(newTaxpayer.id);
          toast({ title: "Taxpayer profile created successfully" });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Failed to create taxpayer",
            description: error?.message || "Please review the form and try again.",
          });
        },
      },
    );
  };

  if (!organization) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Create Taxpayer Profile</h1>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">
                You need an organization before creating a taxpayer profile.
              </p>
              <Button asChild>
                <Link href="/organizations/new">Create organization</Link>
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create Taxpayer Profile</h1>
          <p className="text-muted-foreground">
            This profile identifies the invoicing entity that will issue VERI*FACTU invoices inside{" "}
            <span className="font-medium">{organization.name}</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fiscal information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal name</FormLabel>
                        <FormControl>
                          <Input placeholder="Starxia S.L." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade name</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
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
                        <FormLabel>Document type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NIF">NIF</SelectItem>
                            <SelectItem value="NIE">NIE</SelectItem>
                            <SelectItem value="CIF">CIF</SelectItem>
                            <SelectItem value="PASSPORT">Passport</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
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
                        <FormLabel>NIF / CIF</FormLabel>
                        <FormControl>
                          <Input placeholder="B12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street and number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="billing@example.com" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+34 600 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultVatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default VAT rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/organizations">Back</Link>
                  </Button>
                  <Button type="submit" disabled={createTaxpayer.isPending}>
                    {createTaxpayer.isPending ? "Creating..." : "Create taxpayer"}
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
