import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAppContext } from "@/hooks/use-app-context";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function MainLayout({ children }: { children: ReactNode }) {
  const { taxpayer } = useAppContext();
  const { t } = useLanguage();
  
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {taxpayer?.aeatEnvironment === "sandbox" && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            {t("layout.sandboxBanner")}
          </div>
        )}
        <header className="flex h-16 shrink-0 items-center border-b bg-card/90 px-5 backdrop-blur lg:px-8">
          <SidebarTrigger />
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-8 lg:p-10 xl:p-12">
          <div className="w-full max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
