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

describe("authConfig.callbacks.authorized", () => {
  it.each(["/library", "/search", "/lists", "/profile"])(
    "denies a logged-out user hitting the protected path %s",
    async (pathname) => {
      const result = await authorized({
        auth: null,
        request: buildRequest(pathname),
      });

      expect(result).toBe(false);
    },
  );

  it.each(["/library", "/library/42", "/search", "/lists", "/profile"])(
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
