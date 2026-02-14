// ---------------------------------------------------------------------------
// Centralized API Fetch Wrapper
// ---------------------------------------------------------------------------
// All client-side HTTP calls MUST go through this module.
// Raw `fetch()` in components or hooks is prohibited (FR-018).
// ---------------------------------------------------------------------------

// --- Response Types (discriminated union) -----------------------------------

export type ApiSuccessResponse<T> = {
  data: T;
  error: null;
};

export type ApiErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- Configuration ----------------------------------------------------------

type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders: Record<string, string>;
  credentials: RequestCredentials;
};

const config: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  defaultHeaders: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  credentials: "include",
};

// --- Request Options --------------------------------------------------------

export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

// --- Internal Helpers -------------------------------------------------------

function buildUrl(path: string): string {
  return `${config.baseUrl}${path}`;
}

function mergeHeaders(custom?: Record<string, string>): Record<string, string> {
  if (!custom) return { ...config.defaultHeaders };

  // If caller provides a custom Content-Type (or explicitly removes it for
  // multipart), let the custom headers take precedence.
  return { ...config.defaultHeaders, ...custom };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  try {
    const headers = mergeHeaders(options?.headers);

    const init: RequestInit = {
      method,
      headers,
      credentials: config.credentials,
      signal: options?.signal,
    };

    if (body !== undefined && body !== null) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(path), init);

    // --- 401: redirect to sign-in ------------------------------------------
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in";
      }
      return {
        data: null,
        error: { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" },
      };
    }

    // --- Non-OK responses ---------------------------------------------------
    if (!response.ok) {
      // Attempt to parse the server error body (follows AppError.toJSON shape)
      try {
        const errorBody = (await response.json()) as {
          error?: { code?: string; message?: string };
        };

        return {
          data: null,
          error: {
            code: errorBody?.error?.code ?? `HTTP_${response.status}`,
            message:
              errorBody?.error?.message ?? `Request failed with status ${response.status}`,
          },
        };
      } catch {
        return {
          data: null,
          error: {
            code: `HTTP_${response.status}`,
            message: `Request failed with status ${response.status}`,
          },
        };
      }
    }

    // --- Success ------------------------------------------------------------
    // Server always wraps payloads as { data: T } — unwrap here so callers
    // receive T directly via response.data (single source of truth).
    const responseBody = (await response.json()) as { data: T };
    return { data: responseBody.data, error: null };
  } catch (error: unknown) {
    // --- Network / abort errors ---------------------------------------------
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        data: null,
        error: { code: "REQUEST_ABORTED", message: "Request was aborted" },
      };
    }

    return {
      data: null,
      error: { code: "NETWORK_ERROR", message: "Network request failed" },
    };
  }
}

// --- Public API -------------------------------------------------------------

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>("GET", path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>("POST", path, body, options);
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>("PUT", path, body, options);
  },

  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>("DELETE", path, undefined, options);
  },
};
