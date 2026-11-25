import { defineUiLabels } from "@riebeckite/ui";

export const vaultHeatmapLabels = defineUiLabels("vault-heatmap", {
  en: {
    summaryFormat: "{total} {type} on {days} {day}",
    noActivity: "No dated vault activity.",
    update: "update",
    updates: "updates",
    day: "day",
    days: "days",
  },
  ja: {
    summaryFormat: "{days}{day}に {total}{type}",
    noActivity: "日付のある Vault の活動はありません。",
    update: "件",
    updates: "件",
    day: "日",
    days: "日",
  },
});
