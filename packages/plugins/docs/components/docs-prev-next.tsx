import type { PluginComponent } from "@riebeckite/core";
import type { DocsNavigationLink } from "../src/types.js";

export type DocsPrevNextProps = {
  readonly previous?: DocsNavigationLink;
  readonly next?: DocsNavigationLink;
  readonly language?: string;
};

const DocsPrevNext = (({
  previous,
  next,
  language,
}: Readonly<DocsPrevNextProps>) => {
  if (!previous && !next) return null;
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
