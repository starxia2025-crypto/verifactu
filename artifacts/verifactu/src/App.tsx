import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppProvider, useAppContext } from "@/hooks/use-app-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LanguageProvider } from "@/lib/i18n";
import { SidebarThemeProvider } from "@/lib/sidebar-theme";
import { CriticalStyles } from "@/components/critical-styles";

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
import GestoriaCertificatesPage from "@/pages/gestoria/certificates";
import AsesoriaDashboardPage from "@/pages/asesoria/dashboard";
import AsesoriaFiscalClientsPage from "@/pages/asesoria/clients";
import AsesoriaFiscalClientDetailPage from "@/pages/asesoria/client-detail";
import AsesoriaFiscalClientCertificatesPage from "@/pages/asesoria/client-certificates";
import DigitalCertificatePage from "@/pages/certificates/digital";
import FiscalDataPage from "@/pages/fiscal-data";
import AeatSubmissionsPage from "@/pages/aeat-submissions";
import UsersPermissionsPage from "@/pages/users";

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

function OrgModeGuard({ mode, children }: { mode: "asesoria" | "business"; children: React.ReactNode }) {
  const { organizationType, isLoading } = useAppContext();
  if (isLoading) return null;
  const isAsesoria = organizationType === "asesoria";
  if (mode === "asesoria" && !isAsesoria) return <Redirect to="/dashboard" />;
  if (mode === "business" && isAsesoria) return <Redirect to="/asesoria" />;
  return <>{children}</>;
}

function MainRouter() {
  const { user, isLoading, organizationType } = useAppContext();

  if (isLoading) return null;

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to={organizationType === "asesoria" ? "/asesoria" : "/dashboard"} /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        <AuthGuard><OrgModeGuard mode="business"><DashboardPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/asesoria">
        <AuthGuard><OrgModeGuard mode="asesoria"><AsesoriaDashboardPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/gestoria">
        <AuthGuard><Redirect to="/asesoria" /></AuthGuard>
      </Route>
      <Route path="/asesoria/clientes-fiscales">
        <AuthGuard><OrgModeGuard mode="asesoria"><AsesoriaFiscalClientsPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/asesoria/clientes-fiscales/:id/certificados">
        {(params) => <AuthGuard><OrgModeGuard mode="asesoria"><AsesoriaFiscalClientCertificatesPage id={Number(params.id)} /></OrgModeGuard></AuthGuard>}
      </Route>
      <Route path="/asesoria/clientes-fiscales/:id">
        {(params) => <AuthGuard><OrgModeGuard mode="asesoria"><AsesoriaFiscalClientDetailPage id={Number(params.id)} /></OrgModeGuard></AuthGuard>}
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
      <Route path="/digital-certificate">
        <AuthGuard><OrgModeGuard mode="business"><DigitalCertificatePage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/fiscal-data">
        <AuthGuard><OrgModeGuard mode="business"><FiscalDataPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/aeat-submissions">
        <AuthGuard><AeatSubmissionsPage /></AuthGuard>
      </Route>
      <Route path="/users">
        <AuthGuard><OrgModeGuard mode="asesoria"><UsersPermissionsPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/asesoria/certificados">
        <AuthGuard><OrgModeGuard mode="asesoria"><GestoriaCertificatesPage /></OrgModeGuard></AuthGuard>
      </Route>
      <Route path="/gestoria/certificates">
        <AuthGuard><Redirect to="/asesoria/certificados" /></AuthGuard>
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
              <CriticalStyles />
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
