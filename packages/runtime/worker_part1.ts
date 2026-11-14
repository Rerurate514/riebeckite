import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
} from "./src/core/errors.js";
import { isRuntimeTransfer, type RuntimeTransfer } from "./src/core/outcome.js";
import { assertPayloadSize } from "./src/core/payload.js";
import {
  isRuntimeMessage,
  RUNTIME_PROTOCOL,
  RUNTIME_PROTOCOL_VERSION,
  type RuntimeMessage,
  serializeRuntimeError,
} from "./src/core/protocol.js";
import type { RuntimeCapability, RuntimeLimits } from "./src/core/types.js";

export type RuntimeMessageScope = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  close?(): void;
};

export type WorkerRuntimeHandler<TInput, TOutput> = {
  initialize?(
    init: unknown,
    context: { readonly instanceId: string; readonly signal: AbortSignal },
  ): void | Promise<void>;
  invoke(
    input: TInput,
    context: {
      readonly instanceId: string;
      readonly requestId: number;
      readonly signal: AbortSignal;
      readonly capability?: RuntimeCapability;
    },
  ):
    | TOutput
    | RuntimeTransfer<TOutput>
    | Promise<TOutput | RuntimeTransfer<TOutput>>;
  dispose?(): void | Promise<void>;
};

export function serveWorkerRuntime<TInput, TOutput>(
  scope: RuntimeMessageScope,
  handler: WorkerRuntimeHandler<TInput, TOutput>,
): () => void {
  let instanceId: string | undefined;
  let initialized = false;
  let failed = false;
  let disposed = false;
  let limits: RuntimeLimits = {};
  const active = new Map<number, AbortController>();

  const post = (message: RuntimeMessage, transfer?: Transferable[]) => {
    scope.postMessage(message, transfer);
  };

  const fatal = (error: unknown) => {
    failed = true;
    post({
      protocol: RUNTIME_PROTOCOL,
      version: RUNTIME_PROTOCOL_VERSION,
      instanceId: instanceId ?? "",
      kind: "fatal",
      error: serializeRuntimeError(error),
    });
  };

  const onMessage = (event: { readonly data: unknown }) => {
    const message = event.data;
    if (!isRuntimeMessage(message)) return;
    if (disposed || failed) return;
    if (message.kind === "init") {
      if (initialized) return;
      if (!message.instanceId) return;
      instanceId = message.instanceId;
      limits = message.limits ?? {};
      void initialize(message).catch(fatal);
      return;
    }
    if (!initialized || message.instanceId !== instanceId) return;
    switch (message.kind) {
      case "invoke":
        void invokeMessage(message);
        break;
      case "cancel": {
        if (message.requestId === undefined) return;
        active
          .get(message.requestId)
          ?.abort(
            new RuntimeAbortError("Worker runtime request was cancelled."),
          );
        break;
      }
      case "dispose":
        void dispose();
        break;
      default:
        return;
    }
  };

  const initialize = async (message: RuntimeMessage) => {
    try {
      await handler.initialize?.(message.payload, {
        instanceId: message.instanceId,
        signal: new AbortController().signal,
      });
      initialized = true;
      post({
        protocol: RUNTIME_PROTOCOL,
        version: RUNTIME_PROTOCOL_VERSION,
        instanceId: message.instanceId,
        kind: "ready",
      });
    } catch (error) {
      fatal(error);
    }
  };

  const invokeMessage = async (message: RuntimeMessage) => {
    const requestId = message.requestId;
    if (requestId === undefined || active.has(requestId)) return;
    const maxConcurrent = limits.maxConcurrent ?? 16;
    if (active.size >= maxConcurrent) {
      post({
        protocol: RUNTIME_PROTOCOL,
        version: RUNTIME_PROTOCOL_VERSION,
        instanceId: instanceId ?? "",
        kind: "error",
        requestId,
        error: serializeRuntimeError(
          new RuntimeConcurrencyError(
            `Worker runtime rejected a request: ${active.size} requests are already in flight.`,
          ),
        ),
      });
      return;
    }
    const controller = new AbortController();
    active.set(requestId, controller);
    try {
      const result = await handler.invoke(message.payload as TInput, {
        instanceId: instanceId ?? "",
        requestId,
        signal: controller.signal,
        capability: message.capability,
      });
      if (controller.signal.aborted) return;
      const value = isRuntimeTransfer<TOutput>(result) ? result.value : result;
      assertPayloadSize(
        value,
        limits.maxOutputBytes ?? 16 * 1024 * 1024,
        "Worker runtime output",
      );
      const transfer = isRuntimeTransfer<TOutput>(result)
        ? result.transfer
        : [];
      post(
        {
          protocol: RUNTIME_PROTOCOL,
          version: RUNTIME_PROTOCOL_VERSION,
          instanceId: instanceId ?? "",
          kind: "result",
          requestId,
          payload: value,
          transfer: transfer.length > 0 ? transfer : undefined,
        },
        transfer.length > 0 ? ([...transfer] as Transferable[]) : undefined,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof RuntimeFailureError) {
        fatal(error);
        return;
      }
      post({
        protocol: RUNTIME_PROTOCOL,
        version: RUNTIME_PROTOCOL_VERSION,
        instanceId: instanceId ?? "",
        kind: "error",
        requestId,
        error: serializeRuntimeError(error),
      });
    } finally {
      active.delete(requestId);
    }
  };

  const abortAll = () => {
    for (const controller of active.values()) {
      controller.abort(new RuntimeAbortError("Worker runtime was disposed."));
    }
    active.clear();
  };

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    abortAll();
    try {
      await handler.dispose?.();
    } catch {
      return;
    } finally {
      scope.removeEventListener("message", onMessage);
      scope.close?.();
    }
  };

  scope.addEventListener("message", onMessage);

  return () => {
    void dispose();
  };
}

export type WasmWorkerInit = {
  readonly wasmUrl: string;
  readonly exportName: string;
};
