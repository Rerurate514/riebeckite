export type LocalGraphNodeRelation =
  | "current"
  | "outgoing"
  | "backlink"
  | "both";

export type LocalGraphNode = {
  slug: string;
  title: string;
  relation: LocalGraphNodeRelation;
  outgoing: string[];
  backlinks: string[];
};

export type LocalGraphData = {
  currentSlug: string;
  nodes: LocalGraphNode[];
};
