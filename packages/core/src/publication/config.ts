/**
 * Publication approval is optional. Every deploy path still plans, validates,
 * and verifies the build artifact; `requireApproval` adds the approval check on
 * top of that single model.
 */
export type PublicationScheduleConfig = {
  readonly enabled?: boolean;
  readonly intervalMinutes?: number;
};

export type PublicationConfig = {
  readonly requireApproval?: boolean;
  /** Project-relative path to the committed approval records. */
  readonly approvalFile?: string;
  readonly schedule?: PublicationScheduleConfig;
};

export type ResolvedPublicationScheduleConfig = {
  readonly enabled: boolean;
  readonly intervalMinutes: number;
};

export type ResolvedPublicationConfig = {
  readonly requireApproval: boolean;
  readonly approvalFile: string;
  readonly schedule: ResolvedPublicationScheduleConfig;
};

export const DEFAULT_PUBLICATION_APPROVAL_FILE = "publication/approvals.json";
export const DEFAULT_PUBLICATION_SCHEDULE_INTERVAL = 15;

export function resolvePublicationConfig(
  config: PublicationConfig | undefined,
): ResolvedPublicationConfig {
  return {
    requireApproval: config?.requireApproval ?? false,
    approvalFile: config?.approvalFile ?? DEFAULT_PUBLICATION_APPROVAL_FILE,
    schedule: {
      enabled: config?.schedule?.enabled ?? false,
      intervalMinutes:
        config?.schedule?.intervalMinutes ??
        DEFAULT_PUBLICATION_SCHEDULE_INTERVAL,
    },
  };
}
