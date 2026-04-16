export type OrganizationMode = "asesoria" | "autonomo" | "empresa";

export function normalizeOrganizationMode(type?: string | null): OrganizationMode | null {
  if (!type) return null;
  return type === "gestoria" ? "asesoria" : (type as OrganizationMode);
}

export function isAsesoria(type?: string | null) {
  return normalizeOrganizationMode(type) === "asesoria";
}

export function canManageCertificates(role?: string | null) {
  return role ? ["owner", "admin", "asesor"].includes(role) : false;
}

export function canManageUsers(role?: string | null) {
  return role ? ["owner", "admin"].includes(role) : false;
}
