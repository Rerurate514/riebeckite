/**
 * @jsxRuntime automatic
 * @jsxImportSource hono/jsx
 */
import { createRoot } from "hono/jsx/dom/client";
import { normalizeSearchText, type SearchResult } from "./search.js";

export type SearchResultsProps = {
  readonly results: readonly SearchResult[];
  readonly selectedIndex: number;
  readonly query: string;
};

export function SearchResults({
  results,
  selectedIndex,
  query,
}: SearchResultsProps) {
  return (
    <>
      {results.map((result, index) => (
        <SearchResultItem
          key={result.permalink}
          result={result}
          selected={index === selectedIndex}
          query={query}
        />
      ))}
    </>
  );
}

type SearchResultItemProps = {
  readonly result: SearchResult;
  readonly selected: boolean;
  readonly query: string;
};

function SearchResultItem({ result, selected, query }: SearchResultItemProps) {
  return (
    <a
      class="rr-search-result"
      href={result.permalink}
      data-search-result="true"
      role="option"
      aria-selected={selected ? "true" : "false"}
    >
      <p class="rr-search-result__title">
        {result.icon ? (
          <span
            class="rr-search-result__icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: result.icon.html }}
          />
        ) : null}
        <HighlightedText value={result.title} query={query} />
      </p>
      <p class="rr-search-result__meta">
        {[formatDate(result.date), result.slug].filter(Boolean).join(" · ")}
      </p>
      <p class="rr-search-result__excerpt">
        <HighlightedText value={createDisplayExcerpt(result)} query={query} />
      </p>
      {result.tags.length > 0 ? (
        <p class="rr-search-result__tags">
          {result.tags.slice(0, 4).map((tag) => (
            <span key={tag} class="rr-search-result__tag">
              <HighlightedText value={`#${tag}`} query={query} />
            </span>
          ))}
        </p>
      ) : null}
    </a>
  );
}

type HighlightedTextProps = {
  readonly value: string;
  readonly query: string;
};

function HighlightedText({ value, query }: HighlightedTextProps) {
  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(query);

  if (index === -1 || query.length === 0) return <>{value}</>;

  return (
    <>
      {value.slice(0, index)}
      <mark class="rr-search-result__mark">
        {value.slice(index, index + query.length)}
      </mark>
      {value.slice(index + query.length)}
    </>
  );
}

export function mountSearchResults(container: HTMLElement) {
  const root = createRoot(container);
  return {
    render(props: SearchResultsProps) {
      root.render(<SearchResults {...props} />);
    },
    unmount() {
      root.unmount();
    },
  };
}

function createDisplayExcerpt(result: SearchResult): string {
  if (result.match.field !== "body") return result.excerpt;

  const content = result.match.value;
  const start =
    result.match.index === -1 ? 0 : Math.max(result.match.index - 48, 0);
  const end = Math.min(start + 160, content.length);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";

  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
