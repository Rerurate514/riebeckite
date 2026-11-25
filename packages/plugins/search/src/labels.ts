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
    loading: "Loading search index...",
    notFound: "Failed to load search index.",
    notFoundActions: "Not found actions",
    noResults: "No results found. Try a shorter keyword or filter.",
    emptyQuery: "Type a keyword or use tag:, lang:, or path:.",
    result: "{count} result",
    results: "{count} results",
  },
  ja: {
    search: "検索",
    searchNotes: "ノートを検索",
    closeSearch: "検索を閉じる",
    searchQuery: "検索キーワード",
    searchPlaceholder: "ノートを検索 (tag:, lang:, path: ...)",
    searchFilterHint: "tag:、lang:、path: で絞り込めます。",
    searchResults: "検索結果",
    loading: "検索インデックスを読み込み中...",
    notFound: "検索インデックスの読み込みに失敗しました。",
    notFoundActions: "見つからない場合の操作",
    noResults:
      "結果が見つかりません。キーワードを短くするか、絞り込みを変えてください。",
    emptyQuery:
      "キーワードを入力するか、tag:、lang:、path: で絞り込んでください。",
    result: "{count} 件",
    results: "{count} 件",
  },
});
