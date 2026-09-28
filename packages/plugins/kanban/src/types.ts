export type KanbanOptions = {
  className?: string;
  language?: string;
  columnMarker?: string;
  autoDetect?: boolean;
  fallback?: boolean;
};

export type ResolvedKanbanOptions = {
  className: string;
  language: string;
  columnMarker: string;
  autoDetect: boolean;
  fallback: boolean;
};

export function resolveKanbanOptions(
  options: KanbanOptions = {},
): ResolvedKanbanOptions {
  return {
    className: options.className?.trim() || "rb-kanban",
    language: options.language?.trim() || "kanban",
    columnMarker: options.columnMarker?.trim() || "##",
    autoDetect: options.autoDetect ?? true,
    fallback: options.fallback ?? true,
  };
}
