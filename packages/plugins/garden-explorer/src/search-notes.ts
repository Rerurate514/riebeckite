import type { GardenExplorerNote } from "./garden-explorer.js";

type SearchField = "slug" | "title" | "body" | "tags" | "headings";

type SearchMatch = {
  score: number;
};

const FIELD_WEIGHTS: Record<SearchField, number> = {
  slug: 64,
  title: 56,
  tags: 44,
  headings: 32,
  body: 10,
};

export function searchGardenExplorerNotes(
  notes: GardenExplorerNote[],
  query: string,
): GardenExplorerNote[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length === 0) return [];

  return notes
    .map((note) => scoreNote(note, normalizedQuery))
    .filter(
      (result): result is { note: GardenExplorerNote; score: number } =>
        result !== null,
    )
    .sort(
      (a, b) =>
        b.score - a.score || a.note.title.localeCompare(b.note.title, "ja"),
    )
    .map(({ note }) => note);
}

function normalizeSearchQuery(value: string): string {
  return normalizeSearchText(value).replace(/^#+/, "");
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}

function scoreNote(
  note: GardenExplorerNote,
  normalizedQuery: string,
): { note: GardenExplorerNote; score: number } | null {
  const matches = [
    scoreField("title", note.title, normalizedQuery),
    scoreField("slug", note.slug, normalizedQuery),
    ...note.tags.map((tag) => scoreField("tags", tag, normalizedQuery)),
    ...note.headings.map((heading) =>
      scoreField("headings", heading, normalizedQuery),
    ),
    scoreField("body", note.body, normalizedQuery),
  ].filter((match) => match.score > 0);

  if (matches.length === 0) return null;

  return {
    note,
    score: matches.reduce((total, match) => total + match.score, 0),
  };
}

function scoreField(
  field: SearchField,
  value: string,
  normalizedQuery: string,
): SearchMatch {
  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(normalizedQuery);
  const weight = FIELD_WEIGHTS[field];

  if (normalizedValue === normalizedQuery) return { score: weight * 3 };
  if (index !== -1) return { score: weight * (index === 0 ? 2 : 1) };

  const fuzzyScore = scoreFuzzyMatch(normalizedValue, normalizedQuery);
  return { score: fuzzyScore > 0 ? Math.round(weight * fuzzyScore) : 0 };
}

function scoreFuzzyMatch(value: string, query: string): number {
  if (query.length < 2) return 0;

  let valueIndex = 0;
  let matched = 0;
  let gaps = 0;

  for (const queryCharacter of query) {
    const nextIndex = value.indexOf(queryCharacter, valueIndex);
    if (nextIndex === -1) return 0;

    gaps += nextIndex - valueIndex;
    valueIndex = nextIndex + 1;
    matched += 1;
  }

  const coverage = matched / Math.max(value.length, query.length);
  const continuityPenalty = Math.min(gaps / Math.max(value.length, 1), 0.8);
  return Math.max(0, coverage * (1 - continuityPenalty));
}
