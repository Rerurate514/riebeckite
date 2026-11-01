import { abortReasonToError } from "./abort.js";
import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeStateError,
  RuntimeTimeoutError,
} from "./errors.js";
import { isRuntimeTransfer } from "./outcome.js";
import { assertPayloadSize } from "./payload.js";
import type {
  InteractiveRuntime,
  InvokeOptions,
  ResolvedRuntimeLimits,
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeDriver,
  RuntimeErrorPhase,
  RuntimeInstanceOptions,
  RuntimeKind,
  RuntimeLimits,
  RuntimeState,
  RuntimeStateChange,
} from "./types.js";

let instanceCounter = 0;

export class RuntimeInstance<TInput, TOutput>
  implements InteractiveRuntime<TInput, TOutput>
{
  readonly id: string;
  readonly instanceId: string;
  readonly kind: RuntimeKind;
  readonly capabilities: readonly RuntimeCapability[];
  private readonly driver: RuntimeDriver<TInput, TOutput>;
  private readonly controller = new AbortController();
  private readonly listeners = new Set<(change: RuntimeStateChange) => void>();
  private readonly active = new Set<number>();
  private readonly limits: ResolvedRuntimeLimits;
  private readonly onError: (error: unknown, phase: RuntimeErrorPhase) => void;
  private currentState: RuntimeState = "created";
  private requestCount = 0;
  private mountPromise: Promise<void> | undefined;
  private disposePromise: Promise<void> | undefined;
  private stopPromise: Promise<void> | undefined;
  private failure: unknown;

  constructor(
    definition: RuntimeDefinition<TInput, TOutput>,
    options: RuntimeInstanceOptions,
  ) {
    this.id = definition.id;
    this.instanceId = createInstanceId(definition.id);
    this.kind = definition.kind;
    this.capabilities = definition.capabilities;
    this.limits = resolveLimits(definition.limits);
    this.onError = options.onError ?? defaultErrorReporter;
    this.driver = definition.create({
      instanceId: this.instanceId,
      signal: this.controller.signal,
      limits: this.limits,
      root: options.root,
    });

    if (options.signal?.aborted) {
      void this.dispose();
    } else {
      options.signal?.addEventListener("abort", () => void this.dispose(), {
        once: true,
      });
    }
  }

  get state(): RuntimeState {
    return this.currentState;
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  onStateChange(listener: (change: RuntimeStateChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  mount(): Promise<void> {
    if (this.disposePromise) {
      return Promise.reject(this.disposedError());
    }
    if (this.mountPromise) return this.mountPromise;
    if (this.currentState !== "created") {
      return Promise.reject(
        new RuntimeStateError(
          `Cannot mount runtime "${this.id}" from state "${this.currentState}".`,
        ),
      );
    }
    this.mountPromise = this.runStart();
    return this.mountPromise;
  }

  async invoke(input: TInput, options: InvokeOptions = {}): Promise<TOutput> {
    if (this.currentState === "failed") {
      throw new RuntimeFailureError(
        `Runtime "${this.id}" failed and cannot be reused; create a new instance.`,
        { cause: this.failure },
      );
    }
    if (this.currentState !== "ready" && this.currentState !== "running") {
      throw new RuntimeStateError(
        `Cannot invoke runtime "${this.id}" from state "${this.currentState}".`,
      );
    }
    if (this.active.size >= this.limits.maxConcurrent) {
      throw new RuntimeConcurrencyError(
        `Runtime "${this.id}" rejected an invocation: ${this.active.size} requests are already in flight.`,
      );
    }
    if (options.signal?.aborted) throw abortReasonToError(options.signal);
    if (options.capability && !this.capabilities.includes(options.capability)) {
      throw new RuntimeStateError(
        `Runtime "${this.id}" does not declare the "${options.capability}" capability.`,
      );
    }

    assertPayloadSize(input, this.limits.maxInputBytes, "Runtime input");

    const requestId = ++this.requestCount;
    const call = new AbortController();
    const unlinkInstance = linkSignal(this.controller.signal, call);
    const unlinkExternal = options.signal
      ? linkSignal(options.signal, call)
      : () => {};
    const timeoutMs = options.timeoutMs ?? this.limits.invokeTimeoutMs;
    const timer =
      timeoutMs > 0
        ? setTimeout(
            () =>
              call.abort(
                new RuntimeTimeoutError(
                  `Runtime "${this.id}" invocation timed out after ${timeoutMs}ms.`,
                ),
              ),
            timeoutMs,
          )
        : undefined;

    this.active.add(requestId);
    this.transition("running");
    try {
      const pending = Promise.resolve(
        this.driver.invoke(input, {
          signal: call.signal,
          requestId,
          capability: options.capability,
          transfer: options.transfer,
        }),
      );
      const raw = await awaitWithSignal(pending, call.signal);
      const output = isRuntimeTransfer<TOutput>(raw) ? raw.value : raw;
      assertPayloadSize(output, this.limits.maxOutputBytes, "Runtime output");
      return output;
    } catch (error) {
      if (error instanceof RuntimeFailureError) {
        this.failure = error;
        if (this.currentState === "running") this.transition("failed");
        this.report(error, "invoke");
      }
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      unlinkExternal();
      unlinkInstance();
      this.active.delete(requestId);
      if (this.active.size === 0 && this.currentState === "running") {
        this.transition("ready");
      }
    }
  }

  dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;
    if (this.currentState === "disposed") return Promise.resolve();
    this.disposePromise = this.runStop();
    return this.disposePromise;
  }

  private async runStart(): Promise<void> {
    this.transition("starting");
    try {
      const start = Promise.resolve(this.driver.start());
      await awaitWithSignal(
        withTimeout(
          start,
          this.limits.startTimeoutMs,
          `Runtime "${this.id}" start timed out.`,
        ),
        this.controller.signal,
      );
      if (this.currentState !== "starting") {
        throw this.disposedError();
      }
      this.transition("ready");
    } catch (error) {
      this.failure = error;
      if (this.currentState === "starting") this.transition("failed");
      this.report(error, "start");
      await this.stopDriver();
      throw error;
    }
  }

  private async runStop(): Promise<void> {
    if (this.currentState !== "disposed") this.transition("stopping");
    this.controller.abort(new RuntimeAbortError("Runtime was disposed."));
    await this.mountPromise?.catch(() => {});
    await this.stopDriver();
    if (this.currentState !== "disposed") this.transition("disposed");
    this.listeners.clear();
  }

  private stopDriver(): Promise<void> {
    this.stopPromise ??= (async () => {
      try {
        await this.driver.stop();
      } catch (error) {
        this.report(error, "stop");
      }
    })();
    return this.stopPromise;
  }

  private disposedError(): RuntimeAbortError {
    return new RuntimeAbortError(`Runtime "${this.id}" was disposed.`);
  }

  private transition(state: RuntimeState): void {
    const previous = this.currentState;
    if (previous === state) return;
    this.currentState = state;
    const change = { previous, state };
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (error) {
        this.report(error, "state-change");
      }
    }
  }

  private report(error: unknown, phase: RuntimeErrorPhase): void {
    try {
      this.onError(error, phase);
    } catch {
      return;
    }
  }
}

function resolveLimits(limits: RuntimeLimits): ResolvedRuntimeLimits {
  return {
    maxInputBytes: limits.maxInputBytes ?? 4 * 1024 * 1024,
    maxOutputBytes: limits.maxOutputBytes ?? 16 * 1024 * 1024,
    maxConcurrent: limits.maxConcurrent ?? 16,
    invokeTimeoutMs: limits.invokeTimeoutMs ?? 0,
    startTimeoutMs: limits.startTimeoutMs ?? 15_000,
  };
}

function createInstanceId(id: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `${id}#${random}`;
  instanceCounter += 1;
  return `${id}#${Date.now().toString(36)}-${instanceCounter}`;
}

function linkSignal(parent: AbortSignal, child: AbortController): () => void {
  if (parent.aborted) {
    child.abort(parent.reason);
    return () => {};
  }
  const listener = () => child.abort(parent.reason);
  parent.addEventListener("abort", listener, { once: true });
  return () => parent.removeEventListener("abort", listener);
}

function abortFrom(signal: AbortSignal): Error {
  return abortReasonToError(signal);
}

function awaitWithSignal<T>(
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

function withTimeout<T>(
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

function defaultErrorReporter(error: unknown, phase: RuntimeErrorPhase): void {
  if (error instanceof RuntimeAbortError) return;
  console.error(`[riebeckite] Interactive runtime ${phase} failed.`, error);
}
