import crypto from "node:crypto";
import { start } from "@riebeckite/mcp";
import type { RiebeckiteProject } from "../application_root.js";
import {
  clearBridgeApprovalToken,
  writeBridgeApprovalToken,
} from "./bridge_approval_token.js";
import { runDev } from "./dev.js";

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
  let ready!: (origin: string) => void;
  let failed!: (error: unknown) => void;
  const origin = new Promise<string>((resolve, reject) => {
    ready = resolve;
    failed = reject;
  });
  const development = runDev(project, (urls) => {
    const value = urls.find(isLoopbackOrigin);
    if (!value) throw new Error("AI MCP requires a loopback development URL.");
    ready(value.replace(/\/$/, ""));
  });
  void development.catch(failed);
  try {
    const developmentOrigin = await origin;
    await start({
      ...process.env,
      RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN: developmentOrigin,
      RIEBECKITE_BRIDGE_TOKEN: token,
    });
  } finally {
    restore("RIEBECKITE_BRIDGE_TOKEN", previous.bridge);
    restore("RIEBECKITE_BRIDGE_MUTATION_TOKEN", previous.mutation);
    restore("RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN", previous.approval);
    if (options.mutations) await clearBridgeApprovalToken(project.projectRoot);
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
