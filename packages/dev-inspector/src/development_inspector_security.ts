import { timingSafeEqual } from "node:crypto";
import type { ViteDevServer } from "vite";
import { inspectorTokenHeader } from "./development_inspector_paths.js";

export function prioritizeMiddleware(
  server: ViteDevServer,
  middleware: unknown,
  path: string,
): void {
  const stack = server.middlewares.stack;
  const index = stack.findIndex(
    (layer) => layer.handle === middleware || layer.route === path,
  );
  if (index > 0) stack.unshift(...stack.splice(index, 1));
}

export type InspectorHandler = (
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
) => void | Promise<void>;

export function handleInspectorRequest(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
  token: string,
  handlers: Readonly<Record<string, InspectorHandler | undefined>>,
): void {
  const origin = inspectorOrigin(request);
  if (origin === false) {
    response.statusCode = 403;
    response.end();
    return;
  }
  if (origin !== undefined) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("access-control-allow-headers", inspectorTokenHeader);
    response.setHeader("access-control-allow-methods", "GET, OPTIONS");
    response.setHeader("vary", "Origin");
  }
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.end();
    return;
  }
  if (!matchesInspectorToken(request.headers[inspectorTokenHeader], token)) {
    response.statusCode = 403;
    response.end();
    return;
  }
  const pathname = requestPathname(request.url);
  const handler =
    handlers[pathname] ??
    handlers[pathname.slice(0, pathname.lastIndexOf("/") + 1)];
  if (!handler) {
    response.statusCode = 404;
    response.end();
    return;
  }
  void handler(request, response);
}

export function isTrustedInspectorRequest(
  request: import("node:http").IncomingMessage,
  server: ViteDevServer,
): boolean {
  if (request.method !== undefined && request.method !== "GET") return false;
  if (!isLoopbackAddress(request.socket?.remoteAddress)) return false;
  const listening = server.httpServer?.address();
  if (
    !listening ||
    typeof listening === "string" ||
    !isLoopbackAddress(listening.address)
  ) {
    return false;
  }
  if (!isLoopbackHost(request.headers.host)) return false;
  for (const header of [
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
  ]) {
    if (request.headers[header] !== undefined) return false;
  }
  return inspectorOrigin(request) !== false;
}

export function inspectorOrigin(
  request: import("node:http").IncomingMessage,
): string | undefined | false {
  const value = request.headers.origin;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return false;
  try {
    return isLoopbackAddress(new URL(value).hostname.replace(/^\[|\]$/g, ""))
      ? value
      : false;
  } catch {
    return false;
  }
}

export function isLoopbackHost(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return isLoopbackAddress(
      new URL(`http://${value}`).hostname.replace(/^\[|\]$/g, ""),
    );
  } catch {
    return false;
  }
}

export function isLoopbackAddress(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().replace(/^::ffff:/, "");
  return (
    normalized === "::1" ||
    normalized === "localhost" ||
    /^127\.\d+\.\d+\.\d+$/.test(normalized)
  );
}

function matchesInspectorToken(
  provided: string | string[] | undefined,
  expected: string,
): boolean {
  if (typeof provided !== "string") return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export function requestPathname(url: string | undefined): string {
  return new URL(url ?? "/", "http://127.0.0.1").pathname;
}
