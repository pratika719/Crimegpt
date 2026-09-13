export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface NestApiResponse<T> {
  success?: boolean;
  data?: T;
  timestamp?: string;
  statusCode?: number;
  code?: string;
  message?: string | string[];
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let finalUrl = path;

  // Server-side (RSC / SSR): resolve absolute URL and forward cookies
  if (typeof window === 'undefined') {
    const rawBaseUrl = process.env.NESTJS_API_URL || 'http://127.0.0.1:3001/api';
    const normalizedBase = rawBaseUrl.replace(/\/+$/, '');
    const baseUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;
    const cleanPath = path.startsWith('/api/')
      ? path.slice(5)
      : path.startsWith('/api')
      ? path.slice(4)
      : path.startsWith('/')
      ? path.slice(1)
      : path;

    finalUrl = `${baseUrl}/${cleanPath}`;

    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      if (cookieHeader && !headers.has('cookie')) {
        headers.set('cookie', cookieHeader);
      }
    } catch {
      // Not within a Next.js request context (e.g. build time or script)
    }
  }

  const res = await fetch(finalUrl, {
    ...init,
    headers,
    credentials: init.credentials || 'same-origin',
  });

  const body = (await res.json().catch(() => null)) as NestApiResponse<T> | null;

  if (!res.ok) {
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string'
      ? rawMessage
      : res.statusText || 'An unexpected API error occurred';

    throw new ApiError(
      body?.statusCode ?? res.status,
      body?.code ?? 'HTTP_ERROR',
      message,
      body,
    );
  }

  // If the response is wrapped in NestJS TransformInterceptor envelope ({ success, data })
  if (body && typeof body === 'object' && 'data' in body && body.success === true) {
    return body.data as T;
  }

  return (body as unknown) as T;
}
