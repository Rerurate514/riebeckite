import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_CLIENTS,
  aiClientConfigPath,
  mergeAiClientConfig,
} from "../index.js";

function contentOf(result: ReturnType<typeof mergeAiClientConfig>): string {
  assert.equal(result.status, "write");
  if (result.status !== "write") throw new Error("expected a write");
  return result.content;
}

test("maps each supported client to a project-local config path", () => {
  assert.deepEqual([...AI_CLIENTS], ["claude", "cursor", "vscode", "opencode"]);
  assert.equal(aiClientConfigPath("claude"), ".mcp.json");
  assert.equal(aiClientConfigPath("cursor"), ".cursor/mcp.json");
  assert.equal(aiClientConfigPath("vscode"), ".vscode/mcp.json");
  assert.equal(aiClientConfigPath("opencode"), "opencode.json");
});

test("writes the MCP server in each client format", () => {
  const claude = JSON.parse(
    contentOf(mergeAiClientConfig("claude", undefined)),
  );
  assert.deepEqual(claude.mcpServers.riebeckite, {
    command: "npm",
    args: ["exec", "--", "riebeckite", "ai", "mcp"],
  });

  const cursor = JSON.parse(
    contentOf(mergeAiClientConfig("cursor", undefined)),
  );
  assert.deepEqual(cursor.mcpServers.riebeckite, {
    command: "npm",
    args: ["exec", "--", "riebeckite", "ai", "mcp"],
  });

  const vscode = JSON.parse(
    contentOf(mergeAiClientConfig("vscode", undefined)),
  );
  assert.deepEqual(vscode.servers.riebeckite, {
    type: "stdio",
    command: "npm",
    args: ["exec", "--", "riebeckite", "ai", "mcp"],
  });

  const opencode = JSON.parse(
    contentOf(mergeAiClientConfig("opencode", undefined)),
  );
  assert.deepEqual(opencode.mcp.riebeckite, {
    type: "local",
    command: ["npm", "exec", "--", "riebeckite", "ai", "mcp"],
    enabled: true,
  });
});

test("uses pnpm commands when requested", () => {
  const config = JSON.parse(
    contentOf(mergeAiClientConfig("claude", undefined, "pnpm")),
  );
  assert.deepEqual(config.mcpServers.riebeckite, {
    command: "pnpm",
    args: ["exec", "riebeckite", "ai", "mcp"],
  });
});

test("preserves existing keys and servers", () => {
  const existing = `${JSON.stringify(
    {
      custom: true,
      mcpServers: { other: { command: "other" } },
    },
    null,
    2,
  )}\n`;
  const config = JSON.parse(contentOf(mergeAiClientConfig("claude", existing)));
  assert.equal(config.custom, true);
  assert.deepEqual(config.mcpServers.other, { command: "other" });
  assert.equal(config.mcpServers.riebeckite.command, "npm");
});

test("keeps an existing riebeckite server entry unchanged", () => {
  const existing = JSON.stringify({
    mcpServers: { riebeckite: { command: "custom" } },
  });
  assert.equal(mergeAiClientConfig("claude", existing).status, "unchanged");
});

test("reports invalid JSON without producing a replacement", () => {
  assert.equal(mergeAiClientConfig("claude", "{").status, "invalid");
  assert.equal(mergeAiClientConfig("claude", "[]").status, "invalid");
  assert.equal(
    mergeAiClientConfig("claude", JSON.stringify({ mcpServers: [] })).status,
    "invalid",
  );
});
