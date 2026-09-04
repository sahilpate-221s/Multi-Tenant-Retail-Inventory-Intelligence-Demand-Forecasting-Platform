const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let currentAccessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessTokenForClient(token: string | null) {
  currentAccessToken = token;
}

export class ApiError extends Error {
  code: string;
  requestId?: string;
  status: number;

  constructor(message: string, code: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        setAccessTokenForClient(null);
        return null;
      }
      const body = await res.json();
      if (body?.success && body?.data?.accessToken) {
        const token = body.data.accessToken as string;
        setAccessTokenForClient(token);
        return token;
      }
      setAccessTokenForClient(null);
      return null;
    } catch {
      setAccessTokenForClient(null);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
        ...options.headers,
      },
      credentials: "include",
    });
  } catch {
    throw new ApiError("Network error — could not reach the server.", "NETWORK_ERROR", 0);
  }

  if (response.status === 401 && !isRetry && !path.startsWith("/api/auth/")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
  }

  let body: ApiResponse<T> | undefined;
  try {
    body = await response.json();
  } catch {
    // No JSON body — fall through to status-based error below.
  }

  if (!response.ok || !body || body.success === false) {
    const errorBody = body && body.success === false ? body.error : undefined;
    throw new ApiError(
      errorBody?.message || `Request failed with status ${response.status}`,
      errorBody?.code || "UNKNOWN_ERROR",
      response.status,
      errorBody?.requestId,
    );
  }

  return body;
}

async function requestData<T>(path: string, options: RequestInit = {}): Promise<T> {
  const body = await request<T>(path, options);
  return (body as ApiSuccessResponse<T>).data;
}

export async function getPaginated<T>(
  path: string,
): Promise<{ items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const body = await request<T[]>(path, { method: "GET" });
  const successBody = body as ApiSuccessResponse<T[]>;
  return {
    items: successBody.data,
    pagination: successBody.pagination || { page: 1, pageSize: 10, total: successBody.data.length, totalPages: 1 },
  };
}

export async function postFile<T>(path: string, file: File): Promise<T> {
  const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {},
    credentials: "include",
    body: formData,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new ApiError(body?.error?.message || "Upload failed", body?.error?.code || "UNKNOWN_ERROR", res.status);
  }
  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => requestData<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    requestData<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    requestData<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => requestData<T>(path, { method: "DELETE" }),
};