import { ArticleProvider, useArticleContext } from "./context.js";
import { joinClassNames } from "./primitives_theme.js";
import type {
  ArticleBodyProps,
  ArticleContentProps,
  ArticleFooterProps,
  ArticleHeaderProps,
  ArticleLayoutProps,
  ArticleMetaProps,
  ArticleProps,
  SidebarProps,
} from "./primitives_types.js";

export function Article(props: ArticleProps) {
  const article = (
    <article class={joinClassNames("rb-article", props.class, props.className)}>
      {props.children}
    </article>
  );
  if (!props.post) return article;
  return (
    <ArticleProvider entry={props.entry} post={props.post} body={props.body}>
      {article}
    </ArticleProvider>
  );
}

export function ArticleLayout(props: ArticleLayoutProps) {
  return (
    <div
      class={joinClassNames("rb-article-layout", props.class, props.className)}
    >
      {props.children}
    </div>
  );
}

export function ArticleHeader(props: ArticleHeaderProps) {
  const className = joinClassNames(
    "rb-article-header",
    props.class,
    props.className,
  );

  if (props.dangerouslySetInnerHTML !== undefined) {
    return (
      <header
        class={className}
        dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
      />
    );
  }

  return <header class={className}>{props.children}</header>;
}

export function ArticleMeta(props: ArticleMetaProps) {
  return (
    <aside
      class={joinClassNames("rb-article-meta", props.class, props.className)}
      aria-label={props.label ?? "Article metadata"}
    >
      {props.children}
    </aside>
  );
}

export function ArticleContent(props: ArticleContentProps) {
  const className = joinClassNames(
    "rb-article-body",
    props.class,
    props.className,
  );
  return <div class={className}>{props.children}</div>;
}

export function ArticleBody(props: ArticleBodyProps) {
  const article = useArticleContext();
  if (article?.body !== undefined) {
    return (
      <div
        class={joinClassNames(
          "rb-article-content",
          props.class,
          props.className,
        )}
      >
        {article.body}
      </div>
    );
  }
  const html = props.html ?? article?.post.html;
  if (html === undefined) return null;
  return (
    <div
      class={joinClassNames("rb-article-content", props.class, props.className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ArticleFooter(props: ArticleFooterProps) {
  return (
    <footer
      class={joinClassNames("rb-article-footer", props.class, props.className)}
    >
      {props.children}
    </footer>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      class={joinClassNames("rb-sidebar", props.class, props.className)}
      aria-label={props.label}
    >
      {props.children}
    </aside>
  );
}
