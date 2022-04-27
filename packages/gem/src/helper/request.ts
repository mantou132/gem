export const defaultReqInit: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export async function request<T>(uri: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(uri, {
    ...defaultReqInit,
    ...options,
  });
  if (res.status === 0) throw new Error('Request fail');
  if (res.status >= 500) throw new Error(res.statusText);
  try {
    const data = await res.json();
    if (res.status >= 400) throw new (Error as any)(data?.message || res.statusText, { cause: data });
    return data;
  } catch {
    throw new Error('Server error');
  }
}

type ReqBody = Record<string, unknown> | BodyInit;
const TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array())).constructor;

function serializationBody(body?: ReqBody): BodyInit | undefined {
  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof TypedArray ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }
  if (typeof body === 'object') {
    return JSON.stringify(body);
  }
  return body;
}

function serializationUrl(url: string, params?: Record<string, string | number>) {
  const { origin, pathname, search } = new URL(url, location.origin);
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return `${origin}${pathname}${search ? `${search}&` : query ? '?' : ''}${query}`;
}

export function get<T>(url: string, params?: Record<string, string | number>) {
  return request<T>(serializationUrl(url, params), { method: 'GET' });
}
export function del<T>(url: string, params?: Record<string, string | number>) {
  return request<T>(serializationUrl(url, params), { method: 'DELETE' });
}
export function put<T>(url: string, body?: ReqBody) {
  return request<T>(url, { method: 'PUT', body: serializationBody(body) });
}
export function post<T>(url: string, body?: ReqBody) {
  return request<T>(url, { method: 'POST', body: serializationBody(body) });
}
