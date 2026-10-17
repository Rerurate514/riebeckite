import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import { resolveRelatedPostsOptions } from "../src/options.js";
import { getRelatedPosts } from "../src/related.js";
import type {
  RelatedPostsEntry,
  RelatedPostsOptions,
  ResolvedRelatedPostsOptions,
} from "../src/types.js";

export type RelatedPostsProps = {
  entries?: readonly RelatedPostsEntry[];
  options?: ResolvedRelatedPostsOptions;
};

const RelatedPosts = (async (props: Readonly<RelatedPostsProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const options =
    props.options ??
    resolveRelatedPostsOptions(findRelatedPostsOptions(site?.config.plugins));
  const entries =
    props.entries ??
    (site && article?.entry
      ? await getRelatedPosts({
          view: site.view,
          entry: article.entry,
          options,
        })
      : undefined);
  return renderRelatedPostsContent(entries ?? [], options);
}) satisfies PluginComponent<RelatedPostsProps>;

export function renderRelatedPostsContent(
  entries: readonly RelatedPostsEntry[],
  options: ResolvedRelatedPostsOptions,
) {
  if (entries.length === 0) return html``;

  const { className, heading, headingText } = options;

  return (
    <nav class={className} data-related-posts="">
      {heading ? <h2 class={`${className}__heading`}>{headingText}</h2> : null}
      <ul>
        {entries.map((entry) => (
          <li class={`${className}__item`} key={entry.slug}>
            <a
              class={`${className}__link`}
              href={entry.permalink}
              data-related-score={entry.score}
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default RelatedPosts;

function findRelatedPostsOptions(
  plugins: readonly { name: string; options?: unknown }[] | undefined,
): RelatedPostsOptions | undefined {
  return plugins?.find((plugin) => plugin.name === "related-posts")?.options as
    | RelatedPostsOptions
    | undefined;
}
