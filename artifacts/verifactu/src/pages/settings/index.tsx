import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTaxpayer } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getListTaxpayersQueryKey } from "@workspace/api-client-react";

const settingsSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  postalCode: z.string().min(2),
  province: z.string().min(2),
  aeatEnvironment: z.enum(["sandbox", "production"]),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { taxpayer, organization } = useAppContext();
  const { toast } = useToast();
  const updateTaxpayer = useUpdateTaxpayer();
  const queryClient = useQueryClient();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: taxpayer?.name || "",
      address: taxpayer?.address || "",
      city: taxpayer?.city || "",
      postalCode: taxpayer?.postalCode || "",
      province: taxpayer?.province || "",
      aeatEnvironment: taxpayer?.aeatEnvironment || "sandbox",
    }
  });

  const onSubmit = (data: SettingsFormValues) => {
    if (!taxpayer) return;
    updateTaxpayer.mutate(
      { id: taxpayer.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTaxpayersQueryKey(organization?.id || 0) });
          toast({ title: "Settings updated successfully" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update settings" });
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Taxpayer Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="aeatEnvironment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AEAT Environment</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={updateTaxpayer.isPending}>
                  {updateTaxpayer.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}