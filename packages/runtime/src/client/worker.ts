import { abortReasonToError } from "../core/abort.js";
import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeWorkerError,
} from "../core/errors.js";
import { transferOutput } from "../core/outcome.js";
import {
  isRuntimeMessage,
  RUNTIME_PROTOCOL,
  RUNTIME_PROTOCOL_VERSION,
  type RuntimeMessage,
} from "../core/protocol.js";
import { defineInteractiveRuntime } from "../core/registry.js";
import type {
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeDriverResult,
  RuntimeKind,
  RuntimeLimits,
} from "../core/types.js";
import { runtimeErrorFromWire } from "./errors.js";

export const MAX_ACTIVE_WORKERS = 8;

let activeWorkers = 0;

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

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
  readonly unlink: () => void;
};

export function createWorkerRuntime<TInput, TOutput>(
  options: WorkerRuntimeOptions<TInput, TOutput>,
): RuntimeDefinition<TInput, TOutput> {
  return defineInteractiveRuntime<TInput, TOutput>({
    id: options.id,
    kind: options.kind ?? "worker",
    capabilities: options.capabilities ?? ["worker", "message"],
    limits: {
      ...options.limits,
      invokeTimeoutMs: options.limits?.invokeTimeoutMs ?? 30_000,
    },
    create(context) {
      let worker: WorkerLike | undefined;
      let readyResolve: (() => void) | undefined;
      let readyReject: ((error: unknown) => void) | undefined;
      let failed: RuntimeFailureError | undefined;
      let stopped = false;
      const pending = new Map<number, PendingRequest>();

      const post = (message: RuntimeMessage, transfer?: Transferable[]) => {
        worker?.postMessage(message, transfer);
      };

      const base = {
        protocol: RUNTIME_PROTOCOL,
        version: RUNTIME_PROTOCOL_VERSION,
        instanceId: context.instanceId,
      } as const;

      const fail = (error: unknown, message: string) => {
        if (stopped) return;
        const specific =
          error instanceof Error ? error : new RuntimeWorkerError(message);
        const failure =
          specific instanceof RuntimeFailureError
            ? specific
            : new RuntimeFailureError(message, { cause: specific });
        failed = failure;
        readyReject?.(specific);
        for (const request of pending.values()) {
          request.unlink();
          request.reject(failure);
        }
        pending.clear();
        worker?.terminate();
        worker = undefined;
        activeWorkers = Math.max(0, activeWorkers - 1);
      };

      const onMessage = (event: WorkerMessageEvent) => {
        const message = event.data;
        if (!isRuntimeMessage(message)) return;
        if (message.instanceId !== context.instanceId) return;
        switch (message.kind) {
          case "ready":
            readyResolve?.();
            break;
          case "result": {
            const request = takePending(pending, message.requestId);
            if (!request) return;
            try {
              const value = options.mapResult
                ? options.mapResult(message.payload)
                : (message.payload as TOutput);
              const transfer = message.transfer;
              request.resolve(
                transfer && transfer.length > 0
                  ? transferOutput(value, transfer)
                  : value,
              );
            } catch (error) {
              request.reject(error);
            }
            break;
          }
          case "error": {
            const request = takePending(pending, message.requestId);
            const error = runtimeErrorFromWire(
              message.error,
              `Worker runtime "${options.id}" request failed.`,
            );
            if (request) request.reject(error);
            else if (error instanceof RuntimeFailureError)
              fail(error, error.message);
            break;
          }
          case "fatal": {
            const error = runtimeErrorFromWire(
              message.error,
              `Worker runtime "${options.id}" failed.`,
            );
            fail(error, error.message);
            break;
          }
          default:
            return;
        }
      };

      const onError = (event: WorkerErrorEvent) => {
        const message =
          event.error instanceof Error
            ? event.error.message
            : event.message || `Worker runtime "${options.id}" crashed.`;
        fail(event.error, message);
      };

      const onMessageError = () => {
        fail(
          undefined,
          `Worker runtime "${options.id}" received an uncloneable message.`,
        );
      };

      const start = () => {
        if (activeWorkers >= MAX_ACTIVE_WORKERS) {
          throw new RuntimeConcurrencyError(
            `Worker runtime "${options.id}" cannot start: ${MAX_ACTIVE_WORKERS} worker runtimes are already active.`,
          );
        }
        const ready = new Promise<void>((resolve, reject) => {
          readyResolve = resolve;
          readyReject = reject;
        });
        activeWorkers += 1;
        try {
          worker = options.createWorker();
        } catch (error) {
          activeWorkers = Math.max(0, activeWorkers - 1);
          readyReject?.(error);
          throw error;
        }
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        worker.addEventListener("messageerror", onMessageError);
        post(
          {
            ...base,
            kind: "init",
            payload: options.init,
            limits: context.limits,
          },
          options.initTransfer ? [...options.initTransfer] : undefined,
        );
        return ready;
      };

      const invoke = (
        input: TInput,
        requestContext: {
          readonly signal: AbortSignal;
          readonly requestId: number;
          readonly capability?: RuntimeCapability;
          readonly transfer?: readonly unknown[];
        },
      ) => {
        if (failed) return Promise.reject(failed);
        if (stopped) {
          return Promise.reject(
            new RuntimeAbortError(
              `Worker runtime "${options.id}" was disposed.`,
            ),
          );
        }
        if (!worker) {
          return Promise.reject(
            new RuntimeWorkerError(
              `Worker runtime "${options.id}" is not started.`,
            ),
          );
        }
        const { signal, requestId } = requestContext;
        if (signal.aborted) {
          return Promise.reject(abortReasonToError(signal));
        }
        return new Promise<TOutput | RuntimeDriverResult<TOutput>>(
          (resolve, reject) => {
            const onAbort = () => {
              post({ ...base, kind: "cancel", requestId });
              takePending(pending, requestId);
              reject(abortReasonToError(signal));
            };
            const unlink = () => signal.removeEventListener("abort", onAbort);
            pending.set(requestId, { resolve, reject, unlink });
            signal.addEventListener("abort", onAbort, { once: true });
            try {
              post(
                {
                  ...base,
                  kind: "invoke",
                  requestId,
                  capability: requestContext.capability,
                  payload: options.invokePayload
                    ? options.invokePayload(input)
                    : input,
                },
                requestContext.transfer
                  ? ([...requestContext.transfer] as Transferable[])
                  : undefined,
              );
            } catch (error) {
              takePending(pending, requestId);
              reject(error);
            }
          },
        );
      };

      const stop = () => {
        if (stopped) return;
        stopped = true;
        const error = new RuntimeAbortError(
          `Worker runtime "${options.id}" was disposed.`,
        );
        for (const request of pending.values()) {
          request.unlink();
          request.reject(error);
        }
        pending.clear();
        readyReject?.(error);
        if (worker) {
          try {
            post({ ...base, kind: "dispose" });
          } catch {
            // The worker may already be gone.
          }
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          worker.removeEventListener("messageerror", onMessageError);
          worker.terminate();
          worker = undefined;
          activeWorkers = Math.max(0, activeWorkers - 1);
        }
      };

      return {
        start,
        invoke,
        stop,
      };
    },
  });
}

function takePending(
  pending: Map<number, PendingRequest>,
  requestId: number | undefined,
): PendingRequest | undefined {
  if (requestId === undefined) return undefined;
  const request = pending.get(requestId);
  if (!request) return undefined;
  pending.delete(requestId);
  request.unlink();
  return request;
}
