export type UiLabels = {
  /** Table of contents landmark label. */
  contents: string;
  /** Table of contents eyebrow. */
  contentsHeading: string;
  /** Placeholder for the sidebar filter input. */
  filter: string;
  /** Screen-reader label for the sidebar filter. */
  filterNavigation: string;
  /** Label for collapsible sections and disclosure buttons. */
  collapse: string;
  expand: string;
  /** Screen-reader label for the note search input. */
  searchNotes: string;
  /** Placeholder for the note search input. */
  searchPlaceholder: string;
  /** Placeholder for compact note search inputs. */
  searchNotesPlaceholder: string;
  /** Heading of the local graph section. */
  nearbyNotes: string;
  /** Landmark label for series navigation. */
  seriesNavigation: string;
  /** Landmark label for the language switcher. */
  language: string;
  sidebarNavigation: string;
  localGraph: string;
  openInExplorer: string;
  localGraphTruncated: string;
  localGraphTruncatedExplorer: string;
  explorer: string;
  explorerPanels: string;
  clearFilters: string;
  tags: string;
  folders: string;
  notes: string;
  showingNotes: string;
  noteGraph: string;
  localGraphMode: string;
  globalGraphMode: string;
  localMode: string;
  globalMode: string;
  selectNoteHint: string;
  history: string;
  historyChanges: string;
  historyToggle: string;
  commitHistory: string;
  untitledChange: string;
  search: string;
  closeSearch: string;
  searchQuery: string;
  searchFilterHint: string;
  searchResults: string;
  seriesPosition: string;
  selectedNote: string;
  outgoingLinks: string;
  backlinks: string;
  relatedNotes: string;
  noNotes: string;
};

export const DEFAULT_UI_LABELS: UiLabels = {
  contents: "Contents",
  contentsHeading: "CONTENTS",
  filter: "Filter",
  filterNavigation: "Filter navigation",
  collapse: "Collapse",
  expand: "Expand",
  searchNotes: "Search notes",
  searchPlaceholder: "Search notes or use tag:, lang:, path:...",
  searchNotesPlaceholder: "Search notes...",
  nearbyNotes: "Nearby Notes",
  seriesNavigation: "Series navigation",
  language: "Language",
  sidebarNavigation: "Sidebar navigation",
  localGraph: "Local Graph",
  openInExplorer: "Open in Explorer",
  localGraphTruncated:
    "This neighbourhood is large, so the graph stops after 320 nodes.",
  localGraphTruncatedExplorer: "Use the Explorer for the full network.",
  explorer: "Explorer",
  explorerPanels: "Explorer panels",
  clearFilters: "Clear filters",
  tags: "Tags",
  folders: "Folders",
  notes: "Notes",
  showingNotes: "showing {shown} of {total}",
  noteGraph: "Note graph",
  localGraphMode: "Local graph",
  globalGraphMode: "Global graph · {count} notes",
  localMode: "Local",
  globalMode: "Global",
  selectNoteHint: "Select a note to inspect links.",
  history: "History",
  historyChanges: "{count} changes",
  historyToggle: "Toggle history",
  commitHistory: "Commit history",
  untitledChange: "Untitled change",
  search: "Search",
  closeSearch: "Close search",
  searchQuery: "Search query",
  searchFilterHint: "Filter with tag:, lang:, or path:.",
  searchResults: "Search results",
  seriesPosition: "Part {index} of {total}",
  selectedNote: "Selected Note",
  outgoingLinks: "Outgoing Links",
  backlinks: "Backlinks",
  relatedNotes: "Related Notes",
  noNotes: "No notes.",
};

export function resolveUiLabels(
  language: string | undefined,
  labels?: Readonly<Record<string, Readonly<Record<string, string>>>>,
): UiLabels {
  const dictionary =
    language === undefined
      ? undefined
      : Object.entries(labels ?? {}).find(
          ([locale]) => locale.toLowerCase() === language.toLowerCase(),
        )?.[1];
  if (dictionary === undefined) return DEFAULT_UI_LABELS;
  const resolved = { ...DEFAULT_UI_LABELS } as Record<string, string>;
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string" && value !== "" && key in resolved) {
      resolved[key] = value;
    }
  }
  return resolved as unknown as UiLabels;
}
