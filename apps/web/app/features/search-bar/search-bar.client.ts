import {
  normalizeSearchQuery,
  normalizeSearchText,
  type SearchItem,
  type SearchResult,
  searchItems as searchContentItems,
} from "../search/search";

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
    const normalizedQuery = normalizeSearchQuery(query);
    selectedIndex = 0;

    if (normalizedQuery.length === 0) {
      currentResults = [];
      results.replaceChildren();
      status.textContent =
        "Type a keyword, tag, or path to search published notes.";
      return;
    }

    currentResults = searchContentItems(searchItems ?? [], query).slice(
      0,
      MAX_RESULTS,
    );

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
  const normalizedValue = normalizeSearchText(value);
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
