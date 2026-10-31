import {
  RuntimeAbortError,
  RuntimeFailureError,
  RuntimeIframeError,
  RuntimeTimeoutError,
  RuntimeWasmError,
  RuntimeWorkerError,
} from "./errors.js";

const knownReasonTypes = [
  RuntimeAbortError,
  RuntimeTimeoutError,
  RuntimeWasmError,
  RuntimeWorkerError,
  RuntimeIframeError,
  RuntimeFailureError,
];

export function abortReasonToError(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  if (reason instanceof Error) {
    for (const type of knownReasonTypes) {
      if (reason instanceof type) return reason;
    }
    if (reason.message) return new RuntimeAbortError(reason.message);
  }
  return new RuntimeAbortError();
}
