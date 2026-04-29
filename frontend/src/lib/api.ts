const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  // Prevent "/api" from being duplicated when the base URL already includes it.
  if (API_BASE_URL.endsWith("/api") && (normalizedPath === "/api" || normalizedPath.startsWith("/api/"))) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      headers: {
        ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options?.headers ?? {})
      },
      ...options
    });
  } catch {
    const apiTarget = API_BASE_URL || "the current site";
    throw new Error(`Cannot reach the backend through ${apiTarget}. Start the backend and try again.`);
  }

  let data: unknown = null;
  let textBody = "";

  try {
    data = await response.json();
  } catch {
    try {
      textBody = await response.text();
    } catch {
      textBody = "";
    }
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : textBody.trim()
          ? `HTTP ${response.status}: ${textBody.trim().slice(0, 220)}`
          : `HTTP ${response.status}: Request failed.`;

    throw new Error(errorMessage);
  }

  return data as T;
}

export { API_BASE_URL };
