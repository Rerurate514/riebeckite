import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import { getDocsNavigation, getDocsPrevNext } from "../src/data.js";
import type { DocsNavigationLink, DocsOptions } from "../src/types.js";

export type DocsPrevNextProps = {
  readonly previous?: DocsNavigationLink;
  readonly next?: DocsNavigationLink;
  readonly language?: string;
};

const DocsPrevNext = (async (props: Readonly<DocsPrevNextProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const options = findDocsOptions(site?.config.plugins);
  const navigation =
    site && article?.entry && options
      ? await getDocsNavigation({
          view: site.view,
          entries: site.manifest.discoverableEntries,
          entrySlug: article.entry.slug,
          options,
        })
      : [];
  const resolved = article?.entry
    ? await getDocsPrevNext({ items: navigation, slug: article.entry.slug })
    : {};
  const previous = props.previous ?? resolved.previous;
  const next = props.next ?? resolved.next;
  const language = props.language ?? article?.entry?.publicLocation.language;
  if (!previous && !next) return html``;
  const labels =
    language === "ja"
      ? { nav: "前後のドキュメント", previous: "前へ", next: "次へ" }
      : {
          nav: "Previous and next docs pages",
          previous: "Previous",
          next: "Next",
        };
  return (
    <nav class="rb-docs-prev-next" aria-label={labels.nav} data-docs-prev-next>
      {previous ? (
        <a
          class="rb-docs-prev-next__link rb-docs-prev-next__link--previous"
          rel="prev"
          href={previous.href}
          data-docs-previous
        >
          <span class="rb-docs-prev-next__label">{labels.previous}</span>
          <span class="rb-docs-prev-next__title">← {previous.title}</span>
        </a>
      ) : (
        <span class="rb-docs-prev-next__spacer" aria-hidden="true" />
      )}
      {next ? (
        <a
          class="rb-docs-prev-next__link rb-docs-prev-next__link--next"
          rel="next"
          href={next.href}
          data-docs-next
        >
          <span class="rb-docs-prev-next__label">{labels.next}</span>
          <span class="rb-docs-prev-next__title">{next.title} →</span>
        </a>
      ) : null}
    </nav>
  );
}) satisfies PluginComponent<DocsPrevNextProps>;

export default DocsPrevNext;

function findDocsOptions(
  plugins: readonly { name: string; options?: unknown }[] | undefined,
): DocsOptions | undefined {
  return plugins?.find((plugin) => plugin.name.startsWith("docs:"))?.options as
    | DocsOptions
    | undefined;
}
