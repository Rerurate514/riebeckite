import type { OutputDependency } from "@riebeckite/core";
import type { TaxonomyKind } from "./src/types.js";

export function taxonomyOutputDependencies(term: {
  readonly kind: TaxonomyKind;
  readonly value: string;
}) {
  return [
    term.kind === "tag"
      ? { type: "tag" as const, tag: term.value }
      : { type: "folder" as const, folder: term.value },
  ];
}

export function taxonomyPageOutputDependencies(
  term: { readonly kind: TaxonomyKind; readonly value: string },
  related: boolean,
): readonly OutputDependency[] {
  const relatedDependencies: readonly OutputDependency[] =
    related && term.kind === "tag"
      ? [{ type: "projection", projection: "taxonomy-tags" }]
      : [];
  return [
    ...pageProjectionDependencies,
    ...taxonomyOutputDependencies(term),
    ...relatedDependencies,
  ];
}

export const pageProjectionDependencies: readonly OutputDependency[] = [
  { type: "projection" as const, projection: "navigation" },
  { type: "projection" as const, projection: "recent-posts" },
];
