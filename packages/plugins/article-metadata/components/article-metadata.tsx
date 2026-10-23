import { calculateReadingTime } from "@riebeckite/core";
import { ArticleMeta } from "@riebeckite/honox/ui";
import {
  buildTaxonomyTagHref,
  resolveTaxonomyOptionsFromConfig,
} from "@riebeckite/plugin-taxonomy";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";

export type ArticleMetadataProps = {
  readonly locale?: string;
  readonly labels?: Readonly<{
    published?: string;
    updated?: string;
    read?: string;
    tags?: string;
  }>;
};

export default function ArticleMetadata({
  locale = "en-US",
  labels = {},
}: ArticleMetadataProps) {
  const article = useArticleContext();
  const site = useSiteContext();
  if (!article) return null;

  const tags = normalizeTags(article.post.frontmatter.tags);
  const createdDate = formatDate(
    article.post.frontmatter.published ??
      article.post.frontmatter.date ??
      article.post.frontmatter.created,
    locale,
  );
  const updatedDate = formatDate(article.post.frontmatter.updated, locale);
  const readingTimeMinutes = calculateReadingTime(article.post.html ?? "");
  const taxonomy = site ? resolveTaxonomyOptionsFromConfig(site.config) : null;

  if (
    !createdDate &&
    !updatedDate &&
    !readingTimeMinutes &&
    tags.length === 0
  ) {
    return null;
  }

  return (
    <ArticleMeta class="rr-article-metadata">
      {createdDate ? (
        <time
          class="rr-article-metadata__date"
          dateTime={createdDate.isoDate}
          title={createdDate.fullDate}
        >
          <span class="rr-article-metadata__label">
            {labels.published ?? "PUBLISHED"}
          </span>
          <span>{createdDate.displayDate}</span>
        </time>
      ) : null}
      {updatedDate ? (
        <time
          class="rr-article-metadata__date"
          dateTime={updatedDate.isoDate}
          title={updatedDate.fullDate}
        >
          <span class="rr-article-metadata__label">
            {labels.updated ?? "UPDATED"}
          </span>
          <span>{updatedDate.displayDate}</span>
        </time>
      ) : null}
      {readingTimeMinutes ? (
        <span class="rr-article-metadata__date">
          <span class="rr-article-metadata__label">
            {labels.read ?? "READ"}
          </span>
          <span>{readingTimeMinutes} min</span>
        </span>
      ) : null}
      {tags.length > 0 ? (
        <ul
          class="rr-article-metadata__tags"
          aria-label={labels.tags ?? "Tags"}
        >
          {tags.map((tag) => (
            <li class="rr-article-metadata__tag-item" key={tag}>
              {taxonomy?.tags ? (
                <a
                  class="rr-article-metadata__tag"
                  href={buildTaxonomyTagHref(tag, taxonomy.tagsBasePath)}
                >
                  #{tag}
                </a>
              ) : (
                <span class="rr-article-metadata__tag">#{tag}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </ArticleMeta>
  );
}

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

function formatDate(value: unknown, locale: string): FormattedDate | null {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const isoDate = date.toISOString();
  return {
    isoDate,
    fullDate: isoDate,
    displayDate: new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
  };
}

type FormattedDate = {
  readonly displayDate: string;
  readonly fullDate: string;
  readonly isoDate: string;
};
