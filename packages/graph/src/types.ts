export type GraphNodeKind = "note" | "unresolved" | "attachment" | "tag";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  slug: string | null;
  title: string;
  permalink: string | null;
  path: string;
  tags: string[];
  date: string | null;
};

export type GraphLink = {
  source: string;
  target: string;
};

export type GraphDocument = {
  nodes: GraphNode[];
  links: GraphLink[];
  centerId: string | null;
};

export type GraphGroup = {
  id: string;
  query: string;
  color: string;
};

export type GraphSettings = {
  search: string;
  showTags: boolean;
  showAttachments: boolean;
  existingOnly: boolean;
  showOrphans: boolean;
  depth: number;
  arrows: boolean;
  textFade: number;
  nodeSize: number;
  linkThickness: number;
  animate: boolean;
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
  groups: GraphGroup[];
};

export type GraphMode = "local" | "global";

export type VisibleGraphNode = GraphNode & {
  degree: number;
  radius: number;
  color: string;
  groupId: string | null;
};

export type VisibleGraph = {
  nodes: VisibleGraphNode[];
  links: GraphLink[];
  centerId: string | null;
  unsupportedOperators: string[];
};
