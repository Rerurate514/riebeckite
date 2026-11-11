export const RUNTIME_CAPABILITIES = [
  "dom",
  "worker",
  "wasm",
  "network",
  "message",
] as const;

export type RuntimeCapability = (typeof RUNTIME_CAPABILITIES)[number];

export type ClientRuntimeInvokeOptions = {
  readonly signal?: AbortSignal;
  readonly capability?: RuntimeCapability;
  readonly transfer?: readonly unknown[];
};

export type ClientRuntime<TOutput = unknown> = {
  readonly id: string;
  readonly instanceId: string;
  readonly signal: AbortSignal;
  mount(): Promise<void>;
  invoke(
    input: unknown,
    options?: ClientRuntimeInvokeOptions,
  ): Promise<TOutput>;
  dispose(): Promise<void>;
};

export type ClientRuntimeCreateOptions = {
  readonly root?: unknown;
  readonly signal?: AbortSignal;
};

export type ClientRuntimeHost = {
  has(id: string): boolean;
  ids(): readonly string[];
  create<TOutput = unknown>(
    id: string,
    options?: ClientRuntimeCreateOptions,
  ): ClientRuntime<TOutput>;
  dispose(): Promise<void>;
};
