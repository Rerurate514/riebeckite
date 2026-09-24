/** @jsxImportSource hono/jsx */
import type { ArticleBacklink } from "../src/backlinks";

type Props = {
  backlinks: ArticleBacklink[];
};

export default function Backlinks(props: Props) {
  if (props.backlinks.length === 0) return null;

  return (
    <footer class="article-backlinks rr-backlinks max-w-4xl mx-auto px-4">
      <p class="article-backlinks__eyebrow">Backlinks</p>
      <ul class="article-backlinks__list">
        {props.backlinks.map((backlink) => (
          <li class="article-backlinks__item" key={backlink.slug}>
            <a class="article-backlinks__link" href={`/${backlink.slug}`}>
              {backlink.title}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
