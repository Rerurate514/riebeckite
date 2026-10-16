import type { PluginComponent } from "@riebeckite/core";
import type { ArticleBacklink } from "../src/backlinks.js";

export type BacklinksProps = {
  backlinks: readonly ArticleBacklink[];
};

const Backlinks = ((props: Readonly<BacklinksProps>) => {
  if (props.backlinks.length === 0) return null;

  return (
    <footer class="rr-backlinks">
      <p class="rr-backlinks__eyebrow">Backlinks</p>
      <ul class="rr-backlinks__list">
        {props.backlinks.map((backlink) => (
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
