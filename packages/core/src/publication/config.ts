/**
 * Publication approval is optional. Every deploy path still plans, validates,
 * and verifies the build artifact; `requireApproval` adds the approval check on
 * top of that single model.
 */
export type PublicationConfig = {
  readonly requireApproval?: boolean;
  /** Project-relative path to the committed approval records. */
  readonly approvalFile?: string;
};

export type ResolvedPublicationConfig = {
  readonly requireApproval: boolean;
  readonly approvalFile: string;
};

export const DEFAULT_PUBLICATION_APPROVAL_FILE = "publication/approvals.json";

export function resolvePublicationConfig(
  config: PublicationConfig | undefined,
): ResolvedPublicationConfig {
  return {
    requireApproval: config?.requireApproval ?? false,
    approvalFile: config?.approvalFile ?? DEFAULT_PUBLICATION_APPROVAL_FILE,
  };
}
