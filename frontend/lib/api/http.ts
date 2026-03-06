type JsonBody = Record<string, unknown> | unknown[] | null;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getApiUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  return apiUrl.replace(/\/+$/, '');
}

function buildUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function isJsonResponse(contentType: string | null): boolean {
  return !!contentType && contentType.includes('application/json');
}

export async function requestJson<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: JsonBody } = {}
): Promise<T> {
  const { body, headers, ...rest } = init;
  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type');
  const rawBody = await response.text();
  const parsedBody =
    rawBody && isJsonResponse(contentType) ? JSON.parse(rawBody) : rawBody || null;

  if (!response.ok) {
    const apiMessage =
      (parsedBody &&
        typeof parsedBody === 'object' &&
        'error' in parsedBody &&
        parsedBody.error &&
        typeof parsedBody.error === 'object' &&
        'message' in parsedBody.error &&
        typeof parsedBody.error.message === 'string' &&
        parsedBody.error.message) ||
      (parsedBody &&
        typeof parsedBody === 'object' &&
        'message' in parsedBody &&
        typeof parsedBody.message === 'string' &&
        parsedBody.message) ||
      response.statusText ||
      'Request failed';
    const apiCode =
      parsedBody &&
      typeof parsedBody === 'object' &&
      'error' in parsedBody &&
      parsedBody.error &&
      typeof parsedBody.error === 'object' &&
      'code' in parsedBody.error &&
      typeof parsedBody.error.code === 'string'
        ? parsedBody.error.code
        : undefined;

    throw new ApiError(apiMessage, response.status, apiCode, parsedBody);
  }

  return parsedBody as T;
}
