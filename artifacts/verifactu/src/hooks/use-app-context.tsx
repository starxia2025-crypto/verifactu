import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, useListOrganizations, useListTaxpayers } from "@workspace/api-client-react";
import type { Organization, TaxpayerProfile, User } from "@workspace/api-client-react";

interface AppContextType {
  user: User | null;
  organization: Organization | null;
  taxpayer: TaxpayerProfile | null;
  setOrganizationId: (id: number | null) => void;
  setTaxpayerId: (id: number | null) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: organizations, isLoading: isOrgsLoading } = useListOrganizations({
    query: { enabled: !!user }
  });

  const [orgId, setOrgId] = useState<number | null>(() => {
    const saved = localStorage.getItem("verifactu_org_id");
    return saved ? parseInt(saved, 10) : null;
  });

  const [taxId, setTaxId] = useState<number | null>(() => {
    const saved = localStorage.getItem("verifactu_tax_id");
    return saved ? parseInt(saved, 10) : null;
  });

  const organization = organizations?.find((o) => o.id === orgId) || organizations?.[0] || null;
  const activeOrgId = organization?.id || null;

  const { data: taxpayers, isLoading: isTaxpayersLoading } = useListTaxpayers(activeOrgId!, {
    query: { enabled: !!activeOrgId }
  });

  const taxpayer = taxpayers?.find((t) => t.id === taxId) || taxpayers?.[0] || null;

  useEffect(() => {
    if (organization) {
      localStorage.setItem("verifactu_org_id", organization.id.toString());
    } else {
      localStorage.removeItem("verifactu_org_id");
    }
  }, [organization]);

  useEffect(() => {
    if (taxpayer) {
      localStorage.setItem("verifactu_tax_id", taxpayer.id.toString());
    } else {
      localStorage.removeItem("verifactu_tax_id");
    }
  }, [taxpayer]);

  return (
    <AppContext.Provider
      value={{
        user: user || null,
        organization,
        taxpayer,
        setOrganizationId: setOrgId,
        setTaxpayerId: setTaxId,
        isLoading: isUserLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
