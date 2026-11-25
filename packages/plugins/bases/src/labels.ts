import { defineUiLabels } from "@riebeckite/ui";

export const basesLabels = defineUiLabels("bases", {
  en: {
    tableView: "Table view",
    cards: "Cards",
    view: "{type} view {n}",
    matchingNotes: "note",
    noValue: "No value",
    noMatchingNotesInThisGroup: "No matching notes in this group.",
    viewsNotAvailableInStaticBuild:
      "{type} views are not available in a static build.",
    noMatchingNotes: "No matching notes.",
    baseDefinition: "Base definition",
  },
  ja: {
    tableView: "テーブル ビュー",
    cards: "カード",
    matchingNotes: "メモ",
    view: "{type} ビュー {n}",
    noValue: "値なし",
    noMatchingNotesInThisGroup: "このグループに一致するメモはありません。",
    viewsNotAvailableInStaticBuild:
      "静的ビルドでは {type} ビューは利用できません。",
    noMatchingNotes: "一致するメモはありません。",
    baseDefinition: "ベース定義",
  },
});
