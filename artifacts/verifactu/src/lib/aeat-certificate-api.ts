export interface AeatCertificate {
  id: number;
  taxpayerId: number;
  status: "ACTIVE" | "INACTIVE" | "REVOKED" | "EXPIRED" | "INVALID";
  originalFileName: string;
  subject: string | null;
  issuer: string | null;
  serialNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  nif: string | null;
  hasPrivateKey: boolean;
  fingerprintSha256: string | null;
  useSealCertificateEndpoint: boolean;
  uploadedByUserId: number | null;
  uploadedAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalCertificateRow {
  taxpayerId: number;
  taxpayerName: string;
  taxpayerNif: string;
  hasCertificate: boolean;
  activeCertificateId: number | null;
  certificateStatus: string;
  certificateFileName: string | null;
  validTo: string | null;
  lastValidationError: string | null;
  useSealCertificateEndpoint: boolean;
  certificateCount: number;
}

const apiBaseUrl = () => ((window as any).__APP_CONFIG__?.API_BASE_URL || "").replace(/\/+$/, "");

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("verifactu_token");
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

export function listAeatCertificates(taxpayerId: number) {
  return apiRequest<AeatCertificate[]>(`/api/taxpayers/${taxpayerId}/aeat-certificates`);
}

export async function uploadAeatCertificate(
  taxpayerId: number,
  input: { file: File; password: string; activate: boolean; useSealCertificateEndpoint: boolean },
) {
  const pfxBase64 = await fileToBase64(input.file);
  return apiRequest<AeatCertificate>(`/api/taxpayers/${taxpayerId}/aeat-certificates`, {
    method: "POST",
    body: JSON.stringify({
      fileName: input.file.name,
      pfxBase64,
      password: input.password,
      activate: input.activate,
      useSealCertificateEndpoint: input.useSealCertificateEndpoint,
    }),
  });
}

export function activateAeatCertificate(taxpayerId: number, certificateId: number) {
  return apiRequest<AeatCertificate>(`/api/taxpayers/${taxpayerId}/aeat-certificates/${certificateId}/activate`, { method: "POST" });
}

export function deactivateAeatCertificate(taxpayerId: number, certificateId: number) {
  return apiRequest<AeatCertificate>(`/api/taxpayers/${taxpayerId}/aeat-certificates/${certificateId}/deactivate`, { method: "POST" });
}

export function validateAeatCertificate(taxpayerId: number, certificateId: number) {
  return apiRequest<AeatCertificate>(`/api/taxpayers/${taxpayerId}/aeat-certificates/${certificateId}/validate`, { method: "POST" });
}

export function updateAeatCertificateSettings(taxpayerId: number, certificateId: number, data: { useSealCertificateEndpoint: boolean }) {
  return apiRequest<AeatCertificate>(`/api/taxpayers/${taxpayerId}/aeat-certificates/${certificateId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAeatCertificate(taxpayerId: number, certificateId: number) {
  return apiRequest<void>(`/api/taxpayers/${taxpayerId}/aeat-certificates/${certificateId}`, {
    method: "DELETE",
  });
}

export function listGlobalAeatCertificates(organizationId: number, params: { status?: string; missing?: boolean } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.missing) search.set("missing", "true");
  const query = search.toString();
  return apiRequest<GlobalCertificateRow[]>(`/api/organizations/${organizationId}/gestoria/certificates${query ? `?${query}` : ""}`);
}
