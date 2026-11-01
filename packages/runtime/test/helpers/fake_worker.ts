import type {
  WorkerErrorEvent,
  WorkerLike,
  WorkerMessageEvent,
} from "../../src/client/worker.js";
import type { RuntimeMessageScope } from "../../worker.js";

export type FakeWorker = {
  readonly worker: WorkerLike;
  readonly terminations: number;
  emitError(error: unknown): void;
  emitMessage(data: unknown): void;
};

export function createFakeWorker(
  serve: (scope: RuntimeMessageScope) => void,
): FakeWorker {
  const clientListeners = new Set<(event: WorkerMessageEvent) => void>();
  const clientErrorListeners = new Set<(event: WorkerErrorEvent) => void>();
  const scopeListeners = new Set<(event: { readonly data: unknown }) => void>();
  const state = { terminations: 0 };

  const scope: RuntimeMessageScope = {
    postMessage(message, transfer) {
      const cloned = structuredClone(message, { transfer });
      queueMicrotask(() => {
        for (const listener of clientListeners) listener({ data: cloned });
      });
    },
    addEventListener(_type, listener) {
      scopeListeners.add(listener);
    },
    removeEventListener(_type, listener) {
      scopeListeners.delete(listener);
    },
    close() {},
  };

  const worker: WorkerLike = {
    postMessage(message, transfer) {
      const cloned = structuredClone(message, { transfer });
      queueMicrotask(() => {
        for (const listener of scopeListeners) listener({ data: cloned });
      });
    },
    addEventListener(type, listener) {
      if (type === "message") {
        clientListeners.add(listener as (event: WorkerMessageEvent) => void);
      } else {
        clientErrorListeners.add(listener as (event: WorkerErrorEvent) => void);
      }
    },
    removeEventListener(type, listener) {
      if (type === "message") {
        clientListeners.delete(listener as (event: WorkerMessageEvent) => void);
      } else {
        clientErrorListeners.delete(
          listener as (event: WorkerErrorEvent) => void,
        );
      }
    },
    terminate() {
      state.terminations += 1;
    },
  };

  serve(scope);

  return {
    worker,
    get terminations() {
      return state.terminations;
    },
    emitError(error) {
      for (const listener of clientErrorListeners) listener({ error });
    },
    emitMessage(data) {
      for (const listener of clientListeners) listener({ data });
    },
  };
}

export function createAddWasm(): Uint8Array {
  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x0b, 0x02, 0x60,
    0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x60, 0x00, 0x01, 0x7f, 0x03, 0x03, 0x02,
    0x00, 0x01, 0x07, 0x0e, 0x02, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, 0x04,
    0x74, 0x72, 0x61, 0x70, 0x00, 0x01, 0x0a, 0x0d, 0x02, 0x07, 0x00, 0x20,
    0x00, 0x20, 0x01, 0x6a, 0x0b, 0x03, 0x00, 0x00, 0x0b,
  ]);
}
