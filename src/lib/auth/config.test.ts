import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { authConfig } from "./config";

const authorized = authConfig.callbacks.authorized;

if (!authorized) {
  throw new Error("authConfig.callbacks.authorized must be defined");
}

function buildRequest(pathname: string): NextRequest {
  return { nextUrl: { pathname } } as unknown as NextRequest;
}

function buildSession(): Session {
  return {
    user: { id: "user-1", email: "reader@example.com" },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

describe("authConfig", () => {
  // Auth.js infers trustHost from AUTH_URL, but an empty AUTH_URL yields `false`
  // and every /api/auth route then fails with UntrustedHost.
  it("trusts the forwarded host regardless of AUTH_URL", () => {
    expect(authConfig.trustHost).toBe(true);
  });

  it("signs users in through the /login page", () => {
    expect(authConfig.pages.signIn).toBe("/login");
  });
});

describe("authConfig.callbacks.authorized", () => {
  it.each(["/novels", "/non-fiction", "/account", "/search", "/books"])(
    "denies a logged-out user hitting the protected path %s",
    async (pathname) => {
      const result = await authorized({
        auth: null,
        request: buildRequest(pathname),
      });

      expect(result).toBe(false);
    },
  );

  it.each(["/novels", "/non-fiction", "/account", "/search", "/books", "/books/42"])(
    "allows a logged-in user hitting the protected path %s",
    async (pathname) => {
      const result = await authorized({
        auth: buildSession(),
        request: buildRequest(pathname),
      });

      expect(result).toBe(true);
    },
  );

  it("allows unauthenticated access to a non-protected path", async () => {
    const result = await authorized({
      auth: null,
      request: buildRequest("/login"),
    });

    expect(result).toBe(true);
  });

  it("allows authenticated access to a non-protected path", async () => {
    const result = await authorized({
      auth: buildSession(),
      request: buildRequest("/login"),
    });

    expect(result).toBe(true);
  });
});
