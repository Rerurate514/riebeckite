import { abortReasonToError } from "./abort.js";
import { RuntimeAbortError, RuntimeTimeoutError } from "./errors.js";
import type {
  ResolvedRuntimeLimits,
  RuntimeErrorPhase,
  RuntimeLimits,
} from "./types.js";

let instanceCounter = 0;

export function resolveLimits(limits: RuntimeLimits): ResolvedRuntimeLimits {
  return {
    maxInputBytes: limits.maxInputBytes ?? 4 * 1024 * 1024,
    maxOutputBytes: limits.maxOutputBytes ?? 16 * 1024 * 1024,
    maxConcurrent: limits.maxConcurrent ?? 16,
    invokeTimeoutMs: limits.invokeTimeoutMs ?? 0,
    startTimeoutMs: limits.startTimeoutMs ?? 15_000,
  };
}

export function createInstanceId(id: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `${id}#${random}`;
  instanceCounter += 1;
  return `${id}#${Date.now().toString(36)}-${instanceCounter}`;
}

export function linkSignal(
  parent: AbortSignal,
  child: AbortController,
): () => void {
  if (parent.aborted) {
    child.abort(parent.reason);
    return () => {};
  }
  const listener = () => child.abort(parent.reason);
  parent.addEventListener("abort", listener, { once: true });
  return () => parent.removeEventListener("abort", listener);
}

export function abortFrom(signal: AbortSignal): Error {
  return abortReasonToError(signal);
}

export function awaitWithSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => {});
    return Promise.reject(abortFrom(signal));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortFrom(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new RuntimeTimeoutError(message)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function defaultErrorReporter(
  error: unknown,
  phase: RuntimeErrorPhase,
): void {
  if (error instanceof RuntimeAbortError) return;
  console.error(`[riebeckite] Interactive runtime ${phase} failed.`, error);
}
