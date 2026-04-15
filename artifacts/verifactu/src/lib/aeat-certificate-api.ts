export interface AeatCertificateStatus {
  hasCertificate: boolean;
  fileName: string | null;
  uploadedAt: string | null;
  useSealCertificateEndpoint: boolean;
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

export function getAeatCertificateStatus(taxpayerId: number) {
  return apiRequest<AeatCertificateStatus>(`/api/taxpayers/${taxpayerId}/aeat-certificate`);
}

export async function uploadAeatCertificate(
  taxpayerId: number,
  input: { file: File; password: string; useSealCertificateEndpoint: boolean },
) {
  const pfxBase64 = await fileToBase64(input.file);
  return apiRequest<AeatCertificateStatus>(`/api/taxpayers/${taxpayerId}/aeat-certificate`, {
    method: "POST",
    body: JSON.stringify({
      fileName: input.file.name,
      pfxBase64,
      password: input.password,
      useSealCertificateEndpoint: input.useSealCertificateEndpoint,
    }),
  });
}

export function updateAeatCertificateSettings(taxpayerId: number, data: { useSealCertificateEndpoint: boolean }) {
  return apiRequest<AeatCertificateStatus>(`/api/taxpayers/${taxpayerId}/aeat-certificate`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAeatCertificate(taxpayerId: number) {
  return apiRequest<AeatCertificateStatus>(`/api/taxpayers/${taxpayerId}/aeat-certificate`, {
    method: "DELETE",
  });
}
