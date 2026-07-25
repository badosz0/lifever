import {
  clearDesktopAuthToken,
  getDesktopAuthToken,
} from "./auth-token";

export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const authToken = getDesktopAuthToken();
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && authToken) clearDesktopAuthToken();

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
