import { type PluginSiteComponent, resolvePlugins } from "@riebeckite/core";
import { useSiteContext } from "@riebeckite/ui";
import {
  DEFAULT_COMMENTS_CLASS_NAME,
  resolveCommentsOptions,
} from "../src/options.js";
import type { CommentsOptions } from "../src/types.js";

export type CommentsSectionProps = {
  readonly className?: string;
};

const CommentsSection = (({
  className = DEFAULT_COMMENTS_CLASS_NAME,
}: Readonly<CommentsSectionProps>) => {
  return (
    <section class={className} data-rr-comments aria-label="Comments">
      <div class="giscus" />
      <noscript>
        <p class="rr-comments__noscript">Comments require JavaScript.</p>
      </noscript>
    </section>
  );
}) satisfies PluginSiteComponent<CommentsSectionProps>;

export default CommentsSection;

export type ArticleCommentsSectionProps = CommentsSectionProps;

export function ArticleCommentsSection(
  props: Readonly<ArticleCommentsSectionProps>,
) {
  const site = useSiteContext();
  if (!site) return [];
  const options = findCommentsOptions(site.config.plugins);
  if (!options) return [];
  const resolved = resolveCommentsOptions(options);
  return <CommentsSection className={props.className ?? resolved.className} />;
}

function findCommentsOptions(
  plugins: readonly { name: string; options?: unknown }[],
): CommentsOptions | undefined {
  return resolvePlugins([...plugins]).find(
    (plugin) => plugin.name === "comments",
  )?.options as CommentsOptions | undefined;
}
