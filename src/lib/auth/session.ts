import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

export interface Session {
  user: SessionUser;
}

/**
 * Reads and decodes the NestJS JWT cookie (`auth_token`) on the server.
 * Replaces NextAuth `auth()` across all Server Components.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (!payload || !payload.sub) return null;

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Convenient alias matching the old NextAuth import pattern `const session = await auth()`.
 */
export const auth = getSession;

/**
 * Enforces an authenticated user session in Server Components; redirects to /login if missing.
 */
export async function requireUser(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return session.user.id;
}
