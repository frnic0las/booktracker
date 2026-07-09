import type { NextAuthConfig } from "next-auth";

// Routes served by the `(app)` route group — the only ones that require auth.
const PROTECTED_PATHS = ["/novels", "/non-fiction", "/account", "/search", "/books"];

export const authConfig = {
  // Auth.js only infers this from a non-empty AUTH_URL; an empty one yields
  // `false` and every /api/auth route fails with UntrustedHost. Vercel puts the
  // app behind a proxy, so the host is always forwarded — trust it explicitly.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = PROTECTED_PATHS.some((path) =>
        request.nextUrl.pathname.startsWith(path),
      );

      if (isProtected && !isLoggedIn) {
        return false;
      }

      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
