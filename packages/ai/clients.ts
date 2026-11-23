export const AI_CLIENTS = ["claude", "cursor", "vscode", "opencode"] as const;

export type AiClient = (typeof AI_CLIENTS)[number];

export type AiPackageManager = "npm" | "pnpm";

export type AiClientConfigResult =
  | {
      readonly status: "write";
      readonly path: string;
      readonly content: string;
    }
  | { readonly status: "unchanged"; readonly path: string }
  | {
      readonly status: "invalid";
      readonly path: string;
      readonly message: string;
    };

export function aiClientConfigPath(client: AiClient): string {
  switch (client) {
    case "claude":
      return ".mcp.json";
    case "cursor":
      return ".cursor/mcp.json";
    case "vscode":
      return ".vscode/mcp.json";
    case "opencode":
      return "opencode.json";
  }
}

export function mergeAiClientConfig(
  client: AiClient,
  existing: string | undefined,
  packageManager: AiPackageManager = "npm",
): AiClientConfigResult {
  const path = aiClientConfigPath(client);
  let root: Record<string, unknown> = {};
  if (existing !== undefined && existing.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(existing);
      if (!isRecord(parsed)) {
        return { status: "invalid", path, message: "Expected a JSON object." };
      }
      root = parsed;
    } catch {
      return {
        status: "invalid",
        path,
        message: "Could not parse the existing JSON.",
      };
    }
  }
  const key =
    client === "vscode"
      ? "servers"
      : client === "opencode"
        ? "mcp"
        : "mcpServers";
  const current = root[key];
  if (current !== undefined && !isRecord(current)) {
    return {
      status: "invalid",
      path,
      message: `Expected "${key}" to be an object.`,
    };
  }
  const servers: Record<string, unknown> = isRecord(current) ? current : {};
  if (servers.riebeckite !== undefined) return { status: "unchanged", path };
  root[key] = { ...servers, riebeckite: serverConfig(client, packageManager) };
  return {
    status: "write",
    path,
    content: `${JSON.stringify(root, null, 2)}\n`,
  };
}

function serverConfig(
  client: AiClient,
  packageManager: AiPackageManager,
): Record<string, unknown> {
  const { command, args } =
    packageManager === "pnpm"
      ? { command: "pnpm", args: ["exec", "riebeckite", "ai", "mcp"] }
      : { command: "npm", args: ["exec", "--", "riebeckite", "ai", "mcp"] };
  if (client === "vscode") return { type: "stdio", command, args };
  if (client === "opencode") {
    return { type: "local", command: [command, ...args], enabled: true };
  }
  return { command, args };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
