import type { ContentPublicLocation, PostFrontmatter } from "@riebeckite/core";
import type { ResolverContent } from "./permalink_types.js";

export function assertNoCollisions(
  locations: readonly ContentPublicLocation[],
  contents: readonly ResolverContent[],
): void {
  const bySlug = new Map(contents.map((content) => [content.slug, content]));
  const ids = new Map<string, ContentPublicLocation>();
  const paths = new Map<
    string,
    { location: ContentPublicLocation; kind: "canonical" | "redirect" }
  >();
  for (const location of locations) {
    const id = location.metadata?.id;
    if (id) assertUnique(ids, id, location, bySlug, "Permalink ID collision");
    assertPathUnique(paths, location.permalink, location, "canonical", bySlug);
    for (const redirect of location.redirects ?? []) {
      assertPathUnique(paths, redirect.path, location, "redirect", bySlug);
    }
  }
}

export function assertUnique(
  values: Map<string, ContentPublicLocation>,
  key: string,
  next: ContentPublicLocation,
  contents: Map<string, ResolverContent>,
  heading: string,
): void {
  const previous = values.get(key);
  if (previous)
    throw collisionError(heading, key, previous, next, contents, "ID", "ID");
  values.set(key, next);
}

export function assertPathUnique(
  values: Map<
    string,
    { location: ContentPublicLocation; kind: "canonical" | "redirect" }
  >,
  key: string,
  next: ContentPublicLocation,
  kind: "canonical" | "redirect",
  contents: Map<string, ResolverContent>,
): void {
  const previous = values.get(key);
  if (previous)
    throw collisionError(
      "Permalink URL collision",
      key,
      previous.location,
      next,
      contents,
      previous.kind,
      kind,
    );
  values.set(key, { location: next, kind });
}

export function collisionError(
  heading: string,
  key: string,
  first: ContentPublicLocation,
  second: ContentPublicLocation,
  contents: Map<string, ResolverContent>,
  firstKind: string,
  secondKind: string,
): Error {
  return new Error(
    `${heading}: ${key}\n\n- ${contents.get(first.slug)?.path ?? first.slug} (${firstKind})\n- ${contents.get(second.slug)?.path ?? second.slug} (${secondKind})`,
  );
}

export function hasFrontmatterId(
  frontmatter: PostFrontmatter,
  field: string,
): boolean {
  return (
    typeof frontmatter[field] === "string" &&
    frontmatter[field].trim().length > 0
  );
}
