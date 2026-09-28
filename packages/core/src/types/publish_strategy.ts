export type PublishStrategy = "explicit" | "selective";

/**
 * The frontmatter fields that decide publication. Notes, diagnostics, and
 * build tooling all share this shape so the publish decision is applied
 * consistently.
 */
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};

/**
 * Single source of truth for the publish decision.
 *
 * - `explicit`: only notes opted in with `publish: true` are public.
 * - `selective`: notes are public unless opted out with `private: true` or
 *   `draft: true`.
 */
export function isPublishable(
  strategy: PublishStrategy,
  frontmatter: PublishFrontmatter | undefined,
): boolean {
  if (strategy === "explicit") {
    return frontmatter?.publish === true;
  }
  return !(frontmatter?.private === true || frontmatter?.draft === true);
}
