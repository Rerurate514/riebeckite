import type {
  RuntimeCapability,
  RuntimeDriverResult,
  RuntimeKind,
  RuntimeLimits,
} from "../core/types.js";

export type WorkerMessageEvent = { readonly data: unknown };
export type WorkerErrorEvent = {
  readonly error?: unknown;
  readonly message?: string;
};

export type WorkerLike = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: WorkerMessageEvent) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: WorkerErrorEvent) => void,
  ): void;
  addEventListener(
    type: "messageerror",
    listener: (event: WorkerMessageEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: WorkerMessageEvent) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: WorkerErrorEvent) => void,
  ): void;
  removeEventListener(
    type: "messageerror",
    listener: (event: WorkerMessageEvent) => void,
  ): void;
  terminate(): void;
};

export type WorkerRuntimeOptions<TInput, TOutput> = {
  readonly id: string;
  readonly kind?: RuntimeKind;
  readonly capabilities?: readonly RuntimeCapability[];
  readonly limits?: RuntimeLimits;
  readonly createWorker: () => WorkerLike;
  readonly init?: unknown;
  readonly initTransfer?: readonly Transferable[];
  readonly invokePayload?: (input: TInput) => unknown;
  readonly mapResult?: (payload: unknown) => TOutput;
};

export type PendingRequest<TOutput> = {
  readonly resolve: (value: TOutput | RuntimeDriverResult<TOutput>) => void;
  readonly reject: (error: unknown) => void;
  readonly unlink: () => void;
};
