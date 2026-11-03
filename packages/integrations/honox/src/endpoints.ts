import type {
  ContentManager,
  ContentManifest,
  PluginEndpoint,
  PluginEndpointMethod,
  PluginEndpointRequest,
  PluginEndpointResponse,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";

type RiebeckiteEndpointMountOptions = {
  config: ResolvedRiebeckiteConfig;
  content: ContentManager;
};

type HonoLikeApp = {
  get(
    path: string,
    handler: (context: HonoLikeContext) => Promise<unknown>,
  ): void;
  post(
    path: string,
    handler: (context: HonoLikeContext) => Promise<unknown>,
  ): void;
};

type HonoLikeHeaders = {
  forEach(callback: (value: string, key: string) => void): void;
  get?(name: string): string | null;
};

type HonoLikeRequest = {
  method: string;
  url: string;
  path: string;
  raw: {
    headers: HonoLikeHeaders;
    body?: ReadableStream<Uint8Array> | null;
  };
  query(): Record<string, string>;
  text(): Promise<string>;
};

type HonoLikeContext = {
  req: HonoLikeRequest;
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
    const method: PluginEndpointMethod = endpoint.method ?? "GET";
    const handler = async (context: HonoLikeContext): Promise<unknown> => {
      const body = await readEndpointBody(context.req);
      if (body === null) {
        return context.text("Payload Too Large", 413, {
          "content-type": "text/plain; charset=utf-8",
        });
      }
      const request = toPluginEndpointRequest(context, method, body);
      const manifest =
        endpoint.requiresManifest === false
          ? undefined
          : await options.content.getManifest();
      const response = await endpoint.handler({
        config: options.config,
        manifest: manifest as ContentManifest,
        request,
      });

      return toHonoResponse(context, response);
    };
    if (method === "POST") {
      app.post(endpoint.path, handler);
    } else {
      app.get(endpoint.path, handler);
    }
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

const MAX_ENDPOINT_BODY_BYTES = 1024 * 1024;

async function readEndpointBody(
  request: HonoLikeRequest,
): Promise<string | null> {
  const declared = request.raw.headers.get?.("content-length");
  if (declared !== null && declared !== undefined) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > MAX_ENDPOINT_BODY_BYTES) {
      return null;
    }
  }

  const body = request.raw.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > MAX_ENDPOINT_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function toPluginEndpointRequest(
  context: HonoLikeContext,
  method: PluginEndpointMethod,
  body: string,
): PluginEndpointRequest {
  const headers: Record<string, string> = {};
  context.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    method,
    url: context.req.url,
    path: context.req.path,
    query: context.req.query(),
    headers,
    body,
  };
}

function toHonoResponse(
  context: HonoLikeContext,
  response: PluginEndpointResponse,
): unknown {
  const status = response.status ?? 200;
  if ("json" in response) {
    return context.json(
      response.json,
      status,
      withJsonContentType(response.headers),
    );
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

function withJsonContentType(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (findHeader(headers, "content-type")) return headers ?? {};
  return {
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
  };
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
