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
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {taxpayer?.aeatEnvironment === "sandbox" && (
          <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("layout.sandboxBanner")}
          </div>
        )}
        <header className="h-16 border-b flex items-center px-5 lg:px-8 bg-card/90 backdrop-blur shrink-0">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto p-5 md:p-8 lg:p-10 xl:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
