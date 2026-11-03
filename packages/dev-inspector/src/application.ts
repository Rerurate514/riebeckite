import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";

export type ResolvedInspectorApplication = {
  config: ResolvedRiebeckiteConfig;
  configRoot: string;
  configFile: string;
  appRoot: string;
  contentRoot: string;
};
