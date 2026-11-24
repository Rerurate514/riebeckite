import { defineUiLabels, type ResolvedUiLabels } from "@riebeckite/ui";

export const diffLabels = defineUiLabels("diff", {
  en: {
    history: "History",
    historyChanges: "{count} changes",
    collapse: "Collapse",
    expand: "Expand",
    historyToggle: "Toggle history",
    commitHistory: "Commit history",
    untitledChange: "Untitled change",
  },
  ja: {
    history: "変更履歴",
    historyChanges: "{count} 件の変更",
    collapse: "折りたたむ",
    expand: "展開する",
    historyToggle: "履歴の表示を切り替え",
    commitHistory: "コミット履歴",
    untitledChange: "無題の変更",
  },
});

export type DiffLabels = ResolvedUiLabels<typeof diffLabels>;
