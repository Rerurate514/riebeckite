/** @jsxImportSource hono/jsx */

type Children = unknown;

type PrimitiveProps = {
  children?: Children;
  class?: string;
  className?: string;
  dangerouslySetInnerHTML?: { __html: string };
};

type ArticleProps = PrimitiveProps & {
  "data-slot"?: string;
};

type ArticleLayoutProps = PrimitiveProps & {
  aside?: Children;
};

type ArticleContentProps = PrimitiveProps & {
  html?: string;
  "data-slot"?: string;
};

type ArticleMetaProps = PrimitiveProps & {
  label?: string;
};

type SidebarProps = PrimitiveProps & {
  label?: string;
};

export function Article(props: ArticleProps) {
  return (
    <article
      class={joinClassNames(
        "article-shell rb-article prose",
        props.class,
        props.className,
      )}
      data-slot={props["data-slot"] ?? "article"}
    >
      {props.children}
    </article>
  );
}

export function ArticleLayout(props: ArticleLayoutProps) {
  return (
    <div
      class={joinClassNames(
        "article-shell__layout rb-article-layout",
        props.class,
        props.className,
      )}
    >
      {props.children}
      {props.aside}
    </div>
  );
}

export function ArticleHeader(props: PrimitiveProps) {
  return (
    <header
      class={joinClassNames(
        "article-shell__lead rb-article-header",
        props.class,
        props.className,
      )}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    >
      {props.dangerouslySetInnerHTML ? undefined : props.children}
    </header>
  );
}

export function ArticleMeta(props: ArticleMetaProps) {
  return (
    <aside
      class={joinClassNames(
        "article-frontmatter rb-article-meta",
        props.class,
        props.className,
      )}
      aria-label={props.label ?? "Article metadata"}
    >
      {props.children}
    </aside>
  );
}

export function ArticleContent(props: ArticleContentProps) {
  return (
    <div
      class={joinClassNames(
        "article-shell__body rb-article-body",
        props.class,
        props.className,
      )}
      data-slot={props["data-slot"] ?? "article-body"}
      dangerouslySetInnerHTML={props.html ? { __html: props.html } : undefined}
    >
      {props.html ? undefined : props.children}
    </div>
  );
}

export function ArticleFooter(props: PrimitiveProps) {
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

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
