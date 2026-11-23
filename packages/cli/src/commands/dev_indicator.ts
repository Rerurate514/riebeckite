import { spinner } from "@clack/prompts";

export type DevIndicator = {
  phase: (message: string) => void;
  done: (message: string) => void;
  fail: (message: string) => void;
};

export type FirstResponse = {
  readonly url: string;
  readonly status: number;
};

export type FirstResponseOptions = {
  readonly timeoutMs?: number;
  readonly retryDelayMs?: number;
  readonly fetchImplementation?: typeof fetch;
  readonly isAborted?: () => boolean;
};

const DEFAULT_TIMEOUT_MS = 300_000;
const TICK_MS = 1_000;

export function createDevIndicator(): DevIndicator {
  const startedAt = performance.now();
  const elapsed = () =>
    `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;
  if (process.stdout.isTTY) {
    const progress = spinner();
    let running = false;
    let currentMessage = "";
    const tick = () => {
      if (!running) return;
      progress.message(`${currentMessage} (${elapsed()})`);
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = (message: string) => {
      currentMessage = message;
      progress.start(`${message} (${elapsed()})`);
      timer ??= setInterval(tick, TICK_MS);
      timer.unref?.();
      running = true;
    };
    const stop = () => {
      if (!running) return false;
      if (timer) clearInterval(timer);
      timer = undefined;
      running = false;
      return true;
    };
    return {
      phase: (message) => {
        if (running) {
          currentMessage = message;
          progress.message(`${message} (${elapsed()})`);
          return;
        }
        start(message);
      },
      done: (message) => {
        if (!stop()) return;
        progress.stop(`${message} (${elapsed()})`);
      },
      fail: (message) => {
        if (!stop()) return;
        progress.stop(`${message} (${elapsed()})`);
      },
    };
  }
  let lastPhase = "";
  const write = (text: string) => {
    process.stdout.write(`${text}\n`);
  };
  return {
    phase: (message) => {
      if (message === lastPhase) return;
      lastPhase = message;
      write(`dev: ${message} (${elapsed()})`);
    },
    done: (message) => write(`dev: ${message} (${elapsed()})`),
    fail: (message) => write(`dev: ${message} (${elapsed()})`),
  };
}

export async function waitForFirstResponse(
  url: string,
  options: FirstResponseOptions = {},
): Promise<FirstResponse | undefined> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? 100;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (options.isAborted?.()) return undefined;
    try {
      const response = await fetchImplementation(url, {
        redirect: "manual",
      });
      return { url, status: response.status };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  return undefined;
}
