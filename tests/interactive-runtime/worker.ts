import { serveWorkerRuntime } from "../../packages/runtime/worker.js";

type WorkerInput = {
  readonly value: number;
  readonly delay?: number;
  readonly crash?: boolean;
};

serveWorkerRuntime<WorkerInput, number>(self, {
  async invoke(input, context) {
    if (input.crash) {
      setTimeout(() => {
        throw new Error("Worker crash fixture");
      }, 0);
      await new Promise<void>(() => undefined);
    }
    if (input.delay) await sleep(input.delay, context.signal);
    return input.value * 3;
  },
});

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(signal.reason);
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
