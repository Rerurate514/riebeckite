import type { ContentManifest } from "./content_manifest";
import type { ResolvedRiebeckiteConfig } from "./resolved_riebeckite_config";

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
