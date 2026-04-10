import { Link, useLocation } from "wouter";
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  Settings, 
  LogOut,
  AlertCircle,
  UserPlus
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

export function AppSidebar() {
  const [location] = useLocation();
  const { user, organization, taxpayer } = useAppContext();
  const logout = useLogout();

  const isGestoria = organization?.type === "gestoria";

  const handleLogout = () => {
    localStorage.removeItem("verifactu_token");
    localStorage.removeItem("verifactu_org_id");
    localStorage.removeItem("verifactu_tax_id");
    logout.mutate(undefined, {
      onSettled: () => {
        window.location.href = "/login";
      }
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <FileText className="h-6 w-6" />
          <span>VeriFactu</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {organization && (
          <SidebarGroup>
            <SidebarGroupLabel>Current Context</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium truncate">{organization.name}</div>
                {taxpayer && !isGestoria && (
                  <div className="text-xs text-muted-foreground truncate">{taxpayer.name}</div>
                )}
                {isGestoria && (
                  <div className="text-xs text-muted-foreground">Gestoría</div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isGestoria ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/gestoria"}>
                      <Link href="/gestoria">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Gestoría Overview</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/gestoria/incidents"}>
                      <Link href="/gestoria/incidents">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>Incidents</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!taxpayer && !isGestoria && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/taxpayers/new")}>
                    <Link href="/taxpayers/new">
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Create Taxpayer</span>
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
                        <span>Invoices</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/clients")}>
                      <Link href="/clients">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Clients</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/products")}>
                      <Link href="/products">
                        <Package className="mr-2 h-4 w-4" />
                        <span>Products & Services</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/organizations")}>
                  <Link href="/organizations">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Organizations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!isGestoria && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/settings")}>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
