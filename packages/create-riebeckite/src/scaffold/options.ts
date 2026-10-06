import type { ScaffoldPresetName } from "./presets.js";
import type { ScaffoldUtilityName } from "./utilities.js";

export type ScaffoldSiteMetadata = {
  readonly title?: string;
  readonly description?: string;
  readonly baseUrl?: string;
  readonly locale?: string;
};

export type ScaffoldContentSource =
  | { readonly type: "local" }
  | {
      readonly type: "external";
      readonly contentRepository: string;
      readonly siteRepository: string;
    };

export type ScaffoldDeployment =
  | { readonly type: "none" }
  | { readonly type: "cloudflare-workers" }
  | {
      readonly type: "github-actions";
      readonly content: ScaffoldContentSource;
    };

export type ScaffoldSiteOptions = {
  readonly targetDirectory: string;
  readonly name?: string;
  readonly site?: ScaffoldSiteMetadata;
  readonly preset?: ScaffoldPresetName;
  readonly utilities?: readonly ScaffoldUtilityName[];
  readonly deployment?: ScaffoldDeployment;
  readonly overwrite?: boolean;
};

export type ScaffoldSiteResult = {
  readonly targetDirectory: string;
  readonly files: readonly string[];
};

export type ScaffoldDeploymentFlags = {
  readonly githubActions?: boolean;
  readonly cloudflareWorkers?: boolean;
  readonly contentRepository?: string;
  readonly siteRepository?: string;
};

export class ScaffoldSiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldSiteError";
  }
}
