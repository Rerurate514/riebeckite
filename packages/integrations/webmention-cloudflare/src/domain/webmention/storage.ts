import type { WebmentionProvider } from "@riebeckite/plugin-webmention";

/**
 * Runtime-owned Webmention storage boundary. Select exactly one adapter per
 * Worker; the generic plugin never imports this package.
 */
export type WebmentionStorage = WebmentionProvider;
