import { appConfig } from "@/lib/config";

type PrimitiveBody = BodyInit | null | undefined;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  token?: string | null;
  body?: PrimitiveBody | object;
  headers?: HeadersInit;
}

const isBodyInit = (value: unknown): value is BodyInit =>
  typeof value === "string" ||
  value instanceof FormData ||
  value instanceof URLSearchParams ||
  value instanceof Blob ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value);

const buildUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${appConfig.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const getErrorMessage = (fallback: string, data: unknown) => {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const candidates = [record.message, record.error, record.status];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
  }

  return fallback;
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}) => {
  const { token, body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      requestHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: requestBody,
    cache: "no-store",
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(response.statusText || "Request failed", data),
      response.status,
      data,
    );
  }

  return data as T;
};

export const apiFileRequest = async (
  path: string,
  options: Omit<ApiRequestOptions, "body"> = {},
) => {
  const { token, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    throw new ApiError(
      getErrorMessage(response.statusText || "Request failed", data),
      response.status,
      data,
    );
  }

  return response.blob();
};

export const toErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};
