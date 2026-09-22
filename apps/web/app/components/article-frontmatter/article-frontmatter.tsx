import type { PostFrontmatter } from "@riebeckite/core";
import { buildTagHref } from "../../lib/tags";

type Props = {
  frontmatter: PostFrontmatter;
};

export default function ArticleFrontmatter(props: Props) {
  const tags = normalizeTags(props.frontmatter.tags);
  const createdDate = formatFrontmatterDate(
    props.frontmatter.created ?? props.frontmatter.date,
  );

  if (!createdDate && tags.length === 0) return null;

  return (
    <aside class="article-frontmatter" aria-label="Article metadata">
      {createdDate && (
        <time
          class="article-frontmatter__date"
          dateTime={createdDate.isoDate}
          title={createdDate.fullDate}
        >
          <span class="article-frontmatter__label">CREATED</span>
          <span>{createdDate.displayDate}</span>
        </time>
      )}
      {tags.length > 0 && (
        <ul class="article-frontmatter__tags" aria-label="Tags">
          {tags.map((tag) => (
            <li class="article-frontmatter__tag-item" key={tag}>
              <a class="article-frontmatter__tag" href={buildTagHref(tag)}>
                #{tag}
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

type FormattedDate = {
  displayDate: string;
  fullDate: string;
  isoDate: string;
};

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function formatFrontmatterDate(value: unknown): FormattedDate | null {
  if (value instanceof Date) return formatDate(value);
  if (typeof value !== "string") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDate(date);
}

function formatDate(date: Date): FormattedDate {
  const isoDate = date.toISOString();
  const displayDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return {
    displayDate,
    fullDate: isoDate,
    isoDate,
  };
}
