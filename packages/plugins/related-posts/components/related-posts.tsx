import type { PluginComponent } from "@riebeckite/core";
import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "../src/types.js";

export type RelatedPostsProps = {
  entries: readonly RelatedPostsEntry[];
  options: ResolvedRelatedPostsOptions;
};

const RelatedPosts = ((props: Readonly<RelatedPostsProps>) => {
  if (props.entries.length === 0) return null;

  const { className, heading, headingText } = props.options;

  return (
    <nav class={className} data-related-posts="">
      {heading ? <h2 class={`${className}__heading`}>{headingText}</h2> : null}
      <ul>
        {props.entries.map((entry) => (
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
