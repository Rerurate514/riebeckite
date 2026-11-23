import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { startManagedDev } from "../src/commands/ai_mcp.js";
import {
  clearBridgeApprovalToken,
  readBridgeApprovalToken,
  writeBridgeApprovalToken,
} from "../src/commands/bridge_approval_token.js";
import { resolveInput } from "./command_fixture.js";

test("ai mcp enables mutation tools with --mutations", () => {
  assert.equal(
    resolveInput(["ai", "mcp", "--mutations"]).options.mutations,
    true,
  );
});

test("stores and clears the temporary Bridge approval token", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ai-mcp-"),
  );
  const token = "m".repeat(32);
  try {
    await writeBridgeApprovalToken(directory, token);
    assert.equal(await readBridgeApprovalToken(directory), token);
    if (process.platform !== "win32") {
      const target = path.join(
        directory,
        ".riebeckite",
        "bridge",
        "approval-token",
      );
      assert.equal((await fs.stat(target)).mode & 0o777, 0o600);
    }
    await clearBridgeApprovalToken(directory);
    assert.equal(await readBridgeApprovalToken(directory), undefined);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("uses the managed control descriptor instead of development output", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ai-mcp-managed-"),
  );
  const command = path.join(directory, "dev.mjs");
  await fs.writeFile(
    command,
    [
      'import fs from "node:fs";',
      'console.log("not JSON-RPC");',
      'fs.writeSync(Number(process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD), JSON.stringify({ type: "ready", protocolVersion: 1, sessionId: process.env.RIEBECKITE_MANAGED_DEV_SESSION, previewOrigin: "http://127.0.0.1:5173", capabilities: ["bridge-v1"] }) + "\\n");',
      "setInterval(() => {}, 1_000);",
    ].join("\n"),
  );
  const development = startManagedDev(
    { projectRoot: directory },
    "a".repeat(32),
    command,
  );
  t.after(async () => {
    await development.stop();
    await fs.rm(directory, { recursive: true, force: true });
  });
  assert.equal(await development.ready, "http://127.0.0.1:5173");
});
