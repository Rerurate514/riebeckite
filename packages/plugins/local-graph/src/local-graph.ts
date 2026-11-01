import type { GraphDocument } from "@riebeckite/graph";

export type LocalGraphNodeRelation =
  | "current"
  | "outgoing"
  | "backlink"
  | "both";

export type LocalGraphNode = {
  slug: string;
  permalink: string;
  title: string;
  relation: LocalGraphNodeRelation;
  outgoing: string[];
  backlinks: string[];
};

export type LocalGraphData = {
  currentSlug: string;
  nodes: LocalGraphNode[];
  document?: GraphDocument;
  truncated?: boolean;
};

export type LocalGraphViewProps = {
  graph: LocalGraphData;
};
