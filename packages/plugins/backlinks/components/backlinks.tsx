import type { ArticleBacklink } from "../src/backlinks.js";

type Props = {
  backlinks: ArticleBacklink[];
};

export default function Backlinks(props: Props) {
  if (props.backlinks.length === 0) return null;

  return (
    <footer class="rr-backlinks max-w-4xl mx-auto px-4">
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
}
