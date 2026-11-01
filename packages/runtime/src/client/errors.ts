import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeIframeError,
  RuntimePayloadError,
  RuntimeStateError,
  RuntimeTimeoutError,
  RuntimeUnsupportedError,
  RuntimeWasmError,
  RuntimeWorkerError,
} from "../core/errors.js";
import type { RuntimeErrorWire } from "../core/protocol.js";

export function runtimeErrorFromWire(
  error: RuntimeErrorWire | undefined,
  fallbackMessage: string,
): Error {
  if (!error) return new RuntimeWorkerError(fallbackMessage);
  const message = error.message || fallbackMessage;
  switch (error.name) {
    case "RuntimeAbortError":
      return new RuntimeAbortError(message);
    case "RuntimeTimeoutError":
      return new RuntimeTimeoutError(message);
    case "RuntimePayloadError":
      return new RuntimePayloadError(message);
    case "RuntimeConcurrencyError":
      return new RuntimeConcurrencyError(message);
    case "RuntimeUnsupportedError":
      return new RuntimeUnsupportedError(message);
    case "RuntimeWasmError":
      return new RuntimeWasmError(message, { trap: error.trap === true });
    case "RuntimeFailureError":
      return new RuntimeFailureError(message);
    case "RuntimeStateError":
      return new RuntimeStateError(message);
    case "RuntimeIframeError":
      return new RuntimeIframeError(message, { remoteKind: error.kind });
    default:
      return new RuntimeWorkerError(message, {
        remoteName: error.name,
        remoteKind: error.kind,
      });
  }
}
