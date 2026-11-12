import { createDialogController } from "@riebeckite/ui/dialog";
import { createLoadingController } from "@riebeckite/ui/loading";
import {
  parseSearchQuery,
  type SearchItem,
  type SearchResult,
  searchItems as searchContentItems,
} from "./search.js";
import { mountSearchResults } from "./search-results.js";

const MAX_RESULTS = 8;

export type SearchInitContext = {
  readonly signal?: AbortSignal;
};

export function initSearch(context: SearchInitContext = {}): () => void {
  const root = document.querySelector<HTMLElement>("[data-search-root]");
  const modal = document.querySelector<HTMLDialogElement>(
    "[data-search-modal]",
  );
  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  const status = document.querySelector<HTMLElement>("[data-search-status]");
  const results = document.querySelector<HTMLElement>("[data-search-results]");
  const openButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-search-open]"),
  );
  const closeButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-search-close]"),
  );

  if (!root || !modal || !input || !status || !results) return () => {};

  const loading = createLoadingController(modal);
  const resultsView = mountSearchResults(results);
  let searchItems: SearchItem[] | null = null;
  let loadFailed = false;
  let selectedIndex = 0;
  let currentResults: SearchResult[] = [];
  let currentQuery = "";

  const renderCurrentResults = () => {
    resultsView.render({
      results: currentResults,
      selectedIndex,
      query: currentQuery,
    });
    results
      .querySelector<HTMLAnchorElement>(
        '[data-search-result][aria-selected="true"]',
      )
      ?.scrollIntoView({ block: "nearest" });
  };

  const loadSearchItems = async (): Promise<boolean> => {
    if (searchItems && !loadFailed) return true;

    loading.start();
    status.textContent = "Loading search index...";
    try {
      const response = await fetch("/search-data.json");
      if (!response.ok) throw new Error("Failed to load search index.");
      searchItems = (await response.json()) as SearchItem[];
      loadFailed = false;
      loading.stop();
      return true;
    } catch {
      searchItems = [];
      loadFailed = true;
      status.textContent = "";
      loading.fail("Failed to load search index.");
      return false;
    }
  };

  const renderResults = (query: string) => {
    const parsedQuery = parseSearchQuery(query);
    const normalizedQuery = parsedQuery.text;
    selectedIndex = 0;
    currentQuery = normalizedQuery;

    if (loadFailed) {
      currentResults = [];
      renderCurrentResults();
      status.textContent = "";
      return;
    }

    if (normalizedQuery.length === 0 && parsedQuery.filters.length === 0) {
      currentResults = [];
      renderCurrentResults();
      status.textContent = "Type a keyword or use tag:, lang:, or path:.";
      return;
    }

    if (searchItems === null) {
      currentResults = [];
      renderCurrentResults();
      status.textContent = "Loading search index...";
      return;
    }

    currentResults = searchContentItems(searchItems, query, {
      language: document.documentElement.lang || undefined,
    }).slice(0, MAX_RESULTS);

    renderCurrentResults();
    status.textContent =
      currentResults.length === 0
        ? "No results found. Try a shorter keyword or filter."
        : `${currentResults.length} result${currentResults.length === 1 ? "" : "s"}`;
  };

  const moveSelection = (step: number) => {
    if (currentResults.length === 0) return;
    selectedIndex =
      (selectedIndex + step + currentResults.length) % currentResults.length;
    renderCurrentResults();
  };

  const controller = createDialogController(modal, {
    triggers: openButtons,
    closeButtons,
    initialFocus: () => input,
    signal: context.signal,
    onOpen: () => {
      void loadSearchItems().then((loaded) => {
        if (loaded && modal.open) renderResults(input.value);
      });
    },
  });

  input.addEventListener("input", () => renderResults(input.value));

  results.addEventListener("click", (event) => {
    if ((event.target as Element | null)?.closest("[data-search-result]")) {
      controller.close();
    }
  });

  const initialQuery = new URLSearchParams(window.location.search).get(
    "search",
  );
  if (initialQuery) {
    input.value = initialQuery;
    controller.open();
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      controller.open();
      return;
    }

    if (!modal.open) return;

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
      renderCurrentResults();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      selectedIndex = Math.max(currentResults.length - 1, 0);
      renderCurrentResults();
      return;
    }

    if (event.key === "Enter") {
      const result = currentResults[selectedIndex];
      if (!result) return;

      event.preventDefault();
      window.location.href = result.permalink;
    }
  };

  document.addEventListener(
    "keydown",
    onKeyDown,
    context.signal ? { signal: context.signal } : undefined,
  );

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    loading.destroy();
    controller.destroy();
    resultsView.unmount();
  };
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
