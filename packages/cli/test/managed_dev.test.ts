import assert from "node:assert/strict";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { onDevServerReady } from "../src/commands/dev.ts";
import {
  managedDevReporter,
  managedSiteId,
} from "../src/commands/managed_dev.ts";

test("reports managed development events through the supplied control descriptor", () => {
  const directory = mkdtempSync(join(tmpdir(), "riebeckite-managed-dev-"));
  const output = join(directory, "control.jsonl");
  const descriptor = openSync(output, "w");
  const previousFd = process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD;
  const previousSession = process.env.RIEBECKITE_MANAGED_DEV_SESSION;
  const sessionId = "3d4c15af-35dc-4a06-9c06-734101b5ba55";
  try {
    process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD = String(descriptor);
    process.env.RIEBECKITE_MANAGED_DEV_SESSION = sessionId;
    const reporter = managedDevReporter();
    assert.ok(reporter);
    reporter.ready({
      siteId: "site-id",
      previewOrigin: "http://127.0.0.1:5173",
      capabilities: ["bridge-v1"],
    });
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), {
      type: "ready",
      protocolVersion: 1,
      sessionId,
      siteId: "site-id",
      previewOrigin: "http://127.0.0.1:5173",
      capabilities: ["bridge-v1"],
    });
  } finally {
    closeSync(descriptor);
    if (previousFd === undefined)
      delete process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD;
    else process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD = previousFd;
    if (previousSession === undefined)
      delete process.env.RIEBECKITE_MANAGED_DEV_SESSION;
    else process.env.RIEBECKITE_MANAGED_DEV_SESSION = previousSession;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("uses the Bridge site identity algorithm", () => {
  assert.equal(
    managedSiteId("C:/site/content"),
    managedSiteId("C:/site/content"),
  );
  assert.notEqual(
    managedSiteId("C:/site/content"),
    managedSiteId("C:/site/other"),
  );
});

test("an ordinary dev start does not require a managed Bridge", async () => {
  await onDevServerReady([], {
    managed: undefined,
    bridgeToken: undefined,
    siteId: "site-id",
  });
});

test("a managed dev start without a Bridge token fails", async () => {
  await assert.rejects(
    onDevServerReady([], {
      managed: {
        sessionId: "3d4c15af-35dc-4a06-9c06-734101b5ba55",
        starting: () => {},
        ready: () => {},
        failed: () => {},
      },
      bridgeToken: undefined,
      siteId: "site-id",
    }),
    /Managed development requires a loopback Bridge/,
  );
});
