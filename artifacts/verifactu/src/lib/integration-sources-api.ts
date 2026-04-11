export type IntegrationSourceType = "excel" | "csv" | "postgres" | "mysql" | "sqlserver" | "dbf";

export interface IntegrationSource {
  id: number;
  taxpayerId: number;
  name: string;
  type: IntegrationSourceType;
  status: "draft" | "ready" | "error";
  config: Record<string, unknown>;
  lastTestStatus?: string | null;
  lastTestMessage?: string | null;
  lastTestedAt?: string | null;
}

export interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
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

export function listIntegrationSources(taxpayerId: number) {
  return apiRequest<IntegrationSource[]>(`/api/taxpayers/${taxpayerId}/integration-sources`);
}

export function createIntegrationSource(
  taxpayerId: number,
  data: { name: string; type: IntegrationSourceType; config: Record<string, unknown> },
) {
  return apiRequest<IntegrationSource>(`/api/taxpayers/${taxpayerId}/integration-sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function testIntegrationSource(id: number) {
  return apiRequest<{ ok: boolean; message: string }>(`/api/integration-sources/${id}/test`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function previewIntegrationSource(id: number) {
  return apiRequest<PreviewResult>(`/api/integration-sources/${id}/preview`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteIntegrationSource(id: number) {
  return apiRequest<void>(`/api/integration-sources/${id}`, { method: "DELETE" });
}
