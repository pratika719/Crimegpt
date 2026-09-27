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
    if (path.startsWith('http://') || path.startsWith('https://')) {
      finalUrl = path;
    } else {
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
    }

    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      if (allCookies.length > 0 && !headers.has('cookie')) {
        const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
        headers.set('cookie', cookieString);
      }

      const authToken = cookieStore.get('auth_token')?.value;
      if (authToken && !headers.has('authorization')) {
        headers.set('authorization', `Bearer ${authToken}`);
      }
    } catch {
      // Not within a Next.js request context (e.g. build time or script)
    }
  }

  const fetchOptions: RequestInit = {
    ...init,
    headers,
  };

  if (typeof window === 'undefined') {
    if (!fetchOptions.cache) {
      fetchOptions.cache = 'no-store';
    }
  } else {
    fetchOptions.credentials = init.credentials || 'same-origin';
  }

  let res: Response;
  try {
    res = await fetch(finalUrl, fetchOptions);
  } catch (err: unknown) {
    // Retry IPv4 / IPv6 alternate hostname on server-side connection failure
    if (typeof window === 'undefined' && (finalUrl.includes('127.0.0.1') || finalUrl.includes('localhost'))) {
      const fallbackUrl = finalUrl.includes('127.0.0.1')
        ? finalUrl.replace('127.0.0.1', 'localhost')
        : finalUrl.replace('localhost', '127.0.0.1');

      try {
        res = await fetch(fallbackUrl, fetchOptions);
      } catch {
        // Ignore fallback error and fall through to throw primary ApiError
      }
    }

    if (!res!) {
      if (err instanceof ApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network request failed';
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        `Failed to connect to backend server (${finalUrl}): ${message}`,
        { url: finalUrl, cause: err },
      );
    }
  }

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
