
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

type Role = 'admin' | 'teacher' | 'student';

const roleConfig: Record<
  Role,
  {
    cookie: string;
    login: string;
    dashboard: string;
  }
> = {
  admin: {
    cookie: 'admin_access_token',
    login: '/admin/login',
    dashboard: '/admin/dashboard',
  },

  teacher: {
    cookie: 'user_access_token',
    login: '/login',
    dashboard: '/teacher/dashboard',
  },

  student: {
    cookie: 'user_access_token',
    login: '/login',
    dashboard: '/student/dashboard',
  },
};

// Detect role from requested URL
function getRoleFromPath(pathname: string): Role | null {
  const roles: Role[] = ['admin', 'teacher', 'student'];

  return (
    roles.find(
      (role) =>
        pathname === `/${role}` ||
        pathname.startsWith(`/${role}/`)
    ) ?? null
  );
}

// Validate JWT and return its payload
async function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }

  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret)
  );

  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('\n====================================');
  console.log('[AUTH] MIDDLEWARE STARTED');
  console.log('[AUTH] Path:', pathname);

  // 1. Identify requested role
  const requestedRole = getRoleFromPath(pathname);

  if (!requestedRole) {
    console.log('[AUTH] Public route');
    return NextResponse.next();
  }

  const config = roleConfig[requestedRole];

  console.log('[AUTH] Requested role:', requestedRole);
  console.log('[AUTH] Expected cookie:', config.cookie);

  // 2. Get role-specific/common cookie
  const token = request.cookies.get(config.cookie)?.value;

  console.log('[AUTH] Cookie exists:', Boolean(token));

  // 3. No token found
  if (!token) {
    // Login pages should remain accessible
    if (pathname === config.login) {
      console.log('[AUTH] Login page allowed');
      return NextResponse.next();
    }

    console.warn('[AUTH] No authentication cookie');
    console.log('[AUTH] Redirecting to:', config.login);

    return NextResponse.redirect(
      new URL(config.login, request.url)
    );
  }

  // 4. Verify JWT
  try {
    const payload = await verifyToken(token);

    console.log('[AUTH] JWT VERIFIED');
    console.log('[AUTH] Payload:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      exp: payload.exp,
    });

    // 5. Validate user role
    const actualRole = payload.role as Role;

    if (!['admin', 'teacher', 'student'].includes(actualRole)) {
      console.error('[AUTH] Invalid role in JWT');

      const response = NextResponse.redirect(
        new URL(config.login, request.url)
      );

      response.cookies.delete(config.cookie);

      return response;
    }

    // 6. Check whether the user is accessing their own route
    if (actualRole !== requestedRole) {
      console.warn('[AUTH] ROLE MISMATCH');
      console.warn('[AUTH] Requested:', requestedRole);
      console.warn('[AUTH] Actual:', actualRole);

      const actualConfig = roleConfig[actualRole];

      // Do not delete a valid shared user cookie!
      console.log('[AUTH] Redirecting to actual role dashboard');

      return NextResponse.redirect(
        new URL(actualConfig.dashboard, request.url)
      );
    }

    // 7. Validate JWT subject
    if (!payload.sub) {
      console.error('[AUTH] JWT subject missing');

      const response = NextResponse.redirect(
        new URL(config.login, request.url)
      );

      response.cookies.delete(config.cookie);

      return response;
    }

    // 8. Already authenticated users should not visit login pages
    if (
      pathname === config.login ||
      pathname === `/${actualRole}`
    ) {
      console.log('[AUTH] User already authenticated');

      return NextResponse.redirect(
        new URL(config.dashboard, request.url)
      );
    }

    // 9. Authentication successful
    console.log('[AUTH] AUTHENTICATION SUCCESSFUL');
    console.log('[AUTH] User role:', actualRole);
    console.log('[AUTH] Access granted');

    console.log('====================================\n');

    return NextResponse.next();

  } catch (error) {
    console.error('[AUTH] JWT VERIFICATION FAILED');

    if (error instanceof Error) {
      console.error('[AUTH] Error:', error.name);
      console.error('[AUTH] Message:', error.message);
    }

    // Do not delete cookies for configuration errors
    if (
      error instanceof Error &&
      error.message === 'JWT_SECRET is missing'
    ) {
      return new NextResponse('Authentication configuration error', {
        status: 500,
      });
    }

    // Invalid or expired JWT
    const response = NextResponse.redirect(
      new URL(config.login, request.url)
    );

    response.cookies.delete(config.cookie);

    console.log('[AUTH] Invalid cookie deleted');
    console.log('[AUTH] Redirecting to:', config.login);
    console.log('====================================\n');

    return response;
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
  ],
};
