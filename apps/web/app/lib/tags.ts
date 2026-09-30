import { slugifyTaxonomyValue } from "@riebeckite/plugin-taxonomy";

export function slugifyTagPath(tag: string): string {
  return slugifyTaxonomyValue(tag);
}

export function buildTagHref(tag: string): string {
  return `/tags/${slugifyTagPath(tag)}`;
}
