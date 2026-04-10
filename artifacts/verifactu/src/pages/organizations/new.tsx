import { MainLayout } from "@/components/layout/main-layout";
import { useAppContext } from "@/hooks/use-app-context";
import { useCreateOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrganizationsQueryKey } from "@workspace/api-client-react";

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["autonomo", "empresa", "gestoria"]),
  nif: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

export default function NewOrganizationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrg = useCreateOrganization();
  const queryClient = useQueryClient();
  const { setOrganizationId } = useAppContext();

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      type: "autonomo",
      nif: "",
    },
  });

  const onSubmit = (data: OrgFormValues) => {
    createOrg.mutate(
      { data },
      {
        onSuccess: (newOrg) => {
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setOrganizationId(newOrg.id);
          toast({ title: "Organization created successfully" });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to create organization" });
        }
      }
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">New Organization</h1>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme S.L." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="autonomo">Autónomo / Freelance</SelectItem>
                          <SelectItem value="empresa">Empresa / SME</SelectItem>
                          <SelectItem value="gestoria">Gestoría / Agency</SelectItem>
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
                      <FormLabel>NIF / CIF (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="B12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createOrg.isPending}>
                  {createOrg.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}