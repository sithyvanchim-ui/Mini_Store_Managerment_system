export class ApiError extends Error {
  status: number;
  code?: string;
  detail: string;

  constructor(status: number, detail: string, code?: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function toQuery(params: object = {}): string {
  const search = new URLSearchParams();
  const record = params as Record<string, QueryValue>;
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

function apiBase(): string {
  if (typeof window !== "undefined") return "";
  return process.env.API_URL ?? "http://127.0.0.1:8000";
}

function isJsonResponse(response: Response): boolean {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = `Request failed with status ${response.status}`;
  let code: string | undefined;

  if (isJsonResponse(response)) {
    try {
      const body = (await response.json()) as {
        detail?: string | Array<{ msg?: string }>;
        code?: string;
      };
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((item) => item.msg ?? "Invalid value").join(", ");
      } else if (body.detail) {
        detail = body.detail;
      }
      code = body.code;
    } catch {
      // Keep the generic message.
    }
  }

  return new ApiError(response.status, detail, code);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;

  if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await parseError(response);
    const isLoginPage =
      typeof window !== "undefined" && window.location.pathname.startsWith("/login");

    if (response.status === 401 && !isLoginPage && typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.assign(`/login?next=${next}`);
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJsonResponse(response)) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string, init?: RequestInit) {
    return apiFetch<T>(path, { ...init, method: "GET" });
  },
  post<T>(path: string, body?: unknown, init?: RequestInit) {
    return apiFetch<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown, init?: RequestInit) {
    return apiFetch<T>(path, {
      ...init,
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  delete<T>(path: string, init?: RequestInit) {
    return apiFetch<T>(path, { ...init, method: "DELETE" });
  },
};
