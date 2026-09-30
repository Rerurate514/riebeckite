import type { PluginEndpoint } from "@riebeckite/core";
import { createWebmentionFeedHandler } from "./feed.js";
import { createWebmentionReceiveHandler } from "./receive.js";
import type { ResolvedWebmentionOptions } from "./types.js";

/**
 * Receive (`POST`) and feed (`GET`) endpoints for the configured path.
 *
 * The plugin only declares the HTTP contract; the HonoX integration mounts it
 * on the host router. Route-framework specifics never enter this package.
 */
export function createWebmentionEndpoints(
  options: ResolvedWebmentionOptions,
): PluginEndpoint[] {
  return [
    {
      path: options.endpoint,
      method: "POST",
      handler: createWebmentionReceiveHandler(options, options.provider),
    },
    {
      path: options.endpoint,
      method: "GET",
      handler: createWebmentionFeedHandler(options, options.provider),
    },
  ];
}
