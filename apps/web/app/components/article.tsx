import type { PostContent } from "@riebeckite/core";

export type ArticleBacklink = {
  slug: string;
  title: string;
};

type Props = {
  content: PostContent;
  backlinks?: ArticleBacklink[];
};

export default function Article(props: Props) {
  return (
    <article class="prose">
      <div
        class="max-w-4xl mx-auto px-4"
        dangerouslySetInnerHTML={{ __html: props.content.html ?? "" }}
      />
      <Backlinks backlinks={props.backlinks ?? []} />
    </article>
  );
}

function Backlinks(props: { backlinks: ArticleBacklink[] }) {
  if (props.backlinks.length === 0) return null;

  return (
    <footer class="article-backlinks max-w-4xl mx-auto px-4">
      <p class="article-backlinks__eyebrow">Backlinks</p>
      <h2 class="article-backlinks__title">このノートを参照している記事</h2>
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
