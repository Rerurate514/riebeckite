import { defineUiLabels } from "@riebeckite/ui";

export const searchLabels = defineUiLabels("search", {
  en: {
    search: "Search",
    searchNotes: "Search notes",
    closeSearch: "Close search",
    searchQuery: "Search query",
    searchPlaceholder: "Search notes or use tag:, lang:, path:...",
    searchFilterHint: "Filter with tag:, lang:, or path:.",
    searchResults: "Search results",
  },
  ja: {
    search: "検索",
    searchNotes: "ノートを検索",
    closeSearch: "検索を閉じる",
    searchQuery: "検索キーワード",
    searchPlaceholder: "ノートを検索 (tag:, lang:, path: ...)",
    searchFilterHint: "tag:、lang:、path: で絞り込めます。",
    searchResults: "検索結果",
  },
});
