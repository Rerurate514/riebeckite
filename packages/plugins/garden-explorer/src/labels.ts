import { defineUiLabels, type ResolvedUiLabels } from "@riebeckite/ui";

export const gardenExplorerLabels = defineUiLabels("garden-explorer", {
  en: {
    explorer: "Explorer",
    explorerPanels: "Explorer panels",
    searchNotes: "Search notes",
    searchNotesPlaceholder: "Search notes...",
    clearFilters: "Clear filters",
    tags: "Tags",
    folders: "Folders",
    notes: "Notes",
    showingNotes: "showing {shown} of {total}",
    noteGraph: "Note graph",
    localGraphMode: "Local graph",
    globalGraphMode: "Global graph · {count} notes",
    localMode: "Local",
    globalMode: "Global",
    selectNoteHint: "Select a note to inspect links.",
    selectedNote: "Selected Note",
    outgoingLinks: "Outgoing Links",
    backlinks: "Backlinks",
    relatedNotes: "Related Notes",
    noNotes: "No notes.",
  },
  ja: {
    explorer: "Explorer",
    explorerPanels: "Explorer のパネル",
    searchNotes: "ノートを検索",
    searchNotesPlaceholder: "ノートを検索...",
    clearFilters: "絞り込みを解除",
    tags: "タグ",
    folders: "フォルダー",
    notes: "ノート",
    showingNotes: "{total} 件中 {shown} 件を表示",
    noteGraph: "ノートグラフ",
    localGraphMode: "ローカルグラフ",
    globalGraphMode: "グラフ全体 · {count} 件のノート",
    localMode: "ローカル",
    globalMode: "全体",
    selectNoteHint: "ノートを選ぶとリンクを確認できます。",
    selectedNote: "選択中のノート",
    outgoingLinks: "発リンク",
    backlinks: "バックリンク",
    relatedNotes: "関連ノート",
    noNotes: "ノートはありません。",
  },
});

export type GardenExplorerLabels = ResolvedUiLabels<
  typeof gardenExplorerLabels
>;
