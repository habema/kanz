// The fetch every generated client function goes through. Non-2xx responses
// throw an ApiError carrying the status and the parsed body ({ error } from
// the API).
export class ApiError<T = unknown> extends Error {
  constructor(
    readonly status: number,
    readonly data: T,
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
  }
}

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;

export async function customFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const text = await response.text();
  const data = text ? parse(text) : null;
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

function parse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
