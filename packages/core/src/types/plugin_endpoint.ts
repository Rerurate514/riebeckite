import type { ContentManifest } from "./content_manifest.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

export type PluginEndpointMethod = "GET";

export type PluginEndpointContext = {
  config: ResolvedRiebeckiteConfig;
  manifest: ContentManifest;
};

export type PluginEndpointResponse = {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  json?: unknown;
};

export type PluginEndpoint = {
  path: string;
  method?: PluginEndpointMethod;
  handler(
    context: PluginEndpointContext,
  ): PluginEndpointResponse | Promise<PluginEndpointResponse>;
};

export type PluginEndpointOptions = {
  cacheControl?: string;
};

/**
 * Defines an endpoint and applies its optional cache policy without requiring
 * each plugin to duplicate response-header plumbing.
 */
export function defineEndpoint(
  path: string,
  handler: PluginEndpoint["handler"],
  options: PluginEndpointOptions = {},
): PluginEndpoint {
  if (options.cacheControl === undefined) {
    return { path, handler };
  }

  return {
    path,
    handler: async (context) => {
      const response = await handler(context);
      return {
        ...response,
        headers: {
          ...response.headers,
          "Cache-Control": options.cacheControl,
        },
      };
    },
  };
}
