import type { PendingView } from "./derived_view_types.js";

export function waitForConsumer(
  pending: PendingView,
  signal: AbortSignal | undefined,
  onRelease: () => void,
): Promise<unknown> {
  if (signal?.aborted)
    return Promise.reject(signal.reason ?? new Error("Derived View aborted."));
  pending.consumers++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      pending.consumers--;
      signal?.removeEventListener("abort", abort);
      pending.controller.signal.removeEventListener("abort", abortShared);
      onRelease();
    };
    const abort = () => {
      release();
      reject(signal?.reason ?? new Error("Derived View aborted."));
    };
    const abortShared = () => {
      release();
      reject(
        pending.controller.signal.reason ?? new Error("Derived View aborted."),
      );
    };
    signal?.addEventListener("abort", abort, { once: true });
    pending.controller.signal.addEventListener("abort", abortShared, {
      once: true,
    });
    void pending.promise.then(
      (value) => {
        release();
        resolve(value);
      },
      (error: unknown) => {
        release();
        reject(error);
      },
    );
  });
}
