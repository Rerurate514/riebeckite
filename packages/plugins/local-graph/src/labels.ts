import { defineUiLabels } from "@riebeckite/ui";

export const localGraphLabels = defineUiLabels("local-graph", {
  en: {
    localGraph: "Local Graph",
    nearbyNotes: "Nearby Notes",
    openInExplorer: "Open in Explorer",
    localGraphTruncated:
      "This neighbourhood is large, so the graph stops after 320 nodes.",
    localGraphTruncatedExplorer: "Use the Explorer for the full network.",
  },
  ja: {
    localGraph: "ローカルグラフ",
    nearbyNotes: "近くのノート",
    openInExplorer: "Explorer で開く",
    localGraphTruncated:
      "この周辺はノードが多いため、320ノードで打ち切っています。",
    localGraphTruncatedExplorer: "ネットワーク全体は Explorer で確認できます。",
  },
});
