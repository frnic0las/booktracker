import type { NextAuthConfig } from "next-auth";

// Routes served by the `(app)` route group — the only ones that require auth.
const PROTECTED_PATHS = ["/library", "/search", "/lists", "/profile"];

export const authConfig = {
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
