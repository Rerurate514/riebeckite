import { initLightbox } from "@riebeckite/plugin-lightbox";
import { createClient } from "honox/client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initLightbox();
  initSearch();

  const tocLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-toc-target]"),
  );

  if (tocLinks.length === 0) return;

  const linksByHeadingId = new Map<string, HTMLAnchorElement[]>();

  for (const link of tocLinks) {
    const headingId = link.dataset.tocTarget;

    if (!headingId) continue;

    linksByHeadingId.set(headingId, [
      ...(linksByHeadingId.get(headingId) ?? []),
      link,
    ]);
  }

  const headings = Array.from(linksByHeadingId.keys())
    .map((id) => document.getElementById(id))
    .filter((heading): heading is HTMLElement => heading !== null);

  const updateViewedLinks = (activeHeadingId: string) => {
    const activeHeadingIndex = headings.findIndex(
      (heading) => heading.id === activeHeadingId,
    );

    if (activeHeadingIndex === -1) return;

    for (const link of tocLinks) {
      link.removeAttribute("aria-current");
      link.dataset.tocViewed = "false";
    }

    for (const heading of headings.slice(0, activeHeadingIndex + 1)) {
      for (const link of linksByHeadingId.get(heading.id) ?? []) {
        link.dataset.tocViewed = "true";

        if (heading.id === activeHeadingId) {
          link.setAttribute("aria-current", "true");
        }
      }
    }
  };

  const updateByScrollPosition = () => {
    let currentHeading = headings[0];

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.35) {
        currentHeading = heading;
      }
    }

    updateViewedLinks(currentHeading?.id ?? headings[0]?.id ?? "");
  };

  let animationFrameId = 0;

  const scheduleUpdate = () => {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(updateByScrollPosition);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateByScrollPosition();
}

type SearchItem = {
  slug: string;
  title: string;
  content: string;
};

type SearchResult = SearchItem & {
  score: number;
  excerpt: string;
};

function initSearch() {
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
  };

  const loadSearchItems = async () => {
    if (searchItems) return;

    status.textContent = "Loading search index...";
    try {
      const response = await fetch("/search-data.json");
      if (!response.ok) {
        status.textContent = "Failed to load search index.";
        searchItems = [];
        return;
      }

      searchItems = (await response.json()) as SearchItem[];
    } catch {
      status.textContent = "Failed to load search index.";
      searchItems = [];
    }
  };

  const renderResults = (query: string) => {
    const normalizedQuery = normalizeText(query);
    selectedIndex = 0;

    if (normalizedQuery.length === 0) {
      currentResults = [];
      results.replaceChildren();
      status.textContent = "Type a keyword to search published notes.";
      return;
    }

    currentResults = (searchItems ?? [])
      .map((item) => scoreSearchItem(item, normalizedQuery))
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"))
      .slice(0, 8);

    results.replaceChildren(...currentResults.map(createResultElement));
    updateSelectedResult();
    status.textContent =
      currentResults.length === 0
        ? "No results found."
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
      selectedIndex = Math.min(
        selectedIndex + 1,
        Math.max(currentResults.length - 1, 0),
      );
      updateSelectedResult();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
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
  const normalizedTitle = normalizeText(item.title);
  const normalizedSlug = normalizeText(item.slug);
  const normalizedContent = normalizeText(item.content);

  let score = 0;
  if (normalizedTitle === normalizedQuery) score += 80;
  if (normalizedTitle.includes(normalizedQuery)) score += 40;
  if (normalizedSlug.includes(normalizedQuery)) score += 24;
  if (normalizedContent.includes(normalizedQuery)) score += 8;

  if (score === 0) return null;

  return {
    ...item,
    score,
    excerpt: createExcerpt(item.content, normalizedQuery),
  };
}

function createResultElement(result: SearchResult): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "search-result";
  link.href = `/${encodeURI(result.slug)}`;
  link.dataset.searchResult = "true";
  link.setAttribute("role", "option");

  const title = document.createElement("p");
  title.className = "search-result__title";
  title.textContent = result.title;

  const path = document.createElement("p");
  path.className = "search-result__path";
  path.textContent = result.slug;

  const excerpt = document.createElement("p");
  excerpt.className = "search-result__excerpt";
  excerpt.textContent = result.excerpt;

  link.append(title, path, excerpt);
  return link;
}

function createExcerpt(content: string, normalizedQuery: string): string {
  const normalizedContent = normalizeText(content);
  const queryIndex = normalizedContent.indexOf(normalizedQuery);
  const start = queryIndex === -1 ? 0 : Math.max(queryIndex - 48, 0);
  const end = Math.min(start + 140, content.length);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";

  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKC");
}
