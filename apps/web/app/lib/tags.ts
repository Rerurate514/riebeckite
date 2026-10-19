import { slugifyTaxonomyValue } from "@riebeckite/plugin-taxonomy";

export function buildTagHref(tag: string): string {
  return `/tags/${slugifyTaxonomyValue(tag)}`;
}
