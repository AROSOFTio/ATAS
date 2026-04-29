const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options?.headers ?? {})
      },
      ...options
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE_URL}. Start the backend and try again.`);
  }

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed.";

    throw new Error(errorMessage);
  }

  return data as T;
}

export { API_BASE_URL };

