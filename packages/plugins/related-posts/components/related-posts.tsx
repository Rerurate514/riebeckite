import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { getRelatedPosts } from "../src/related.js";
import { resolveRelatedPostsOptions } from "../src/options.js";
import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "../src/types.js";

export type RelatedPostsProps = {
  entries?: readonly RelatedPostsEntry[];
  options?: ResolvedRelatedPostsOptions;
};

const RelatedPosts = (async (props: Readonly<RelatedPostsProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const options = props.options ?? resolveRelatedPostsOptions({});
  const entries =
    props.entries ??
    (site && article?.entry
      ? await getRelatedPosts({ view: site.view, entry: article.entry, options })
      : undefined);
  if (!entries || entries.length === 0) return null;

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
}) satisfies PluginComponent<RelatedPostsProps>;

export default RelatedPosts;
