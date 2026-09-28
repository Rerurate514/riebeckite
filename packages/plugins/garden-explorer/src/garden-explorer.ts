import type { GraphEdge } from "@riebeckite/core";
import type { SearchItem } from "@riebeckite/plugin-search";

export type GardenExplorerNote = SearchItem & {
  folder: string;
  outgoing: string[];
  backlinks: string[];
};

export type GardenExplorerEdge = GraphEdge;

export type GardenExplorerTag = {
  name: string;
  count: number;
};

export type GardenExplorerFolder = {
  path: string;
  count: number;
};

export type GardenExplorerData = {
  notes: GardenExplorerNote[];
  edges: GardenExplorerEdge[];
  tags: GardenExplorerTag[];
  folders: GardenExplorerFolder[];
};
