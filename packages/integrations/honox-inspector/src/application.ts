import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";

export type ResolvedHonoxApplication = {
  config: ResolvedRiebeckiteConfig;
  configRoot: string;
  configFile: string;
  appRoot: string;
  contentRoot: string;
};
