import type { RuntimeErrorWire } from "../core/protocol.js";
import type {
  RuntimeCapability,
  RuntimeDriverResult,
  RuntimeLimits,
} from "../core/types.js";

export const IFRAME_PROTOCOL = "riebeckite:iframe";
export const IFRAME_PROTOCOL_VERSION = 1;
export const MAX_ACTIVE_IFRAMES = 4;

export const DEFAULT_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

export const ALLOWED_SANDBOX_TOKENS = new Set(["allow-scripts", "allow-forms"]);

export type IframeMessage = {
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

export type PendingRequest<TOutput> = {
  readonly resolve: (value: TOutput | RuntimeDriverResult<TOutput>) => void;
  readonly reject: (error: unknown) => void;
  readonly unlink: () => void;
};

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
