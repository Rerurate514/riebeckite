/** @jsxImportSource hono/jsx */

type Children = unknown;

type PrimitiveProps = {
  children?: Children;
  class?: string;
  className?: string;
};

type PrimitiveClassProps = {
  class?: string;
  className?: string;
};

type ArticleProps = PrimitiveProps & {
  "data-slot"?: string;
};

type ArticleLayoutProps = PrimitiveProps & {
  aside?: Children;
};

type ArticleHeaderProps =
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML: { __html: string };
      children?: never;
    })
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML?: never;
      children?: Children;
    });

type ArticleContentProps =
  | (PrimitiveClassProps & {
      html: string;
      children?: never;
      "data-slot"?: string;
    })
  | (PrimitiveClassProps & {
      html?: never;
      children?: Children;
      "data-slot"?: string;
    });

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

export function ArticleHeader(props: ArticleHeaderProps) {
  const className = joinClassNames(
    "article-shell__lead rb-article-header",
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
  const className = joinClassNames(
    "article-shell__body rb-article-body",
    props.class,
    props.className,
  );
  const dataSlot = props["data-slot"] ?? "article-body";

  if (props.html !== undefined) {
    return (
      <div
        class={className}
        data-slot={dataSlot}
        dangerouslySetInnerHTML={{ __html: props.html }}
      />
    );
  }

  return (
    <div class={className} data-slot={dataSlot}>
      {props.children}
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
