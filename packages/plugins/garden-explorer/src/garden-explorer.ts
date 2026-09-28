import type { GraphEdge } from "@riebeckite/core";

type GardenExplorerSearchFields = {
  slug: string;
  permalink: string;
  title: string;
  headings: string[];
  body: string;
  excerpt: string;
  tags: string[];
  date: string | null;
};

export type GardenExplorerNote = GardenExplorerSearchFields & {
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
