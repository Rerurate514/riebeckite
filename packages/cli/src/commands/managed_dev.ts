import crypto from "node:crypto";
import fs from "node:fs";

export type ManagedDevReady = {
  readonly type: "ready";
  readonly protocolVersion: 1;
  readonly sessionId: string;
  readonly siteId: string;
  readonly previewOrigin: string;
  readonly capabilities: readonly ["bridge-v1"];
};

type ManagedDevEvent =
  | {
      readonly type: "starting";
      readonly protocolVersion: 1;
      readonly sessionId: string;
    }
  | ManagedDevReady
  | {
      readonly type: "error";
      readonly protocolVersion: 1;
      readonly sessionId: string;
      readonly code: "START_FAILED";
    };

export function managedDevReporter():
  | {
      readonly sessionId: string;
      readonly starting: () => void;
      readonly ready: (
        input: Omit<ManagedDevReady, "type" | "protocolVersion" | "sessionId">,
      ) => void;
      readonly failed: () => void;
    }
  | undefined {
  const fd = controlFd(process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD);
  const sessionId = process.env.RIEBECKITE_MANAGED_DEV_SESSION;
  if (fd === undefined || !sessionId || !isSessionId(sessionId))
    return undefined;
  const write = (event: ManagedDevEvent) => {
    try {
      fs.writeSync(fd, `${JSON.stringify(event)}\n`);
    } catch {}
  };
  return {
    sessionId,
    starting: () => write({ type: "starting", protocolVersion: 1, sessionId }),
    ready: (input) =>
      write({ type: "ready", protocolVersion: 1, sessionId, ...input }),
    failed: () =>
      write({
        type: "error",
        protocolVersion: 1,
        sessionId,
        code: "START_FAILED",
      }),
  };
}

export function managedSiteId(contentRoot: string): string {
  return crypto
    .createHash("sha256")
    .update(`site\0${contentRoot}`)
    .digest("base64url");
}

function controlFd(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const fd = Number(value);
  return Number.isSafeInteger(fd) && fd >= 3 ? fd : undefined;
}

function isSessionId(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}
