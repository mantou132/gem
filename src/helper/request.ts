const defaultReq: RequestInit = {
  credentials: 'include',
  mode: 'cors',
};

export async function request<T>(uri: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(uri, { ...defaultReq, ...options });
  if (res.status === 0) throw 'Request fail';
  if (res.status >= 500) throw res.statusText;
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  if (res.status >= 400) throw data || res.statusText;
  return data;
}

type ReqBody = object | BodyInit;
const TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array()));

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

export function get<T>(url: string, params?: object) {
  const { origin, pathname, search } = new URL(url, location.origin);
  return request<T>(
    `${origin}${pathname}${search ? `${search}&` : '?'}${new URLSearchParams(params as Record<string, string>)}`,
    { method: 'GET' },
  );
}
export function del<T>(url: string) {
  return request<T>(url, { method: 'DELETE' });
}
export function put<T>(url: string, body?: ReqBody) {
  return request<T>(url, { method: 'PUT', body: serializationBody(body) });
}
export function post<T>(url: string, body?: ReqBody) {
  return request<T>(url, { method: 'POST', body: serializationBody(body) });
}
