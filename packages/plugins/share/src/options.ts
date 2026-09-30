import type { ConfigValidationIssue } from "@riebeckite/core";
import { normalizeMastodonInstance } from "./services.js";
import {
  type ResolvedShareOptions,
  SHARE_SERVICES,
  type ShareOptions,
  type SharePlacement,
  type ShareService,
} from "./types.js";

/** Services rendered when `services` is omitted. Mastodon is opt-in. */
export const DEFAULT_SHARE_SERVICES: readonly ShareService[] = [
  "x",
  "bluesky",
  "facebook",
  "linkedin",
  "hatena",
  "copy",
];

export const DEFAULT_SHARE_LABELS: Readonly<Record<ShareService, string>> = {
  x: "X",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  hatena: "Hatena Bookmark",
  copy: "Copy link",
};

export const DEFAULT_SHARE_PLACEMENT: SharePlacement = "bottom";
export const DEFAULT_SHARE_ARIA_LABEL = "Share";
export const DEFAULT_SHARE_COPIED_LABEL = "Copied";
export const DEFAULT_SHARE_COPY_FAILED_LABEL = "Copy failed";

/**
 * Applies defaults to `ShareOptions`. Pure and deterministic so the plugin can
 * resolve options once and reuse them for every manifest entry.
 */
export function resolveShareOptions(
  options: ShareOptions = {},
): ResolvedShareOptions {
  return {
    services: normalizeServices(options.services),
    placement: options.placement === "top" ? "top" : DEFAULT_SHARE_PLACEMENT,
    mastodonInstance: normalizeMastodonInstance(options.mastodonInstance),
    className: normalizeNonEmpty(options.className, ""),
    ariaLabel: normalizeNonEmpty(options.ariaLabel, DEFAULT_SHARE_ARIA_LABEL),
    labels: { ...DEFAULT_SHARE_LABELS, ...sanitizeLabels(options.labels) },
    copiedLabel: normalizeNonEmpty(
      options.copiedLabel,
      DEFAULT_SHARE_COPIED_LABEL,
    ),
    copyFailedLabel: normalizeNonEmpty(
      options.copyFailedLabel,
      DEFAULT_SHARE_COPY_FAILED_LABEL,
    ),
  };
}

export function validateShareOptions(
  options: ShareOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  const mastodonEnabled =
    Array.isArray(options.services) &&
    (options.services as readonly string[]).includes("mastodon");

  if (options.services !== undefined) {
    if (!Array.isArray(options.services)) {
      issues.push({
        path: "services",
        message: "Expected an array of service names.",
      });
    } else {
      for (const [index, service] of options.services.entries()) {
        if (!(SHARE_SERVICES as readonly string[]).includes(service)) {
          issues.push({
            path: `services[${index}]`,
            message: `Expected one of: ${SHARE_SERVICES.join(", ")}.`,
          });
        }
      }
    }
  }

  if (mastodonEnabled) {
    if (normalizeMastodonInstance(options.mastodonInstance) === "") {
      issues.push({
        path: "mastodonInstance",
        message: 'Required when "mastodon" is enabled in services.',
      });
    }
  } else if (
    options.mastodonInstance !== undefined &&
    (typeof options.mastodonInstance !== "string" ||
      options.mastodonInstance.trim() === "")
  ) {
    issues.push({
      path: "mastodonInstance",
      message: "Expected a non-empty string.",
    });
  }

  if (
    options.placement !== undefined &&
    options.placement !== "top" &&
    options.placement !== "bottom"
  ) {
    issues.push({
      path: "placement",
      message: 'Expected "top" or "bottom".',
    });
  }

  for (const key of [
    "className",
    "ariaLabel",
    "copiedLabel",
    "copyFailedLabel",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (options.labels !== undefined) {
    if (
      typeof options.labels !== "object" ||
      options.labels === null ||
      Array.isArray(options.labels)
    ) {
      issues.push({
        path: "labels",
        message: "Expected an object mapping service names to labels.",
      });
    } else {
      for (const [key, value] of Object.entries(options.labels)) {
        if (!(SHARE_SERVICES as readonly string[]).includes(key)) {
          issues.push({
            path: `labels.${key}`,
            message: `Unknown service. Expected one of: ${SHARE_SERVICES.join(", ")}.`,
          });
        } else if (typeof value !== "string" || value.trim() === "") {
          issues.push({
            path: `labels.${key}`,
            message: "Expected a non-empty string.",
          });
        }
      }
    }
  }

  return issues;
}

function normalizeServices(
  services: readonly ShareService[] | undefined,
): readonly ShareService[] {
  const source = services ?? DEFAULT_SHARE_SERVICES;
  const seen = new Set<ShareService>();
  const resolved: ShareService[] = [];
  for (const service of source) {
    if (!(SHARE_SERVICES as readonly string[]).includes(service)) continue;
    if (seen.has(service)) continue;
    seen.add(service);
    resolved.push(service);
  }
  return resolved;
}

function sanitizeLabels(
  labels: Partial<Record<ShareService, string>> | undefined,
): Partial<Record<ShareService, string>> {
  if (!labels || typeof labels !== "object") return {};
  const resolved: Partial<Record<ShareService, string>> = {};
  for (const service of SHARE_SERVICES) {
    const value = labels[service];
    if (typeof value === "string" && value.trim() !== "") {
      resolved[service] = value.trim();
    }
  }
  return resolved;
}

function normalizeNonEmpty(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
