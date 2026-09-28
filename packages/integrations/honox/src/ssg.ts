import type { Plugin } from "vite";
import { type RiebeckiteSsgOptions, riebeckiteSsg } from "./ssg_plugin.js";

/**
 * Root-relative SSG entry for a Riebeckite site. HonoX keeps the server entry
 * at `app/server.ts`, so sites do not need to compute an absolute path.
 */
export const defaultSsgEntry = "./app/server.ts";

export function riebeckiteSsgExtensionMap(): Record<string, string> {
  return {
    "application/atom+xml": "xml",
    "application/json": "json",
    "application/rss+xml": "xml",
    "application/xml": "xml",
    "text/html": "html",
    "text/plain": "txt",
    "text/xml": "xml",
  };
}

/**
 * Higher-level SSG factory that hides Riebeckite's internal entry and
 * extension-map defaults. Use `riebeckiteSsg` directly when full control is
 * required; this wrapper only fills in the values a normal site never sets.
 */
export function createRiebeckiteSsg(
  options: RiebeckiteSsgOptions = {},
): Plugin {
  return riebeckiteSsg({
    ...options,
    entry: options.entry ?? defaultSsgEntry,
    extensionMap: {
      ...riebeckiteSsgExtensionMap(),
      ...options.extensionMap,
    },
  });
}
