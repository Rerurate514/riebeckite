/**
 * Minimal console logger shared by the external-site engine.
 *
 * The engine is published as the shared test package's e2e entry point and
 * must not assume any repository layout, so every phase receives a logger
 * instead of reading a module-level one. `createLogger` reproduces the `\n[label] message` format
 * the repo-local driver has always printed.
 */
export interface Logger {
  /** Print a phase heading. */
  step(message: string): void;
  /** Abort the run with `message`. */
  fail(message: string): never;
}

/**
 * Create a logger whose `step` lines are prefixed with `\n[label] `.
 */
export function createLogger(label = "e2e"): Logger {
  return {
    step(message) {
      console.log(`\n[${label}] ${message}`);
    },
    fail(message) {
      throw new Error(message);
    },
  };
}
