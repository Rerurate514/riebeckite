import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { start } from "@riebeckite/mcp";
import type { RiebeckiteProject } from "../application_root.js";
import {
  clearBridgeApprovalToken,
  writeBridgeApprovalToken,
} from "./bridge_approval_token.js";

export async function runAiMcp(
  project: RiebeckiteProject,
  options: { mutations?: boolean } = {},
): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const mutationToken = options.mutations
    ? crypto.randomBytes(32).toString("base64url")
    : undefined;
  const approvalToken = options.mutations
    ? crypto.randomBytes(32).toString("base64url")
    : undefined;
  const previous = {
    bridge: process.env.RIEBECKITE_BRIDGE_TOKEN,
    mutation: process.env.RIEBECKITE_BRIDGE_MUTATION_TOKEN,
    approval: process.env.RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN,
  };
  if (approvalToken)
    await writeBridgeApprovalToken(project.projectRoot, approvalToken);
  process.env.RIEBECKITE_BRIDGE_TOKEN = token;
  if (mutationToken)
    process.env.RIEBECKITE_BRIDGE_MUTATION_TOKEN = mutationToken;
  if (approvalToken)
    process.env.RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN = approvalToken;
  const development = startManagedDev(project, token);
  try {
    const developmentOrigin = await development.ready;
    await start({
      ...process.env,
      RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN: developmentOrigin,
      RIEBECKITE_BRIDGE_TOKEN: token,
    });
  } finally {
    await development.stop();
    restore("RIEBECKITE_BRIDGE_TOKEN", previous.bridge);
    restore("RIEBECKITE_BRIDGE_MUTATION_TOKEN", previous.mutation);
    restore("RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN", previous.approval);
    if (options.mutations) await clearBridgeApprovalToken(project.projectRoot);
  }
}

export function startManagedDev(
  project: Pick<RiebeckiteProject, "projectRoot">,
  token: string,
  command = process.argv[1],
): {
  readonly ready: Promise<string>;
  readonly stop: () => Promise<void>;
} {
  if (!command)
    throw new Error("Unable to start the Riebeckite development server.");
  const sessionId = crypto.randomUUID();
  const child = spawn(process.execPath, [command, "dev"], {
    cwd: project.projectRoot,
    env: {
      ...process.env,
      RIEBECKITE_BRIDGE_TOKEN: token,
      RIEBECKITE_MANAGED_DEV_CONTROL_FD: "3",
      RIEBECKITE_MANAGED_DEV_SESSION: sessionId,
    },
    stdio: ["ignore", "pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  child.stdout?.pipe(process.stderr);
  child.stderr?.pipe(process.stderr);
  let resolve!: (origin: string) => void;
  let reject!: (error: Error) => void;
  const ready = new Promise<string>((next, failed) => {
    resolve = next;
    reject = failed;
  });
  let settled = false;
  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    reject(error);
  };
  const control = child.stdio[3];
  if (!(control instanceof Readable)) {
    fail(new Error("Unable to receive development server status."));
  } else {
    let pending = "";
    control.setEncoding("utf8");
    control.on("data", (chunk: string) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseManagedDevEvent(line, sessionId);
        if (!event) continue;
        if (event.type === "ready") {
          if (settled) continue;
          settled = true;
          resolve(event.previewOrigin);
        } else if (event.type === "error") {
          fail(new Error("Development server failed to start."));
        }
      }
    });
  }
  child.on("error", (error) => fail(error));
  const closed = new Promise<void>((resolve) => child.once("close", resolve));
  child.on("close", (code) => {
    fail(
      new Error(
        `Development server exited before becoming ready (${code ?? 1}).`,
      ),
    );
  });
  return {
    ready,
    stop: async () => {
      if (child.pid === undefined) return await closed;
      if (process.platform === "win32") {
        const taskkill = spawn(
          "taskkill",
          ["/pid", String(child.pid), "/T", "/F"],
          {
            stdio: "ignore",
            windowsHide: true,
          },
        );
        taskkill.on("error", () => child.kill());
      } else process.kill(-child.pid, "SIGTERM");
      await closed;
    },
  };
}

function parseManagedDevEvent(
  line: string,
  sessionId: string,
):
  | { readonly type: "ready"; readonly previewOrigin: string }
  | { readonly type: "error" }
  | undefined {
  try {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== "object") return undefined;
    const event = value as Record<string, unknown>;
    if (
      event.protocolVersion !== 1 ||
      event.sessionId !== sessionId ||
      (event.type !== "ready" && event.type !== "error")
    )
      return undefined;
    const previewOrigin = event.previewOrigin;
    if (event.type === "error") return { type: "error" };
    if (typeof previewOrigin !== "string" || !isLoopbackOrigin(previewOrigin))
      return undefined;
    return { type: "ready", previewOrigin: previewOrigin.replace(/\/$/, "") };
  } catch {
    return undefined;
  }
}

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function isLoopbackOrigin(value: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(value).hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}
