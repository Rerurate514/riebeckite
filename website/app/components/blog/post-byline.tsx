type Props = {
  readonly frontmatter: Record<string, unknown>;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Category and author line shown between a blog post's title and its dates. */
export function PostByline({ frontmatter }: Props) {
  const category = asString(frontmatter.category);
  const author = asString(frontmatter.author);
  if (!category && !author) return null;

  return (
    <p class="rb-blog-byline">
      {category ? (
        <span class="rb-blog-byline__category">{category}</span>
      ) : null}
      {category && author ? (
        <span class="rb-blog-byline__sep" aria-hidden="true">
          ·
        </span>
      ) : null}
      {author ? <span class="rb-blog-byline__author">{author}</span> : null}
    </p>
  );
}
