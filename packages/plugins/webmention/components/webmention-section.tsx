import { type PluginComponent, resolvePlugins } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import type { WebmentionMention } from "../src/mention.js";
import type { WebmentionProvider } from "../src/provider.js";
import { getWebmentionSectionData } from "../src/server.js";

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

export type ArticleWebmentionSectionProps = Omit<
  WebmentionSectionProps,
  "mentions"
>;

export async function ArticleWebmentionSection(
  props: Readonly<ArticleWebmentionSectionProps>,
) {
  const site = useSiteContext();
  const article = useArticleContext();
  if (!site || !article?.entry) return [];
  const provider = findProvider(site.config.plugins);
  if (!provider) return [];
  const data = await getWebmentionSectionData({
    view: site.view,
    slug: article.entry.slug,
    config: site.config,
    provider,
    heading: props.heading,
    className: props.className,
  });
  return <WebmentionSection {...data} />;
}

function findProvider(
  plugins: readonly { name: string; options?: unknown }[],
): WebmentionProvider | undefined {
  const options = resolvePlugins([...plugins]).find(
    (plugin) => plugin.name === "webmention",
  )?.options as { readonly provider?: WebmentionProvider } | undefined;
  return options?.provider;
}
