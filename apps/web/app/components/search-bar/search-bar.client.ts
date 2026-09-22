type SearchItem = {
  slug: string;
  title: string;
  headings: string[];
  body: string;
  excerpt: string;
  tags: string[];
  date: string | null;
};

type SearchMatch = {
  field: keyof Pick<
    SearchItem,
    "slug" | "title" | "body" | "tags" | "headings"
  >;
  value: string;
  score: number;
  index: number;
};

type SearchResult = SearchItem & {
  score: number;
  match: SearchMatch;
};

const FIELD_WEIGHTS = {
  slug: 64,
  title: 56,
  tags: 44,
  headings: 32,
  body: 10,
} as const;

const MAX_RESULTS = 8;

export function initSearch() {
  const root = document.querySelector<HTMLElement>("[data-search-root]");
  const modal = document.querySelector<HTMLElement>("[data-search-modal]");
  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  const status = document.querySelector<HTMLElement>("[data-search-status]");
  const results = document.querySelector<HTMLElement>("[data-search-results]");
  const openButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-search-open]"),
  );
  const closeButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-search-close]"),
  );

  if (!root || !modal || !input || !status || !results) return;

  let searchItems: SearchItem[] | null = null;
  let selectedIndex = 0;
  let currentResults: SearchResult[] = [];

  const openSearch = async () => {
    modal.hidden = false;
    input.focus();
    await loadSearchItems();
    renderResults(input.value);
  };

  const closeSearch = () => {
    modal.hidden = true;
    input.blur();
  };

  const loadSearchItems = async () => {
    if (searchItems) return;

    status.textContent = "Loading search index...";
    const response = await fetch("/search-data.json");
    if (!response.ok) {
      status.textContent = "Failed to load search index.";
      searchItems = [];
      return;
    }

    searchItems = (await response.json()) as SearchItem[];
  };

  const renderResults = (query: string) => {
    const normalizedQuery = normalizeQuery(query);
    selectedIndex = 0;

    if (normalizedQuery.length === 0) {
      currentResults = [];
      results.replaceChildren();
      status.textContent =
        "Type a keyword, tag, or path to search published notes.";
      return;
    }

    currentResults = (searchItems ?? [])
      .map((item) => scoreSearchItem(item, normalizedQuery))
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"))
      .slice(0, MAX_RESULTS);

    results.replaceChildren(
      ...currentResults.map((result) =>
        createResultElement(result, normalizedQuery),
      ),
    );
    updateSelectedResult();
    status.textContent =
      currentResults.length === 0
        ? "No results found. Try a shorter keyword or tag."
        : `${currentResults.length} result${currentResults.length === 1 ? "" : "s"}`;
  };

  const updateSelectedResult = () => {
    const links = Array.from(
      results.querySelectorAll<HTMLAnchorElement>("[data-search-result]"),
    );

    for (const [index, link] of links.entries()) {
      link.setAttribute("aria-selected", String(index === selectedIndex));
    }

    links[selectedIndex]?.scrollIntoView({ block: "nearest" });
  };

  const moveSelection = (step: number) => {
    if (currentResults.length === 0) return;
    selectedIndex =
      (selectedIndex + step + currentResults.length) % currentResults.length;
    updateSelectedResult();
  };

  input.addEventListener("input", () => renderResults(input.value));

  openButtons.forEach((button) => {
    button.addEventListener("click", () => void openSearch());
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeSearch);
  });

  document.addEventListener("keydown", (event) => {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      void openSearch();
      return;
    }

    if (modal.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectedIndex = 0;
      updateSelectedResult();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectedIndex = Math.max(currentResults.length - 1, 0);
      updateSelectedResult();
      return;
    }

    if (event.key === "Enter") {
      const result = currentResults[selectedIndex];
      if (!result) return;

      event.preventDefault();
      window.location.href = `/${encodeURI(result.slug)}`;
    }
  });
}

function isSearchShortcut(event: KeyboardEvent): boolean {
  const target = event.target;
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    return true;
  }

  return !isEditable && event.key === "/";
}

function scoreSearchItem(
  item: SearchItem,
  normalizedQuery: string,
): SearchResult | null {
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
  const normalizedValue = normalizeText(value);
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

function createResultElement(
  result: SearchResult,
  normalizedQuery: string,
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "search-result";
  link.href = `/${encodeURI(result.slug)}`;
  link.dataset.searchResult = "true";
  link.setAttribute("role", "option");

  const title = document.createElement("p");
  title.className = "search-result__title";
  appendHighlightedText(title, result.title, normalizedQuery);

  const meta = document.createElement("p");
  meta.className = "search-result__meta";
  meta.textContent = [formatDate(result.date), result.slug]
    .filter(Boolean)
    .join(" · ");

  const excerpt = document.createElement("p");
  excerpt.className = "search-result__excerpt";
  appendHighlightedText(excerpt, createDisplayExcerpt(result), normalizedQuery);

  const tags = document.createElement("p");
  tags.className = "search-result__tags";
  for (const tag of result.tags.slice(0, 4)) {
    const badge = document.createElement("span");
    badge.className = "search-result__tag";
    appendHighlightedText(badge, `#${tag}`, normalizedQuery);
    tags.appendChild(badge);
  }

  link.appendChild(title);
  link.appendChild(meta);
  link.appendChild(excerpt);
  if (result.tags.length > 0) link.appendChild(tags);
  return link;
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

function appendHighlightedText(
  element: HTMLElement,
  value: string,
  normalizedQuery: string,
) {
  const normalizedValue = normalizeText(value);
  const index = normalizedValue.indexOf(normalizedQuery);

  if (index === -1 || normalizedQuery.length === 0) {
    element.textContent = value;
    return;
  }

  element.appendChild(document.createTextNode(value.slice(0, index)));
  element.appendChild(
    createMark(value.slice(index, index + normalizedQuery.length)),
  );
  element.appendChild(
    document.createTextNode(value.slice(index + normalizedQuery.length)),
  );
}

function createMark(value: string): HTMLElement {
  const mark = document.createElement("mark");
  mark.className = "search-result__mark";
  mark.textContent = value;
  return mark;
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

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}

function normalizeQuery(value: string): string {
  return normalizeText(value).replace(/^#+/, "");
}
