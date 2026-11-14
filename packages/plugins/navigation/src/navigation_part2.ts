import type { ConfigValidationIssue } from "@riebeckite/core";
import type { TreeNode } from "./navigation_part1.js";

export function createTreeNode(segment: string, path: string): TreeNode {
  return { segment, path, indexes: [], children: new Map() };
}

export function titleFromSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
}

export function validateItems(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
  ancestors: Set<object>,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: "Expected an object." });
      continue;
    }
    if (ancestors.has(item)) {
      issues.push({
        path: itemPath,
        message: "Navigation children must not be recursive.",
      });
      continue;
    }

    if (typeof item.label !== "string" || item.label.trim() === "") {
      issues.push({
        path: `${itemPath}.label`,
        message: "Expected a non-empty string.",
      });
    }
    if (typeof item.href !== "string" || item.href.trim() === "") {
      issues.push({
        path: `${itemPath}.href`,
        message: "Expected a non-empty string.",
      });
    }
    if (item.external !== undefined && typeof item.external !== "boolean") {
      issues.push({
        path: `${itemPath}.external`,
        message: "Expected a boolean.",
      });
    }
    if (item.children !== undefined) {
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(item);
      validateItems(
        item.children,
        `${itemPath}.children`,
        issues,
        nextAncestors,
      );
    }
  }
}

export function validateExcludedSlugs(
  value: unknown,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path: "exclude", message: "Expected an array." });
    return;
  }
  for (const [index, slug] of value.entries()) {
    if (typeof slug !== "string" || slug.trim() === "") {
      issues.push({
        path: `exclude[${index}]`,
        message: "Expected a non-empty string.",
      });
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
