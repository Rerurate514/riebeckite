export type SearchItem = {
  slug: string;
  title: string;
  headings: string[];
  body: string;
  excerpt: string;
  tags: string[];
  date: string | null;
};

export type SearchField = keyof Pick<
  SearchItem,
  "slug" | "title" | "body" | "tags" | "headings"
>;

export type SearchMatch = {
  field: SearchField;
  value: string;
  score: number;
  index: number;
};

export type SearchResult<T extends SearchItem = SearchItem> = T & {
  score: number;
  match: SearchMatch;
};

const FIELD_WEIGHTS: Record<SearchField, number> = {
  slug: 64,
  title: 56,
  tags: 44,
  headings: 32,
  body: 10,
};

export function searchItems<T extends SearchItem>(
  items: T[],
  query: string,
): SearchResult<T>[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length === 0) return [];

  return items
    .map((item) => scoreSearchItem(item, normalizedQuery))
    .filter((result): result is SearchResult<T> => result !== null)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"));
}

export function normalizeSearchQuery(value: string): string {
  return normalizeSearchText(value).replace(/^#+/, "");
}

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}

function scoreSearchItem<T extends SearchItem>(
  item: T,
  normalizedQuery: string,
): SearchResult<T> | null {
  const values: SearchMatch[] = [
    scoreField("title", item.title, normalizedQuery),
    scoreField("slug", item.slug, normalizedQuery),
    ...item.tags.map((tag) => scoreField("tags", tag, normalizedQuery)),
    ...item.headings.map((heading) =>
      scoreField("headings", heading, normalizedQuery),
    ),
    scoreField("body", item.body, normalizedQuery),
  ].filter((match): match is SearchMatch => match.score > 0);

  if (values.length === 0) return null;

  const best = values.sort((a, b) => b.score - a.score)[0];
  const score = values.reduce((sum, match) => sum + match.score, 0);

  return { ...item, score, match: best };
}

function scoreField(
  field: SearchMatch["field"],
  value: string,
  normalizedQuery: string,
): SearchMatch {
  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(normalizedQuery);
  const weight = FIELD_WEIGHTS[field];

  if (normalizedValue === normalizedQuery) {
    return { field, value, score: weight * 3, index: 0 };
  }
  if (index !== -1) {
    return { field, value, score: weight * (index === 0 ? 2 : 1), index };
  }

  const fuzzyScore = scoreFuzzyMatch(normalizedValue, normalizedQuery);
  return {
    field,
    value,
    score: fuzzyScore > 0 ? Math.round(weight * fuzzyScore) : 0,
    index: -1,
  };
}

function scoreFuzzyMatch(value: string, query: string): number {
  if (query.length < 2) return 0;

  let valueIndex = 0;
  let matched = 0;
  let gaps = 0;

  for (const queryChar of query) {
    const nextIndex = value.indexOf(queryChar, valueIndex);
    if (nextIndex === -1) return 0;

    gaps += nextIndex - valueIndex;
    valueIndex = nextIndex + 1;
    matched += 1;
  }

  const coverage = matched / Math.max(value.length, query.length);
  const continuityPenalty = Math.min(gaps / Math.max(value.length, 1), 0.8);
  return Math.max(0, coverage * (1 - continuityPenalty));
}
