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

export type GardenExplorerGraphLayout = "force" | "radial";

export type GardenExplorerGraphMode = "local" | "global";

export type GardenExplorerOptions = {
  layout: GardenExplorerGraphLayout;
  depth: number;
  showTags: boolean;
  showFolders: boolean;
  nodeSize: number;
  linkDistance: number;
  repulsion: number;
  showLabels: boolean;
};

export type GardenExplorerPluginOptions = Partial<GardenExplorerOptions>;

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
  options: GardenExplorerOptions;
};

export function getGardenExplorerLocalGraphNotes(
  notes: GardenExplorerNote[],
  selectedSlug: string,
  depth: number,
): GardenExplorerNote[] {
  const noteBySlug = new Map(notes.map((note) => [note.slug, note]));
  const visible = new Set([selectedSlug]);
  let frontier = [selectedSlug];

  for (let level = 0; level < depth; level++) {
    const nextFrontier: string[] = [];
    for (const slug of frontier) {
      const note = noteBySlug.get(slug);
      if (!note) continue;
      for (const neighbor of [...note.outgoing, ...note.backlinks]) {
        if (!noteBySlug.has(neighbor) || visible.has(neighbor)) continue;
        visible.add(neighbor);
        nextFrontier.push(neighbor);
      }
    }
    frontier = nextFrontier;
  }

  return notes.filter((note) => visible.has(note.slug));
}
