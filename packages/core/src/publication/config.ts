/**
 * Publication control is off by default. `managed` enables the approval gate
 * for every deploy path, including the plain push workflow.
 */
export type PublicationMode = "direct" | "managed";

export type PublicationConfig = {
  readonly mode?: PublicationMode;
  /** Project-relative path to the committed approval records. */
  readonly approvalFile?: string;
};

export type ResolvedPublicationConfig = {
  readonly mode: PublicationMode;
  readonly approvalFile: string;
};

export const DEFAULT_PUBLICATION_APPROVAL_FILE = "publication/approvals.json";

export function resolvePublicationConfig(
  config: PublicationConfig | undefined,
): ResolvedPublicationConfig {
  return {
    mode: config?.mode ?? "direct",
    approvalFile: config?.approvalFile ?? DEFAULT_PUBLICATION_APPROVAL_FILE,
  };
}

export function publicationWorkflowForMode(
  mode: PublicationMode,
): "direct" | "approved" {
  return mode === "managed" ? "approved" : "direct";
}
