import { RuntimeIframeError } from "../core/errors.js";
import {
  ALLOWED_SANDBOX_TOKENS,
  type IframeRuntimeOptions,
  type PendingRequest,
} from "./iframe_types.js";

export function resolveSandbox(
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

export function resolveContainer(
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

export function createSessionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  return `iframe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function buildDocument(options: {
  html: string;
  title: string;
  csp: string;
  sessionId: string;
}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(options.csp)}"><meta name="referrer" content="no-referrer"><title>${escapeHtml(options.title)}</title></head><body>${options.html}<script>${bridgeScript(options.sessionId)}</script></body></html>`;
}

export function bridgeScript(sessionId: string): string {
  return `(function(){
var session=${JSON.stringify(sessionId)};
export function send(message,transfer){
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

export function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

export function escapeHtml(value: string): string {
  return escapeAttribute(value).replaceAll(">", "&gt;");
}

export function takePending<TOutput>(
  pending: Map<number, PendingRequest<TOutput>>,
  requestId: number | undefined,
): PendingRequest<TOutput> | undefined {
  if (requestId === undefined) return undefined;
  const request = pending.get(requestId);
  if (!request) return undefined;
  pending.delete(requestId);
  request.unlink();
  return request;
}
