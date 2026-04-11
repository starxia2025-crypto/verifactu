export interface ApiKey {
  id: number;
  taxpayerId: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string | null;
  createdAt: string;
  token?: string;
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

export function listApiKeys(taxpayerId: number) {
  return apiRequest<ApiKey[]>(`/api/taxpayers/${taxpayerId}/api-keys`);
}

export function createApiKey(taxpayerId: number, data: { name: string; scopes: string[] }) {
  return apiRequest<ApiKey>(`/api/taxpayers/${taxpayerId}/api-keys`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteApiKey(id: number) {
  return apiRequest<void>(`/api/api-keys/${id}`, { method: "DELETE" });
}
