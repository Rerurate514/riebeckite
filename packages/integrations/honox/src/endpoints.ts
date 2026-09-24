import type {
  ContentManager,
  PluginEndpoint,
  PluginEndpointResponse,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";

export type RiebeckiteEndpointMountOptions = {
  config: ResolvedRiebeckiteConfig;
  content: ContentManager;
};

type HonoLikeApp = {
  get(
    path: string,
    handler: (context: HonoLikeContext) => Promise<unknown>,
  ): void;
};

type HonoLikeContext = {
  json(
    body: unknown,
    status?: number,
    headers?: Record<string, string>,
  ): unknown;
  body(
    body: string,
    status?: number,
    headers?: Record<string, string>,
  ): unknown;
  text(
    body: string,
    status?: number,
    headers?: Record<string, string>,
  ): unknown;
};

export function mountRiebeckiteEndpoints(
  app: HonoLikeApp,
  options: RiebeckiteEndpointMountOptions,
): void {
  const endpoints = collectPluginEndpoints(options.config);

  for (const endpoint of endpoints) {
    app.get(endpoint.path, async (context) => {
      const manifest = await options.content.getManifest();
      const response = await endpoint.handler({
        config: options.config,
        manifest,
      });

      return toHonoResponse(context, response);
    });
  }
}

function collectPluginEndpoints(
  config: ResolvedRiebeckiteConfig,
): PluginEndpoint[] {
  const endpoints = config.plugins.flatMap((plugin) =>
    (plugin.endpoints ?? []).map((endpoint) => ({
      endpoint,
      pluginName: plugin.name,
    })),
  );
  const registeredKeys = new Map<string, string>();

  for (const { endpoint, pluginName } of endpoints) {
    validateEndpointPath(endpoint.path);
    const method = endpoint.method ?? "GET";
    const key = `${method} ${endpoint.path}`;
    const owner = registeredKeys.get(key);
    if (owner) {
      throw new Error(
        `Duplicate Riebeckite plugin endpoint detected: ${key} is declared by both "${owner}" and "${pluginName}".`,
      );
    }
    registeredKeys.set(key, pluginName);
  }

  return endpoints.map(({ endpoint }) => endpoint);
}

function validateEndpointPath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error(
      `Invalid Riebeckite plugin endpoint path: "${path}" must start with "/".`,
    );
  }
  if (path.length === 1 || path.includes("?") || path.includes("#")) {
    throw new Error(
      `Invalid Riebeckite plugin endpoint path: "${path}" must be a static path without query or hash.`,
    );
  }
  if (/\s/.test(path) || path.includes("//") || path.includes(":")) {
    throw new Error(
      `Invalid Riebeckite plugin endpoint path: "${path}" contains unsupported dynamic or malformed segments.`,
    );
  }
  if (path === "/assets" || path.startsWith("/assets/")) {
    throw new Error(
      `Invalid Riebeckite plugin endpoint path: "${path}" conflicts with the static assets namespace.`,
    );
  }
}

function toHonoResponse(
  context: HonoLikeContext,
  response: PluginEndpointResponse,
): unknown {
  const status = response.status ?? 200;
  if ("json" in response) {
    return context.json(response.json, status, response.headers);
  }
  if (response.body === undefined) {
    return context.body("", status, response.headers);
  }

  const contentType = findHeader(response.headers, "content-type");
  if (contentType?.startsWith("text/")) {
    return context.text(response.body, status, response.headers);
  }

  return context.body(response.body, status, response.headers);
}

function findHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === name.toLowerCase(),
  );

  return key ? headers[key] : undefined;
}
