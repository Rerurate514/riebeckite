import type {
  GraphDocument,
  GraphMode,
  GraphNode,
  GraphSettings,
} from "./index.js";

export type GraphViewProps = {
  document: GraphDocument;
  mode?: GraphMode;
  centerId?: string | null;
  initialSettings?: Partial<GraphSettings>;
  storageKey?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  selectedId?: string | null;
  onSelect?: (node: GraphNode | null) => void;
  onOpen?: (node: GraphNode) => void;
  onShowLocal?: (node: GraphNode) => void;
  expandable?: boolean;
  showHeader?: boolean;
  showModeLabel?: boolean;
  heading?: string;
  maxDepth?: number;
  class?: string;
};

export type GraphContextMenu = {
  node: GraphNode;
  x: number;
  y: number;
};

export type GraphSettingsSetter = (
  value: GraphSettings | ((current: GraphSettings) => GraphSettings),
) => void;
