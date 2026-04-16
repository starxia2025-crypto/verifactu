import { canManageUsers, isAsesoria } from "./org-mode.ts";

export type NavigationKey =
  | "dashboard"
  | "fiscalClients"
  | "invoices"
  | "clients"
  | "products"
  | "aeatSubmissions"
  | "certificates"
  | "digitalCertificate"
  | "fiscalData"
  | "usersPermissions"
  | "settings"
  | "createTaxpayer";

export function getVisibleNavigationKeys(input: {
  organizationType?: string | null;
  role?: string | null;
  hasTaxpayer?: boolean;
}): NavigationKey[] {
  if (isAsesoria(input.organizationType)) {
    return [
      "dashboard",
      "fiscalClients",
      "invoices",
      "aeatSubmissions",
      "certificates",
      ...(canManageUsers(input.role) ? (["usersPermissions"] as const) : []),
      "settings",
    ];
  }

  return [
    "dashboard",
    ...(input.hasTaxpayer ? [] : (["createTaxpayer"] as const)),
    "invoices",
    "clients",
    "products",
    "aeatSubmissions",
    "digitalCertificate",
    "fiscalData",
    "settings",
  ];
}
