import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppProvider, useAppContext } from "@/hooks/use-app-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LanguageProvider } from "@/lib/i18n";
import { SidebarThemeProvider } from "@/lib/sidebar-theme";

import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import DashboardPage from "@/pages/dashboard";
import OrganizationsPage from "@/pages/organizations";
import NewOrganizationPage from "@/pages/organizations/new";
import NewTaxpayerPage from "@/pages/taxpayers/new";
import InvoicesPage from "@/pages/invoices";
import NewInvoicePage from "@/pages/invoices/new";
import InvoiceDetailPage from "@/pages/invoices/detail";
import EditInvoicePage from "@/pages/invoices/edit";
import ClientsPage from "@/pages/clients";
import ProductsPage from "@/pages/products";
import IntegrationsPage from "@/pages/integrations";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAppContext();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function MainRouter() {
  const { user, isLoading } = useAppContext();

  if (isLoading) return null;

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        <AuthGuard><DashboardPage /></AuthGuard>
      </Route>
      <Route path="/organizations">
        <AuthGuard><OrganizationsPage /></AuthGuard>
      </Route>
      <Route path="/organizations/new">
        <AuthGuard><NewOrganizationPage /></AuthGuard>
      </Route>
      <Route path="/taxpayers/new">
        <AuthGuard><NewTaxpayerPage /></AuthGuard>
      </Route>
      <Route path="/invoices">
        <AuthGuard><InvoicesPage /></AuthGuard>
      </Route>
      <Route path="/invoices/new">
        <AuthGuard><NewInvoicePage /></AuthGuard>
      </Route>
      <Route path="/invoices/:id/edit">
        {(params) => <AuthGuard><EditInvoicePage id={Number(params.id)} /></AuthGuard>}
      </Route>
      <Route path="/invoices/:id">
        {(params) => <AuthGuard><InvoiceDetailPage id={Number(params.id)} /></AuthGuard>}
      </Route>
      <Route path="/clients">
        <AuthGuard><ClientsPage /></AuthGuard>
      </Route>
      <Route path="/products">
        <AuthGuard><ProductsPage /></AuthGuard>
      </Route>
      <Route path="/integrations">
        <AuthGuard><IntegrationsPage /></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><SettingsPage /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SidebarThemeProvider>
          <AppProvider>
            <TooltipProvider>
              <SidebarProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <MainRouter />
                </WouterRouter>
              </SidebarProvider>
              <Toaster />
            </TooltipProvider>
          </AppProvider>
        </SidebarThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
