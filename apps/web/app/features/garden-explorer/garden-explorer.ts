export type GardenExplorerNote = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  folder: string;
  outgoing: string[];
  backlinks: string[];
};

export type GardenExplorerEdge = {
  source: string;
  target: string;
};

export type GardenExplorerTag = {
  name: string;
  count: number;
};

export type GardenExplorerFolder = {
  path: string;
  count: number;
};

export type GardenExplorerData = {
  notes: GardenExplorerNote[];
  edges: GardenExplorerEdge[];
  tags: GardenExplorerTag[];
  folders: GardenExplorerFolder[];
};

type SearchField = "slug" | "title" | "tags" | "body";

export type GardenExplorerSearchResult = GardenExplorerNote & {
  score: number;
};

const FIELD_WEIGHTS: Record<SearchField, number> = {
  slug: 64,
  title: 56,
  tags: 44,
  body: 10,
};

export function searchGardenNotes(
  notes: GardenExplorerNote[],
  query: string,
): GardenExplorerSearchResult[] {
  const normalizedQuery = normalizeSearchText(query).replace(/^#+/, "");
  if (!normalizedQuery) return [];

  return notes
    .map((note) => scoreGardenNote(note, normalizedQuery))
    .filter((result): result is GardenExplorerSearchResult => result !== null)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"));
}

function scoreGardenNote(
  note: GardenExplorerNote,
  normalizedQuery: string,
): GardenExplorerSearchResult | null {
  const scores = [
    scoreField("title", note.title, normalizedQuery),
    scoreField("slug", note.slug, normalizedQuery),
    scoreField("body", note.excerpt, normalizedQuery),
    ...note.tags.map((tag) => scoreField("tags", tag, normalizedQuery)),
  ];
  const score = scores.reduce((sum, value) => sum + value, 0);
  return score > 0 ? { ...note, score } : null;
}

function scoreField(
  field: SearchField,
  value: string,
  normalizedQuery: string,
): number {
  const normalizedValue = normalizeSearchText(value);
  const index = normalizedValue.indexOf(normalizedQuery);
  const weight = FIELD_WEIGHTS[field];

  if (normalizedValue === normalizedQuery) return weight * 3;
  if (index !== -1) return weight * (index === 0 ? 2 : 1);

  const fuzzyScore = scoreFuzzyMatch(normalizedValue, normalizedQuery);
  return fuzzyScore > 0 ? Math.round(weight * fuzzyScore) : 0;
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

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}
