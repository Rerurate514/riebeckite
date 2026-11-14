import type { OutputDependency } from "../types/output_dependency.js";
import { isOutputPath, isRecord } from "./content_build_state_guards.js";

export function isOutputDescriptors(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (output) =>
        isRecord(output) &&
        (output.kind === "content" ||
          output.kind === "redirect" ||
          output.kind === "plugin-page" ||
          output.kind === "generated") &&
        isOutputPath(output.path) &&
        typeof output.producer === "string" &&
        Array.isArray(output.dependencies) &&
        output.dependencies.every(isOutputDependency),
    )
  );
}

export function isOutputDependency(value: unknown): value is OutputDependency {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "global" || value.type === "unknown") return true;
  if (value.type === "content-query") {
    return (
      Array.isArray(value.properties) &&
      value.properties.every((property) => typeof property === "string") &&
      (value.unknown === undefined || typeof value.unknown === "boolean")
    );
  }
  return (
    (value.type === "content" && typeof value.slug === "string") ||
    (value.type === "tag" && typeof value.tag === "string") ||
    (value.type === "folder" && typeof value.folder === "string") ||
    (value.type === "file" && typeof value.path === "string") ||
    (value.type === "public-location" && typeof value.pathname === "string") ||
    (value.type === "external" && typeof value.id === "string") ||
    (value.type === "derived-view" &&
      typeof value.id === "string" &&
      typeof value.version === "string") ||
    (value.type === "derived-query" &&
      typeof value.id === "string" &&
      typeof value.fingerprint === "string") ||
    (value.type === "projection" &&
      (value.projection === "navigation" ||
        value.projection === "recent-posts" ||
        value.projection === "taxonomy-tags" ||
        value.projection === "taxonomy-folders"))
  );
}

export function isExternalDependencies(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (dependency) =>
        isRecord(dependency) &&
        typeof dependency.id === "string" &&
        dependency.id.length > 0 &&
        typeof dependency.fingerprint === "string" &&
        dependency.fingerprint.length > 0 &&
        isExternalScope(dependency.scope) &&
        (dependency.expiresAt === undefined ||
          (typeof dependency.expiresAt === "string" &&
            !Number.isNaN(Date.parse(dependency.expiresAt)))),
    )
  );
}

export function isExternalScope(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "content" || value.type === "all") return true;
  return (
    value.type === "output" &&
    Array.isArray(value.paths) &&
    value.paths.every((path) => isOutputPath(path))
  );
}
