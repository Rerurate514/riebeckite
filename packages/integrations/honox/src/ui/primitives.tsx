import type { ContentBodySlot, ContentBodySlots } from "@riebeckite/core";

export type PrimitiveChildren = unknown;

export type PrimitiveProps = {
  children?: PrimitiveChildren;
  class?: string;
  className?: string;
};

export type PrimitiveClassProps = {
  class?: string;
  className?: string;
};

export type ArticleProps = PrimitiveProps & {
  "data-slot"?: string;
};

export type ArticleLayoutProps = PrimitiveProps & {
  /**
   * @deprecated Render aside content as children instead.
   */
  aside?: PrimitiveChildren;
};

export type ArticleHeaderProps =
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML: { __html: string };
      children?: never;
    })
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML?: never;
      children?: PrimitiveChildren;
    });

export type ArticleContentProps =
  | (PrimitiveClassProps & {
      /**
       * @deprecated Render Markdown HTML with `ArticleBody` inside an
       * `ArticleContent` shell instead.
       */
      html: string;
      children?: never;
      "data-slot"?: string;
    })
  | (PrimitiveClassProps & {
      html?: never;
      children?: PrimitiveChildren;
      "data-slot"?: string;
    });

export type ArticleMetaProps = PrimitiveProps & {
  label?: string;
};

export type SidebarProps = PrimitiveProps & {
  label?: string;
};

export type ArticleFooterProps = PrimitiveProps;

export function Article(props: ArticleProps) {
  return (
    <article
      class={joinClassNames("rb-article", props.class, props.className)}
      data-slot={props["data-slot"] ?? "article"}
    >
      {props.children}
    </article>
  );
}

export function ArticleLayout(props: ArticleLayoutProps) {
  return (
    <div
      class={joinClassNames("rb-article-layout", props.class, props.className)}
    >
      {props.children}
      {props.aside}
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

export type ArticleBodyProps = PrimitiveClassProps & {
  html: string;
};

export type ContentSlotProps = PrimitiveClassProps & {
  slots?: ContentBodySlots;
  name: ContentBodySlot;
};

/**
 * Whether a body slot holds renderable content.
 *
 * A slot is absent when its source map is missing, the value is missing, or
 * the value is whitespace-only. This is the same check `ContentSlot` uses.
 */
export function hasSlot(
  slots: ContentBodySlots | undefined,
  name: ContentBodySlot,
): boolean {
  return Boolean(slots?.[name]?.trim());
}

/**
 * Renders a Plugin-provided body slot fragment at the position the Site chose.
 *
 * The Site owns placement; this primitive owns the lookup, empty handling, and
 * HTML injection. It renders nothing when the slot is absent or blank.
 */
export function ContentSlot(props: ContentSlotProps) {
  const html = props.slots?.[props.name];

  if (!html?.trim()) {
    return null;
  }

  return (
    <div
      data-slot={props.name}
      class={joinClassNames(props.class, props.className) || undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders Markdown-produced HTML as the canonical article body.
 *
 * Owns the `.rb-article-content` Stable Hook so Sites never hand-write it.
 */
export function ArticleBody(props: ArticleBodyProps) {
  return (
    <div
      class={joinClassNames("rb-article-content", props.class, props.className)}
      dangerouslySetInnerHTML={{ __html: props.html }}
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

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
