import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
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
