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
import type { RuntimeErrorWire } from "../core/protocol.js";
import { defineInteractiveRuntime } from "../core/registry.js";
import type {
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeDriverResult,
  RuntimeLimits,
} from "../core/types.js";
import { runtimeErrorFromWire } from "./errors.js";

export const IFRAME_PROTOCOL = "riebeckite:iframe";
export const IFRAME_PROTOCOL_VERSION = 1;
export const MAX_ACTIVE_IFRAMES = 4;

const DEFAULT_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

const ALLOWED_SANDBOX_TOKENS = new Set(["allow-scripts", "allow-forms"]);

type IframeMessage = {
  readonly protocol: string;
  readonly version: number;
  readonly sessionId: string;
  readonly kind: string;
  readonly capability?: RuntimeCapability;
  readonly requestId?: number;
  readonly payload?: unknown;
  readonly transfer?: readonly unknown[];
  readonly error?: RuntimeErrorWire;
};

type PendingRequest<TOutput> = {
  readonly resolve: (value: TOutput | RuntimeDriverResult<TOutput>) => void;
  readonly reject: (error: unknown) => void;
  readonly unlink: () => void;
};

let activeIframes = 0;

export type IframeRuntimeOptions = {
  readonly id: string;
  readonly capabilities?: readonly RuntimeCapability[];
  readonly limits?: RuntimeLimits;
  readonly html: string;
  readonly title?: string;
  readonly sandbox?: readonly string[];
  readonly expectedOrigin?: string;
  readonly csp?: string;
  readonly container?: Element | string | (() => Element | null);
};

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

      const takePending = (requestId: number | undefined) => {
        if (requestId === undefined) return undefined;
        const request = pending.get(requestId);
        if (!request) return undefined;
        pending.delete(requestId);
        request.unlink();
        return request;
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
            const request = takePending(message.requestId);
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
            const request = takePending(message.requestId);
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
              takePending(requestId);
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
              takePending(requestId);
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

function resolveSandbox(
  tokens: readonly string[] | undefined,
  id: string,
): string[] {
  const sandbox = [...(tokens ?? ["allow-scripts"])];
  if (!sandbox.includes("allow-scripts")) {
    throw new RuntimeIframeError(
      `Iframe runtime "${id}" requires the "allow-scripts" sandbox token.`,
    );
  }
  for (const token of sandbox) {
    if (!ALLOWED_SANDBOX_TOKENS.has(token)) {
      throw new RuntimeIframeError(
        `Iframe runtime "${id}" rejects the "${token}" sandbox token.`,
      );
    }
  }
  if (
    sandbox.includes("allow-scripts") &&
    sandbox.includes("allow-same-origin")
  ) {
    throw new RuntimeIframeError(
      `Iframe runtime "${id}" must not combine "allow-scripts" with "allow-same-origin".`,
    );
  }
  return sandbox;
}

function resolveContainer(
  container: IframeRuntimeOptions["container"],
  root: unknown,
): Element | null {
  if (typeof container === "function") return container();
  if (typeof container === "string") {
    return document.querySelector(container);
  }
  if (container) return container;
  if (root instanceof Element) return root;
  return document.body;
}

function createSessionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  return `iframe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildDocument(options: {
  html: string;
  title: string;
  csp: string;
  sessionId: string;
}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(options.csp)}"><meta name="referrer" content="no-referrer"><title>${escapeHtml(options.title)}</title></head><body>${options.html}<script>${bridgeScript(options.sessionId)}</script></body></html>`;
}

function bridgeScript(sessionId: string): string {
  return `(function(){
var session=${JSON.stringify(sessionId)};
function send(message,transfer){
message.protocol="riebeckite:iframe";message.version=1;message.sessionId=session;
if(transfer&&transfer.length){window.parent.postMessage(message,"*",transfer);}
else{window.parent.postMessage(message,"*");}
}
window.addEventListener("message",function(event){
if(event.source!==window.parent)return;
var data=event.data;
if(!data||data.protocol!=="riebeckite:iframe"||data.version!==1||data.sessionId!==session)return;
if(data.kind==="init"){
window.dispatchEvent(new CustomEvent("riebeckite:iframe-init",{detail:data.payload}));
send({kind:"ready"});
}else if(data.kind==="invoke"){
window.dispatchEvent(new CustomEvent("riebeckite:iframe-invoke",{detail:{requestId:data.requestId,payload:data.payload,capability:data.capability}}));
}else if(data.kind==="cancel"){
window.dispatchEvent(new CustomEvent("riebeckite:iframe-cancel",{detail:{requestId:data.requestId}}));
}
});
window.riebeckiteIframe={
result:function(requestId,payload){send({kind:"result",requestId:requestId,payload:payload});},
transfer:function(requestId,payload,transfer){send({kind:"result",requestId:requestId,payload:payload,transfer:transfer},transfer);},
error:function(requestId,error){send({kind:"error",requestId:requestId,error:{name:"RuntimeIframeError",message:String(error&&error.message?error.message:error)}});}
};
})();`;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtml(value: string): string {
  return escapeAttribute(value).replaceAll(">", "&gt;");
}
