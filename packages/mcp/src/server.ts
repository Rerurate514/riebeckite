import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const protocolHeader = { "x-riebeckite-bridge-protocol": "1" };

export type BridgeClientOptions = {
  origin: string;
  token: string;
};

export class BridgeClient {
  constructor(private readonly options: BridgeClientOptions) {}

  async get(pathname: string, query?: Record<string, string | undefined>) {
    const origin = await this.privateOrigin();
    const url = new URL(pathname, origin);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    return this.request(url);
  }

  async post(pathname: string, body: Record<string, unknown>) {
    const origin = await this.privateOrigin();
    return this.request(new URL(pathname, origin), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  private async privateOrigin(): Promise<string> {
    const url = new URL("/__riebeckite/bridge/bootstrap", this.options.origin);
    const response = await fetch(url, {
      headers: { "x-riebeckite-bridge-token": this.options.token },
    });
    if (!response.ok)
      throw new Error(`Bridge bootstrap failed (${response.status}).`);
    const body = (await response.json()) as { origin?: unknown };
    if (typeof body.origin !== "string")
      throw new Error("Bridge returned no private origin.");
    return body.origin;
  }

  private async request(url: URL, init?: RequestInit): Promise<unknown> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...protocolHeader,
        "x-riebeckite-bridge-token": this.options.token,
        ...init?.headers,
      },
    });
    const body = await response.text();
    if (!response.ok)
      throw new Error(`Bridge request failed (${response.status}): ${body}`);
    return body ? JSON.parse(body) : undefined;
  }
}

export function createServer(client: BridgeClient): McpServer {
  const server = new McpServer({ name: "riebeckite", version: "0.1.0" });
  const path = { path: z.string().min(1) };
  const result = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  });
  const get = (endpoint: string) => async (input: Record<string, string>) =>
    result(await client.get(`/__riebeckite/bridge/v1/${endpoint}`, input));

  server.tool(
    "riebeckite_status",
    "Read Bridge status and capabilities.",
    {},
    () => get("")({}),
  );
  server.tool(
    "riebeckite_schema",
    "Read the Bridge API discovery document.",
    {},
    () => get("schema")({}),
  );
  server.tool(
    "riebeckite_context",
    "Read publication, preview, diagnostics, and build impact for one source.",
    path,
    get("context"),
  );
  server.tool(
    "riebeckite_inventory",
    "List built content entries.",
    {
      offset: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().max(500).optional(),
      query: z.string().optional(),
    },
    async (input) =>
      result(
        await client.get("/__riebeckite/bridge/v1/inventory", {
          offset: input.offset?.toString(),
          limit: input.limit?.toString(),
          query: input.query,
        }),
      ),
  );
  server.tool(
    "riebeckite_diagnostics",
    "Read diagnostics for one source or the complete site.",
    {
      path: z.string().min(1).optional(),
      since: z.number().int().nonnegative().optional(),
    },
    async (input) =>
      result(
        await client.get("/__riebeckite/bridge/v1/diagnostics", {
          path: input.path,
          since: input.since?.toString(),
        }),
      ),
  );
  server.tool(
    "riebeckite_links",
    "Read outbound, unresolved, and inbound links for one source.",
    path,
    get("links"),
  );
  server.tool(
    "riebeckite_content",
    "Read the Markdown body of one resolved source.",
    path,
    get("content"),
  );
  server.tool(
    "riebeckite_validate_mutation",
    "Validate content mutation operations without persisting or applying them.",
    {
      operations: z.array(z.unknown()).min(1),
    },
    async (input) =>
      result(
        await client.post("/__riebeckite/bridge/v1/mutations/validate", {
          operations: input.operations,
        }),
      ),
  );
  return server;
}

export async function start(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const origin = env.RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN;
  const token = env.RIEBECKITE_BRIDGE_TOKEN;
  if (!origin || !token) {
    throw new Error(
      "RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN and RIEBECKITE_BRIDGE_TOKEN are required.",
    );
  }
  const server = createServer(new BridgeClient({ origin, token }));
  await server.connect(new StdioServerTransport());
}
