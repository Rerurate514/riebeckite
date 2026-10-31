import {
  type PublicationSnapshot,
  parsePublicationSnapshot,
} from "./entries.js";

export const PUBLICATION_STATE_VERSION = 1;

/**
 * Durable publication state. It is committed to the repository and must not be
 * treated as a cache: losing it causes a safe full redeploy, not a wrong one.
 */
export type PublicationState = {
  readonly version: typeof PUBLICATION_STATE_VERSION;
  readonly lastSuccess?: PublicationSnapshot;
};

export function emptyPublicationState(): PublicationState {
  return { version: PUBLICATION_STATE_VERSION };
}

export function parsePublicationState(
  value: unknown,
): PublicationState | undefined {
  if (!isRecord(value) || value.version !== PUBLICATION_STATE_VERSION) {
    return undefined;
  }
  if (value.lastSuccess === undefined) {
    return emptyPublicationState();
  }
  const snapshot = parsePublicationSnapshot(value.lastSuccess);
  return snapshot === undefined
    ? undefined
    : { version: PUBLICATION_STATE_VERSION, lastSuccess: snapshot };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
