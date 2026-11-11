export const RUNTIME_KINDS = [
  "main",
  "worker",
  "wasm-worker",
  "iframe",
] as const;

export type RuntimeKind = (typeof RUNTIME_KINDS)[number];

export const RUNTIME_STATES = [
  "created",
  "starting",
  "ready",
  "running",
  "stopping",
  "disposed",
  "failed",
] as const;

export type RuntimeState = (typeof RUNTIME_STATES)[number];

import type { RuntimeCapability } from "@riebeckite/core/client";

export { RUNTIME_CAPABILITIES } from "@riebeckite/core/client";
export type { RuntimeCapability };

export type RuntimeLimits = {
  readonly maxInputBytes?: number;
  readonly maxOutputBytes?: number;
  readonly maxConcurrent?: number;
  readonly invokeTimeoutMs?: number;
  readonly startTimeoutMs?: number;
};

export type ResolvedRuntimeLimits = {
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly maxConcurrent: number;
  readonly invokeTimeoutMs: number;
  readonly startTimeoutMs: number;
};

export type RuntimeInvokeContext = {
  readonly signal: AbortSignal;
  readonly requestId: number;
  readonly capability?: RuntimeCapability;
  readonly transfer?: readonly unknown[];
};

export type RuntimeDriverResult<TOutput> = {
  readonly value: TOutput;
  readonly transfer: readonly unknown[];
};

export type RuntimeDriver<TInput, TOutput> = {
  start(): void | Promise<void>;
  invoke(
    input: TInput,
    context: RuntimeInvokeContext,
  ):
    | TOutput
    | RuntimeDriverResult<TOutput>
    | Promise<TOutput | RuntimeDriverResult<TOutput>>;
  stop(): void | Promise<void>;
};

export type RuntimeCreateContext = {
  readonly instanceId: string;
  readonly signal: AbortSignal;
  readonly limits: ResolvedRuntimeLimits;
  /** DOM mount target. Core never reads it; adapters interpret it. */
  readonly root?: unknown;
};

export type RuntimeDefinition<TInput, TOutput> = {
  readonly id: string;
  readonly kind: RuntimeKind;
  readonly capabilities: readonly RuntimeCapability[];
  readonly limits: RuntimeLimits;
  create(context: RuntimeCreateContext): RuntimeDriver<TInput, TOutput>;
};

export type InvokeOptions = {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly capability?: RuntimeCapability;
  readonly transfer?: readonly unknown[];
};

export type RuntimeInstanceOptions = {
  readonly signal?: AbortSignal;
  readonly root?: unknown;
  readonly onError?: (error: unknown, phase: RuntimeErrorPhase) => void;
};

export type RuntimeErrorPhase = "start" | "invoke" | "stop" | "state-change";

export type RuntimeStateChange = {
  readonly previous: RuntimeState;
  readonly state: RuntimeState;
};

export type InteractiveRuntime<TInput, TOutput> = {
  readonly id: string;
  readonly instanceId: string;
  readonly kind: RuntimeKind;
  readonly capabilities: readonly RuntimeCapability[];
  readonly state: RuntimeState;
  readonly signal: AbortSignal;
  onStateChange(listener: (change: RuntimeStateChange) => void): () => void;
  mount(): Promise<void>;
  invoke(input: TInput, options?: InvokeOptions): Promise<TOutput>;
  dispose(): Promise<void>;
};
