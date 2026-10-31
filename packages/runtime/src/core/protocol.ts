import type { RuntimeCapability, RuntimeLimits } from "./types.js";
export const RUNTIME_PROTOCOL = "riebeckite:runtime";
export const RUNTIME_PROTOCOL_VERSION = 1;

export const RUNTIME_MESSAGE_KINDS = [
  "init",
  "invoke",
  "cancel",
  "ready",
  "result",
  "error",
  "fatal",
  "dispose",
] as const;

export type RuntimeMessageKind = (typeof RUNTIME_MESSAGE_KINDS)[number];

export type RuntimeErrorWire = {
  readonly name: string;
  readonly message: string;
  readonly kind?: string;
  readonly trap?: boolean;
  readonly stack?: string;
};

export type RuntimeMessage = {
  readonly protocol: typeof RUNTIME_PROTOCOL;
  readonly version: number;
  readonly instanceId: string;
  readonly kind: RuntimeMessageKind;
  readonly requestId?: number;
  readonly capability?: RuntimeCapability;
  readonly payload?: unknown;
  readonly transfer?: readonly unknown[];
  readonly limits?: RuntimeLimits;
  readonly error?: RuntimeErrorWire;
};

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (message.protocol !== RUNTIME_PROTOCOL) return false;
  if (message.version !== RUNTIME_PROTOCOL_VERSION) return false;
  if (typeof message.instanceId !== "string") return false;
  return RUNTIME_MESSAGE_KINDS.includes(message.kind as RuntimeMessageKind);
}

export function serializeRuntimeError(error: unknown): RuntimeErrorWire {
  if (error instanceof Error) {
    const details = error as Error & { trap?: unknown; kind?: unknown };
    return {
      name: error.name,
      message: error.message,
      kind: typeof details.kind === "string" ? details.kind : undefined,
      trap: details.trap === true,
      stack: error.stack,
    };
  }
  return {
    name: "Error",
    message: typeof error === "string" ? error : "Unknown runtime error.",
  };
}
