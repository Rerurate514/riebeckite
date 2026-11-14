import { abortReasonToError } from "../core/abort.js";
import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeIframeError,
  RuntimeStateError,
  RuntimeUnsupportedError,
} from "../core/errors.js";
import { transferOutput } from "../core/outcome.js";
import { defineInteractiveRuntime } from "../core/registry.js";
import type {
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeDriverResult,
} from "../core/types.js";
import { runtimeErrorFromWire } from "./errors.js";
import {
  buildDocument,
  createSessionId,
  resolveContainer,
  resolveSandbox,
  takePending,
} from "./iframe_helpers.js";
import {
  DEFAULT_CSP,
  IFRAME_PROTOCOL,
  IFRAME_PROTOCOL_VERSION,
  type IframeMessage,
  type IframeRuntimeOptions,
  MAX_ACTIVE_IFRAMES,
  type PendingRequest,
} from "./iframe_types.js";

let activeIframes = 0;

export function createIframeRuntime<TInput, TOutput>(
  options: IframeRuntimeOptions,
): RuntimeDefinition<TInput, TOutput> {
  return defineInteractiveRuntime<TInput, TOutput>({
    id: options.id,
    kind: "iframe",
    capabilities: options.capabilities ?? ["message"],
    limits: {
      ...options.limits,
      invokeTimeoutMs: options.limits?.invokeTimeoutMs ?? 10_000,
    },
    create(context) {
      let iframe: HTMLIFrameElement | undefined;
      let sessionId: string | undefined;
      let readySeen = false;
      let readyResolve: (() => void) | undefined;
      let readyReject: ((error: unknown) => void) | undefined;
      let started = false;
      let stopped = false;
      let failed: RuntimeFailureError | undefined;
      let counted = false;
      const pending = new Map<number, PendingRequest<TOutput>>();
      const expectedOrigin = options.expectedOrigin ?? "null";
      const targetOrigin = expectedOrigin === "null" ? "*" : expectedOrigin;

      const fail = (error: unknown, message: string) => {
        const failure =
          error instanceof RuntimeFailureError
            ? error
            : new RuntimeFailureError(message, { cause: error });
        failed = failure;
        readyReject?.(failure);
        for (const request of pending.values()) {
          request.unlink();
          request.reject(failure);
        }
        pending.clear();
        cleanup();
      };

      const onMessage = (event: MessageEvent) => {
        if (!iframe || event.source !== iframe.contentWindow) return;
        if (event.origin !== expectedOrigin) return;
        const message = event.data as IframeMessage | null;
        if (!message || typeof message !== "object") return;
        if (message.protocol !== IFRAME_PROTOCOL) return;
        if (message.version !== IFRAME_PROTOCOL_VERSION) return;
        if (!sessionId || message.sessionId !== sessionId) return;
        switch (message.kind) {
          case "ready":
            if (!readySeen) {
              readySeen = true;
              readyResolve?.();
            }
            break;
          case "result": {
            const request = takePending(pending, message.requestId);
            if (!request) return;
            const transfer = message.transfer;
            request.resolve(
              transfer && transfer.length > 0
                ? transferOutput(message.payload as TOutput, transfer)
                : (message.payload as TOutput),
            );
            break;
          }
          case "error": {
            const request = takePending(pending, message.requestId);
            if (!request) return;
            request.reject(
              runtimeErrorFromWire(
                message.error,
                `Iframe runtime "${options.id}" request failed.`,
              ),
            );
            break;
          }
          default:
            return;
        }
      };

      const onLoad = () => {
        if (!iframe) return;
        if (readySeen) {
          fail(
            new RuntimeIframeError(
              `Iframe runtime "${options.id}" navigated unexpectedly.`,
            ),
            `Iframe runtime "${options.id}" navigated unexpectedly.`,
          );
          return;
        }
        if (!sessionId) return;
        iframe.contentWindow?.postMessage(
          {
            protocol: IFRAME_PROTOCOL,
            version: IFRAME_PROTOCOL_VERSION,
            sessionId,
            kind: "init",
          },
          targetOrigin,
        );
      };

      const start = () => {
        if (typeof document === "undefined" || typeof window === "undefined") {
          throw new RuntimeUnsupportedError(
            `Iframe runtime "${options.id}" requires a browser DOM.`,
          );
        }
        if (activeIframes >= MAX_ACTIVE_IFRAMES) {
          throw new RuntimeConcurrencyError(
            `Iframe runtime "${options.id}" cannot start: ${MAX_ACTIVE_IFRAMES} iframe runtimes are already active.`,
          );
        }
        const sandbox = resolveSandbox(options.sandbox, options.id);
        const container = resolveContainer(options.container, context.root);
        if (!container) {
          throw new RuntimeUnsupportedError(
            `Iframe runtime "${options.id}" has no document body to mount into.`,
          );
        }
        const ready = new Promise<void>((resolve, reject) => {
          readyResolve = resolve;
          readyReject = reject;
        });
        sessionId = createSessionId();
        iframe = document.createElement("iframe");
        iframe.setAttribute("sandbox", sandbox.join(" "));
        iframe.setAttribute("referrerpolicy", "no-referrer");
        iframe.setAttribute("title", options.title ?? "Interactive runtime");
        iframe.setAttribute(
          "style",
          "width:100%;height:100%;border:0;display:block",
        );
        iframe.srcdoc = buildDocument({
          html: options.html,
          title: options.title ?? "Interactive runtime",
          csp: options.csp ?? DEFAULT_CSP,
          sessionId,
        });
        iframe.addEventListener("load", onLoad);
        window.addEventListener("message", onMessage);
        activeIframes += 1;
        counted = true;
        try {
          container.appendChild(iframe);
        } catch (error) {
          cleanup();
          throw error;
        }
        started = true;
        return ready;
      };

      const invoke = (
        input: TInput,
        requestContext: {
          readonly signal: AbortSignal;
          readonly requestId: number;
          readonly capability?: RuntimeCapability;
          readonly transfer?: readonly unknown[];
        },
      ) => {
        if (failed) return Promise.reject(failed);
        if (stopped) {
          return Promise.reject(
            new RuntimeAbortError(
              `Iframe runtime "${options.id}" was disposed.`,
            ),
          );
        }
        if (!started || !iframe) {
          return Promise.reject(
            new RuntimeStateError(
              `Iframe runtime "${options.id}" is not started.`,
            ),
          );
        }
        const { signal, requestId } = requestContext;
        if (signal.aborted) {
          return Promise.reject(abortReasonToError(signal));
        }
        return new Promise<TOutput | RuntimeDriverResult<TOutput>>(
          (resolve, reject) => {
            const onAbort = () => {
              post({ kind: "cancel", requestId });
              takePending(pending, requestId);
              reject(abortReasonToError(signal));
            };
            const unlink = () => signal.removeEventListener("abort", onAbort);
            pending.set(requestId, { resolve, reject, unlink });
            signal.addEventListener("abort", onAbort, { once: true });
            try {
              post(
                {
                  kind: "invoke",
                  requestId,
                  capability: requestContext.capability,
                  payload: input,
                },
                requestContext.transfer,
              );
            } catch (error) {
              takePending(pending, requestId);
              reject(error);
            }
          },
        );
      };

      const post = (
        message: Partial<IframeMessage>,
        transfer?: readonly unknown[],
      ) => {
        if (!iframe?.contentWindow || !sessionId) return;
        iframe.contentWindow.postMessage(
          {
            protocol: IFRAME_PROTOCOL,
            version: IFRAME_PROTOCOL_VERSION,
            sessionId,
            ...message,
          },
          targetOrigin,
          transfer ? ([...transfer] as Transferable[]) : undefined,
        );
      };

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        if (iframe) {
          iframe.removeEventListener("load", onLoad);
          iframe.remove();
          iframe = undefined;
        }
        if (counted) {
          counted = false;
          activeIframes = Math.max(0, activeIframes - 1);
        }
      };

      const stop = () => {
        if (stopped) return;
        stopped = true;
        const error = new RuntimeAbortError(
          `Iframe runtime "${options.id}" was disposed.`,
        );
        for (const request of pending.values()) {
          request.unlink();
          request.reject(error);
        }
        pending.clear();
        readyReject?.(error);
        cleanup();
        started = false;
      };

      return { start, invoke, stop };
    },
  });
}
