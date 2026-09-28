import type { ConfigValidationIssue } from "@riebeckite/core";
import {
  resolveOntology,
  type ResolvedOntology,
} from "./ontology.js";
import type {
  ExcaliBrainOntology,
  ExcaliBrainOptions,
  ExcaliBrainRenderMode,
} from "./types.js";

export type ResolvedExcaliBrainOptions = {
  render: ExcaliBrainRenderMode;
  auto: boolean;
  heading: boolean;
  headingText: string;
  className: string;
  maxPerRegion: number;
  infer: boolean;
  siblings: boolean;
  ontology: ResolvedOntology;
  showHidden: boolean;
  width: number;
  height: number;
  language: string;
};

export function resolveExcaliBrainOptions(
  options: ExcaliBrainOptions = {},
): ResolvedExcaliBrainOptions {
  return {
    render: options.render ?? "build",
    auto: options.auto ?? true,
    heading: options.heading ?? true,
    headingText: options.headingText ?? "ExcaliBrain",
    className: options.className ?? "rb-excalibrain",
    maxPerRegion: options.maxPerRegion ?? 8,
    infer: options.infer ?? true,
    siblings: options.siblings ?? true,
    ontology: resolveOntology(options.ontology),
    showHidden: options.showHidden ?? false,
    width: options.width ?? 720,
    height: options.height ?? 480,
    language: options.language ?? "excalibrain",
  };
}

export function validateExcaliBrainOptions(
  options: ExcaliBrainOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (options.render !== undefined && !isRenderMode(options.render)) {
    issues.push({
      path: "render",
      message: 'Expected "build", "client", or "both".',
    });
  }

  for (const key of ["auto", "heading", "infer", "siblings", "showHidden"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  for (const key of ["headingText", "className", "language"] as const) {
    if (
      options[key] !== undefined &&
      (typeof options[key] !== "string" || options[key].trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (
    options.maxPerRegion !== undefined &&
    (!Number.isInteger(options.maxPerRegion) || options.maxPerRegion < 0)
  ) {
    issues.push({
      path: "maxPerRegion",
      message: "Expected a non-negative integer.",
    });
  }

  for (const key of ["width", "height"] as const) {
    if (
      options[key] !== undefined &&
      (!Number.isFinite(options[key]) || options[key] <= 0)
    ) {
      issues.push({ path: key, message: "Expected a positive number." });
    }
  }

  if (options.ontology !== undefined && !isOntology(options.ontology)) {
    issues.push({
      path: "ontology",
      message: "Expected an object of field-name arrays.",
    });
  }

  return issues;
}

function isRenderMode(value: unknown): value is ExcaliBrainRenderMode {
  return value === "build" || value === "client" || value === "both";
}

function isOntology(value: unknown): value is ExcaliBrainOntology {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (fields) =>
      fields === undefined ||
      (Array.isArray(fields) &&
        fields.every((field) => typeof field === "string")),
  );
}
