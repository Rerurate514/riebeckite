import type { ScaffoldUtilityName } from "./utilities.js";

export type SiteTemplateVariables = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly locale: string;
  readonly externalContent?: boolean;
};

export type SiteTemplateOptions = {
  readonly cloudflareWorkers?: boolean;
  readonly utilities?: readonly ScaffoldUtilityName[];
};

export type SiteTemplateFile = {
  readonly path: string;
  readonly content: string | Uint8Array;
};
