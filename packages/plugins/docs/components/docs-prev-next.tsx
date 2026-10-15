import type { PluginComponent } from "@riebeckite/core";
import type { DocsNavigationLink } from "../src/types.js";

export type DocsPrevNextProps = {
  readonly previous?: DocsNavigationLink;
  readonly next?: DocsNavigationLink;
};

const DocsPrevNext = (({ previous, next }: Readonly<DocsPrevNextProps>) => {
  if (!previous && !next) return null;
  return (
    <nav class="rr-docs-prev-next" aria-label="Documentation navigation">
      {previous ? (
        <a rel="prev" href={previous.href}>
          {previous.title}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a rel="next" href={next.href}>
          {next.title}
        </a>
      ) : null}
    </nav>
  );
}) satisfies PluginComponent<DocsPrevNextProps>;

export default DocsPrevNext;
