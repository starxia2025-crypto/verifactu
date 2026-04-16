import { Link, useLocation } from "wouter";
import type React from "react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Send,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLogout } from "@workspace/api-client-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAppContext } from "@/hooks/use-app-context";
import { useLanguage } from "@/lib/i18n";
import { canManageUsers, isAsesoria } from "@/lib/org-mode";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, organization, organizationRole, taxpayer } = useAppContext();
  const { t } = useLanguage();
  const logout = useLogout();
  const asesorMode = isAsesoria(organization?.type);

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
                <div className="truncate font-semibold text-sidebar-foreground">{organization.name}</div>
                {asesorMode ? (
                  <div className="text-xs text-sidebar-foreground/65">Asesoria</div>
                ) : taxpayer ? (
                  <div className="truncate text-xs text-sidebar-foreground/65">{taxpayer.name}</div>
                ) : null}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t("app.menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {asesorMode ? (
                <>
                  <MenuItem active={location === "/asesoria"} href="/asesoria" icon={<LayoutDashboard />} label={t("app.dashboard")} />
                  <MenuItem active={location.startsWith("/asesoria/clientes-fiscales")} href="/asesoria/clientes-fiscales" icon={<Building2 />} label={t("app.fiscalClients")} />
                  <MenuItem active={location.startsWith("/invoices")} href="/invoices" icon={<FileText />} label={t("app.invoices")} />
                  <MenuItem active={location.startsWith("/aeat-submissions")} href="/aeat-submissions" icon={<Send />} label={t("app.aeatSubmissions")} />
                  <MenuItem active={location.startsWith("/asesoria/certificados")} href="/asesoria/certificados" icon={<ShieldCheck />} label={t("app.certificates")} />
                  {canManageUsers(organizationRole) ? (
                    <MenuItem active={location.startsWith("/users")} href="/users" icon={<UserCog />} label={t("app.usersPermissions")} />
                  ) : null}
                  <MenuItem active={location.startsWith("/settings")} href="/settings" icon={<Settings />} label={t("app.settings")} />
                </>
              ) : (
                <>
                  <MenuItem active={location === "/dashboard"} href="/dashboard" icon={<LayoutDashboard />} label={t("app.dashboard")} />
                  {!taxpayer ? (
                    <MenuItem active={location.startsWith("/taxpayers/new")} href="/taxpayers/new" icon={<UserPlus />} label={t("app.createTaxpayer")} />
                  ) : null}
                  <MenuItem active={location.startsWith("/invoices")} href="/invoices" icon={<FileText />} label={t("app.invoices")} />
                  <MenuItem active={location.startsWith("/clients")} href="/clients" icon={<Users />} label={t("app.clients")} />
                  <MenuItem active={location.startsWith("/products")} href="/products" icon={<Package />} label={t("app.products")} />
                  <MenuItem active={location.startsWith("/aeat-submissions")} href="/aeat-submissions" icon={<Send />} label={t("app.aeatSubmissions")} />
                  <MenuItem active={location.startsWith("/digital-certificate")} href="/digital-certificate" icon={<ShieldCheck />} label={t("app.digitalCertificate")} />
                  <MenuItem active={location.startsWith("/fiscal-data")} href="/fiscal-data" icon={<Building2 />} label={t("app.fiscalData")} />
                  <MenuItem active={location.startsWith("/settings")} href="/settings" icon={<Settings />} label={t("app.settings")} />
                </>
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
              <span className="max-w-[150px] truncate text-xs text-sidebar-foreground/65">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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

function MenuItem({ active, href, icon, label }: { active: boolean; href: string; icon: React.ReactNode; label: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link href={href}>
          <span className="[&>svg]:mr-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
