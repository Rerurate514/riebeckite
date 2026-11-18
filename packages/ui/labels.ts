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
