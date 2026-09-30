import type { ContentManifest } from "./content_manifest.js";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config.js";

export type PluginEndpointMethod = "GET" | "POST";

/**
 * Framework-neutral snapshot of an incoming HTTP request.
 *
 * Integrations extract only these fields from their host router and pass them
 * to endpoint handlers. Endpoints never receive a Hono, Vite, or Node request
 * object, so a plugin stays usable across runtimes.
 */
export type PluginEndpointRequest = {
  method: PluginEndpointMethod;
  /** Absolute request URL. */
  url: string;
  /** URL path, for example `/webmentions`. */
  path: string;
  /** First value of every query-string parameter. */
  query: Readonly<Record<string, string>>;
  /** Request headers keyed by lower-cased name. */
  headers: Readonly<Record<string, string>>;
  /** Raw request body text. Empty when the request has no body. */
  body: string;
};

export type PluginEndpointContext = {
  config: ResolvedRiebeckiteConfig;
  manifest: ContentManifest;
  request: PluginEndpointRequest;
};

export type PluginEndpointResponse = {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  json?: unknown;
};

export type PluginEndpoint = {
  path: string;
  /** Defaults to `GET` when omitted. */
  method?: PluginEndpointMethod;
  handler(
    context: PluginEndpointContext,
  ): PluginEndpointResponse | Promise<PluginEndpointResponse>;
};

export type PluginEndpointOptions = {
  cacheControl?: string;
};

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
      const headers: Record<string, string> = { ...response.headers };
      if (options.cacheControl !== undefined) {
        headers["Cache-Control"] = options.cacheControl;
      }
      return { ...response, headers };
    },
  };
}
