import type { PostFrontmatter } from "../types/post_content.js";
import {
  isPublishable,
  type PublishStrategy,
} from "../types/publish_strategy.js";

export type PublishingVisibility =
  | "public"
  | "unlisted"
  | "draft"
  | "scheduled";

export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
  publishAt?: Date;
};

export type PublishingResolutionOptions = {
  strategy: PublishStrategy;
  buildTime: Date;
};

export function resolvePublishingState(
  frontmatter: PostFrontmatter | undefined,
  options: PublishingResolutionOptions,
): ResolvedPublishingState {
  const explicitVisibility = resolveExplicitVisibility(frontmatter?.visibility);
  const publishAt = resolvePublishAt(frontmatter?.publishAt);

  if (explicitVisibility === "draft")
    return state("draft", false, false, publishAt);
  if (publishAt && publishAt.getTime() > options.buildTime.getTime()) {
    return state("scheduled", false, false, publishAt);
  }
  if (explicitVisibility === "unlisted") {
    return state("unlisted", true, false, publishAt);
  }
  if (explicitVisibility === "public" || publishAt) {
    return state("public", true, true, publishAt);
  }

  const routable = isPublishable(options.strategy, frontmatter);
  return state(routable ? "public" : "draft", routable, routable, publishAt);
}

export function resolvePublishingBuildTime(
  input: Date | string | undefined,
): Date {
  if (input === undefined) return new Date();
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime()))
      throw new Error("Invalid publishing build time.");
    return new Date(input.getTime());
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime()))
    throw new Error("Invalid publishing build time.");
  return parsed;
}

function resolveExplicitVisibility(
  value: unknown,
): PublishingVisibility | undefined {
  if (value === undefined) return undefined;
  if (value === "public" || value === "unlisted" || value === "draft")
    return value;
  throw new Error(
    `Invalid content visibility "${String(value)}". Expected public, unlisted, or draft.`,
  );
}

function resolvePublishAt(value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  if (!(typeof value === "string" || value instanceof Date)) {
    throw new Error("Invalid publishAt. Expected an ISO 8601 date string.");
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid publishAt "${String(value)}". Expected an ISO 8601 date string.`,
    );
  }
  return new Date(parsed.getTime());
}

function state(
  visibility: PublishingVisibility,
  routable: boolean,
  discoverable: boolean,
  publishAt?: Date,
): ResolvedPublishingState {
  return {
    visibility,
    routable,
    discoverable,
    ...(publishAt ? { publishAt } : {}),
  };
}
