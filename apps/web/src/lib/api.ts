import {
  clearDesktopAuthToken,
  getDesktopAuthToken,
} from "./auth-token";
import { getClientInstanceId } from "./client-instance";

export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export class ApiRequestError<T = unknown> extends Error {
  status: number;
  payload: T | null;

  constructor(status: number, message: string, payload: T | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const authToken = getDesktopAuthToken();
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (!headers.has("X-Lifever-Client-Id")) {
    headers.set("X-Lifever-Client-Id", getClientInstanceId());
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && authToken) clearDesktopAuthToken();

    const payload = (await response.json().catch(() => null)) as
      | ({ error?: string } & Record<string, unknown>)
      | null;
    throw new ApiRequestError(
      response.status,
      payload?.error ?? `Request failed with status ${response.status}`,
      payload,
    );
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
