import { GemError } from '../lib/utils';

type ReqBody = Record<string, unknown> | BodyInit;
type ReqParams = Record<string, string | number>;
const TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array())).constructor;

type Options = {
  origin?: string;
  base?: string;
  // only for get/del/put/post
  appendHeaders?: (input?: any) => HeadersInit | Promise<HeadersInit>;
  transformInput?: (input?: any) => any | Promise<any>;
  transformOutput?: (output: any, req: Request) => any | Promise<any>;
} & RequestInit;

function initRequest(options: Options = {}) {
  const {
    origin = location.origin,
    base = '',
    appendHeaders = () => ({}),
    transformInput = (p?: any) => p,
    transformOutput = (p?: any) => p,
    ...reqInit
  } = options;

  const serializationBody = (body?: ReqBody): BodyInit | undefined => {
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
  };

  const serializationUrl = (path: string, params?: ReqParams) => {
    if (new URL(path, location.origin).pathname !== path) {
      throw new GemError('`path` format is incorrect');
    }
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `${origin}${base}${path}${query ? '?' : ''}${query}`;
  };

  const serializationHeaders = (headers?: HeadersInit) => {
    if (!headers) return {};
    // auto `toLowerCase`
    if (headers instanceof Headers) return Object.fromEntries(headers);
    const entries = Array.isArray(headers) ? headers : Object.entries(headers);
    return Object.fromEntries(entries.map(([key, value]) => [key.toLowerCase(), value]));
  };

  const request = async <T>(uri: string, reqOptions: RequestInit = {}): Promise<T> => {
    const req = new Request(uri, {
      ...reqInit,
      ...reqOptions,
      headers: new Headers({
        'content-type': 'application/json',
        ...serializationHeaders(reqInit.headers),
        ...serializationHeaders(reqOptions.headers),
      }),
    });
    const res = await fetch(req);

    if (res.status === 204) return undefined as T;
    if (res.status === 0) throw new Error('Request fail');
    if (res.status >= 500) throw new Error(res.statusText);

    const contentType = req.headers.get('content-type')!;
    const isClientError = res.status >= 400;
    try {
      let data: any;
      if (contentType.includes('json')) {
        data = await res.json();
      } else if (contentType.includes('octet-stream')) {
        data = await res.arrayBuffer();
      } else {
        data = await res.text();
      }
      if (isClientError) throw new (Error as any)(res.statusText, { cause: data });
      return await transformOutput(data, req);
    } catch {
      throw new Error('Parse error');
    }
  };

  return {
    request,
    async get<T>(path: string, params?: ReqParams) {
      const i = await transformInput(params);
      return request<T>(serializationUrl(path, i), {
        method: 'GET',
        headers: await appendHeaders(i),
      });
    },
    async del<T>(path: string, params?: ReqParams) {
      const i = await transformInput(params);
      return request<T>(serializationUrl(path, i), {
        method: 'DELETE',
        headers: await appendHeaders(i),
      });
    },
    async put<T>(path: string, body?: ReqBody) {
      const i = await transformInput(body);
      return request<T>(serializationUrl(path), {
        method: 'PUT',
        headers: await appendHeaders(i),
        body: serializationBody(i),
      });
    },
    async post<T>(path: string, body?: ReqBody) {
      const i = await transformInput(body);
      return request<T>(serializationUrl(path), {
        method: 'POST',
        headers: await appendHeaders(i),
        body: serializationBody(i),
      });
    },
  };
}

const { request, del, get, post, put } = initRequest();

export { del, get, initRequest, post, put, request };
