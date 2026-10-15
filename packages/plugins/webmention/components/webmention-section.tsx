import type { PluginComponent } from "@riebeckite/core";
import type { WebmentionMention } from "../src/mention.js";

export type WebmentionSectionProps = {
  readonly mentions: readonly WebmentionMention[];
  readonly heading?: string;
  readonly className?: string;
};

const WebmentionSection = (({
  mentions,
  heading = "Mentions",
  className = "rr-webmention",
}: Readonly<WebmentionSectionProps>) => {
  if (mentions.length === 0) return null;
  return (
    <section
      class={className}
      data-webmention
      data-webmention-count={mentions.length}
    >
      <h2 class={`${className}__heading`}>{heading}</h2>
      <ul class={`${className}__list`}>
        {mentions.map((mention) => (
          <li
            class={`${className}__item ${className}__item--${mention.type}`}
            key={mention.source}
          >
            <a
              class={`${className}__source`}
              href={mention.source}
              rel="nofollow ugc"
            >
              {mention.title ?? mention.author?.name ?? mention.source}
            </a>
            {mention.author?.name && mention.title ? (
              <span class={`${className}__author`}>{mention.author.name}</span>
            ) : null}
            {mention.publishedAt ? (
              <time datetime={mention.publishedAt}>{mention.publishedAt}</time>
            ) : null}
            {mention.excerpt ? (
              <p class={`${className}__excerpt`}>{mention.excerpt}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}) satisfies PluginComponent<WebmentionSectionProps>;

export default WebmentionSection;
