import { Link, useLocation } from "wouter";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Database,
  LogOut,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useLogout } from "@workspace/api-client-react";
import { useAppContext } from "@/hooks/use-app-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, organization, taxpayer } = useAppContext();
  const { t } = useLanguage();
  const logout = useLogout();

  const isGestoria = organization?.type === "gestoria";

  const handleLogout = () => {
    localStorage.removeItem("verifactu_token");
    localStorage.removeItem("verifactu_org_id");
    localStorage.removeItem("verifactu_tax_id");
    logout.mutate(undefined, {
      onSettled: () => {
        window.location.href = "/login";
      },
    });
  };

  return (
    <Sidebar className="border-sidebar-border/70 shadow-2xl shadow-slate-950/10">
      <SidebarHeader className="border-b border-sidebar-border/70 px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <FileText className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-sidebar-foreground">VeriFactu</span>
            <span className="block text-xs text-sidebar-foreground/65">{t("app.workspace")}</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {organization && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("app.currentContext")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-1.5 text-sm">
                <div className="font-semibold truncate text-sidebar-foreground">{organization.name}</div>
                {taxpayer && !isGestoria && (
                  <div className="text-xs text-sidebar-foreground/65 truncate">{taxpayer.name}</div>
                )}
                {isGestoria && (
                  <div className="text-xs text-sidebar-foreground/65">Gestoría</div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t("app.menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isGestoria ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/gestoria"}>
                      <Link href="/gestoria">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>{t("app.gestoriaOverview")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/gestoria/incidents"}>
                      <Link href="/gestoria/incidents">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>{t("app.incidents")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>{t("app.dashboard")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!taxpayer && !isGestoria && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/taxpayers/new")}>
                    <Link href="/taxpayers/new">
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>{t("app.createTaxpayer")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!isGestoria && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/invoices")}>
                      <Link href="/invoices">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>{t("app.invoices")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/clients")}>
                      <Link href="/clients">
                        <Users className="mr-2 h-4 w-4" />
                        <span>{t("app.clients")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/products")}>
                      <Link href="/products">
                        <Package className="mr-2 h-4 w-4" />
                        <span>{t("app.products")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/integrations")}>
                      <Link href="/integrations">
                        <Database className="mr-2 h-4 w-4" />
                        <span>{t("app.integrations")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/organizations")}>
                  <Link href="/organizations">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>{t("app.organizations")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!isGestoria && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/settings")}>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t("app.settings")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-4">
        <div className="space-y-3">
          <LanguageSwitcher />
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user?.name}</span>
              <span className="text-xs text-sidebar-foreground/65 truncate max-w-[150px]">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent"
              title={t("app.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
