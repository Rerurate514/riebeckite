import crypto from "node:crypto";
import { start } from "@riebeckite/mcp";
import type { RiebeckiteProject } from "../application_root.js";
import { runDev } from "./dev.js";

export async function runAiMcp(project: RiebeckiteProject): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const previous = process.env.RIEBECKITE_BRIDGE_TOKEN;
  process.env.RIEBECKITE_BRIDGE_TOKEN = token;
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
    if (previous === undefined) delete process.env.RIEBECKITE_BRIDGE_TOKEN;
    else process.env.RIEBECKITE_BRIDGE_TOKEN = previous;
  }
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
