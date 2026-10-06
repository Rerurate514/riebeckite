import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ScaffoldDeployment,
  ScaffoldPresetName,
  ScaffoldSiteMetadata,
  ScaffoldSiteOptions,
} from "../src/scaffold/index.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

test("the deployment domain narrows content to the github-actions variant", () => {
  const options: ScaffoldSiteOptions = {
    targetDirectory: ".",
    deployment: {
      type: "github-actions",
      content: { type: "local" },
    },
  };
  assert.equal(options.deployment?.type, "github-actions");
});

export type ScaffoldSiteOptionsShapeIsPinned = Assert<
  Equal<
    ScaffoldSiteOptions,
    {
      readonly targetDirectory: string;
      readonly name?: string;
      readonly site?: ScaffoldSiteMetadata;
      readonly preset?: ScaffoldPresetName;
      readonly deployment?: ScaffoldDeployment;
      readonly overwrite?: boolean;
    }
  >
>;

type LocalContent = {
  targetDirectory: string;
  deployment: { type: "github-actions"; content: { type: "local" } };
};
export type LocalContentIsAccepted = Assert<
  LocalContent extends ScaffoldSiteOptions ? true : false
>;

type CloudflareWorkers = {
  targetDirectory: string;
  deployment: { type: "cloudflare-workers" };
};
export type CloudflareWorkersIsAccepted = Assert<
  CloudflareWorkers extends ScaffoldSiteOptions ? true : false
>;

type ExternalContent = {
  targetDirectory: string;
  deployment: {
    type: "github-actions";
    content: {
      type: "external";
      contentRepository: string;
      siteRepository: string;
    };
  };
};
export type ExternalContentIsAccepted = Assert<
  ExternalContent extends ScaffoldSiteOptions ? true : false
>;

type MissingContent = {
  targetDirectory: string;
  deployment: { type: "github-actions" };
};
export type MissingContentIsRejected = Assert<
  MissingContent extends ScaffoldSiteOptions ? false : true
>;

type ExternalMissingContentRepository = {
  targetDirectory: string;
  deployment: {
    type: "github-actions";
    content: { type: "external"; siteRepository: string };
  };
};
export type ExternalMissingContentRepositoryIsRejected = Assert<
  ExternalMissingContentRepository extends ScaffoldSiteOptions ? false : true
>;

type ExternalMissingSiteRepository = {
  targetDirectory: string;
  deployment: {
    type: "github-actions";
    content: { type: "external"; contentRepository: string };
  };
};
export type ExternalMissingSiteRepositoryIsRejected = Assert<
  ExternalMissingSiteRepository extends ScaffoldSiteOptions ? false : true
>;

type UnknownDeployment = {
  targetDirectory: string;
  deployment: { type: "external" };
};
export type UnknownDeploymentIsRejected = Assert<
  UnknownDeployment extends ScaffoldSiteOptions ? false : true
>;

type WrongSiteTitle = {
  targetDirectory: string;
  site: { title: number };
};
export type WrongSiteTitleIsRejected = Assert<
  WrongSiteTitle extends ScaffoldSiteOptions ? false : true
>;
