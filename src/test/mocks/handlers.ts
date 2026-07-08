import type { HttpHandler } from "msw";

// Individual test suites add their own handlers via `server.use(...)`.
export const handlers: HttpHandler[] = [];
