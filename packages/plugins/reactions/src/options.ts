import type { ConfigValidationIssue } from "@riebeckite/core";
import { MemoryReactionsProvider, type ReactionsProvider } from "./provider.js";
import {
  DEFAULT_REACTIONS,
  REACTION_TYPES,
  type ReactionEmoji,
  type ReactionsOptions,
  type ReactionType,
  type ResolvedReactionsOptions,
} from "./types.js";

export const DEFAULT_REACTIONS_CLASS_NAME = "rr-reactions";
export const DEFAULT_REACTIONS_ARIA_LABEL = "Reactions";

export function resolveReactionsOptions(
  options: ReactionsOptions = {},
): ResolvedReactionsOptions {
  return {
    provider: options.provider ?? new MemoryReactionsProvider(),
    reactions: resolveReactionEmojis(options.reactions),
    className: normalizeNonEmpty(
      options.className,
      DEFAULT_REACTIONS_CLASS_NAME,
    ),
    ariaLabel: normalizeNonEmpty(
      options.ariaLabel,
      DEFAULT_REACTIONS_ARIA_LABEL,
    ),
  };
}

export function validateReactionsOptions(
  options: ReactionsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];

  if (
    options.provider !== undefined &&
    !isReactionsProvider(options.provider)
  ) {
    issues.push({
      path: "provider",
      message:
        "Expected a reactions provider with capabilities, getReactions, addReaction, and removeReaction.",
    });
  }

  if (options.reactions !== undefined) {
    if (!Array.isArray(options.reactions)) {
      issues.push({
        path: "reactions",
        message: "Expected an array of reaction types.",
      });
    } else {
      for (const [index, type] of options.reactions.entries()) {
        if (!(REACTION_TYPES as readonly string[]).includes(type)) {
          issues.push({
            path: `reactions[${index}]`,
            message: `Expected one of: ${REACTION_TYPES.join(", ")}.`,
          });
        }
      }
    }
  }

  for (const key of ["className", "ariaLabel"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  return issues;
}

function resolveReactionEmojis(
  types: readonly ReactionType[] | undefined,
): readonly ReactionEmoji[] {
  if (!types || types.length === 0) return DEFAULT_REACTIONS;
  const seen = new Set<ReactionType>();
  const resolved: ReactionEmoji[] = [];
  for (const type of types) {
    if (seen.has(type)) continue;
    seen.add(type);
    const emoji = DEFAULT_REACTIONS.find((r) => r.type === type);
    if (emoji) resolved.push(emoji);
  }
  return resolved.length > 0 ? resolved : DEFAULT_REACTIONS;
}

function isReactionsProvider(value: unknown): value is ReactionsProvider {
  if (!value || typeof value !== "object") return false;
  const provider = value as Record<string, unknown>;
  return (
    provider.capabilities instanceof Set &&
    typeof provider.getReactions === "function" &&
    typeof provider.addReaction === "function" &&
    typeof provider.removeReaction === "function"
  );
}

function normalizeNonEmpty(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}
