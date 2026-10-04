import type {
  RelatedPostsEntry,
  ResolvedRelatedPostsOptions,
} from "../src/types.js";

type Props = {
  entries: readonly RelatedPostsEntry[];
  options: ResolvedRelatedPostsOptions;
};

export default function RelatedPosts(props: Props) {
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
}
