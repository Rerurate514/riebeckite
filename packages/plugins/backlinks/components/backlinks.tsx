import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import type { ArticleBacklink } from "../src/backlinks.js";
import { getBacklinks } from "../src/backlinks.server.js";

export type BacklinksProps = {
  backlinks?: readonly ArticleBacklink[];
};

const Backlinks = (async (props: Readonly<BacklinksProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const backlinks =
    props.backlinks ??
    (site && article?.entry
      ? await getBacklinks({ view: site.view, slug: article.entry.slug })
      : undefined);
  if (!backlinks || backlinks.length === 0) return [];

  return (
    <footer class="rr-backlinks">
      <p class="rr-backlinks__eyebrow">Backlinks</p>
      <ul class="rr-backlinks__list">
        {backlinks.map((backlink) => (
          <li class="rr-backlinks__item" key={backlink.slug}>
            <a class="rr-backlinks__link" href={backlink.permalink}>
              {backlink.title}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}) satisfies PluginComponent<BacklinksProps>;

export default Backlinks;
