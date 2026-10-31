import type {
  ApplicationInspection,
  BuildInspection,
  ConfigInspection,
  ContentInspection,
  GraphInspection,
  PluginInspection,
  ProvenanceInspection,
} from "./types.js";

const buildStateInvalidReasonLabels = {
  "malformed-json": "state file is not valid JSON",
  "unsupported-version": "state file version is not supported",
  "invalid-shape": "state file structure is not recognized",
} as const;

export function renderApplicationInspection(
  inspection: ApplicationInspection,
): string {
  return [
    "Riebeckite Inspector",
    "",
    "Application",
    field("Root", inspection.root),
    field("Config", inspection.configPath),
    "",
    "Content",
    field("Source", inspection.content.source),
    field("Entries", inspection.content.entryCount),
    "",
    "Plugins",
    field("Enabled", inspection.plugins.enabledCount),
    field("Capabilities", inspection.plugins.capabilityCount),
    "",
    "Build",
    field("State", inspection.build.status),
    ...(inspection.build.status === "valid"
      ? [
          field("Entries", inspection.build.entryCount),
          field("Reusable", inspection.build.reusable ? "yes" : "no"),
          ...(inspection.build.regenerationReason
            ? [field("Regenerate", inspection.build.regenerationReason)]
            : []),
        ]
      : []),
    ...(inspection.build.status === "invalid"
      ? [
          field(
            "Reason",
            buildStateInvalidReasonLabels[inspection.build.reason],
          ),
        ]
      : []),
    "",
    "Use:",
    "  riebeckite inspect config",
    "  riebeckite inspect plugins",
    "  riebeckite inspect content",
    "  riebeckite inspect graph",
    "  riebeckite inspect build",
  ].join("\n");
}

export function renderConfigInspection(inspection: ConfigInspection): string {
  return [
    "Configuration",
    "",
    "Site",
    field("Title", inspection.site.title),
    field("Base URL", inspection.site.baseUrl),
    field("Locale", inspection.site.locale),
    "",
    "Content",
    field("Source", inspection.content.source),
    field("Directory", inspection.content.directory),
    field("Exclude", values(inspection.content.exclude)),
    field("Publishing", inspection.content.publishStrategy),
    "",
    "Cache",
    field("Enabled", inspection.cache.enabled ? "yes" : "no"),
    field("Directory", inspection.cache.directory || "(default)"),
    field(
      "Content",
      inspection.cache.persistentCache.cacheable ? "cacheable" : "bypassed",
    ),
    ...(inspection.cache.persistentCache.reason !== undefined
      ? [field("Reason", inspection.cache.persistentCache.reason)]
      : []),
    "",
    "Theme",
    field("Name", inspection.theme.name),
    field("Color mode", inspection.theme.colorMode),
    "",
    "Plugins",
    field("Count", inspection.pluginCount),
  ].join("\n");
}

export function renderPluginInspections(
  inspections: readonly PluginInspection[],
): string {
  return [
    "Plugins",
    "",
    "  #  Plugin  Enabled  Provides  Requires  Optional",
    ...inspections.map((inspection) =>
      [
        `  ${String(inspection.order).padStart(2)}`,
        inspection.name,
        inspection.enabled ? "yes" : "no",
        values(inspection.provides),
        values(inspection.requires),
        values(inspection.optional),
      ].join("  "),
    ),
  ].join("\n");
}

export function renderContentInspection(
  inspection: ContentInspection,
  options: { list: boolean },
): string {
  return [
    "Content",
    "",
    "Source",
    field("Type", inspection.source),
    field("Entries", inspection.entryCount),
    field("Excluded", inspection.excluded.length),
    "",
    "Extensions",
    ...inspection.extensions.map((entry) =>
      field(entry.extension, entry.count),
    ),
    ...(options.list
      ? [
          "",
          "PATH  ID  ID SOURCE  PERMALINK",
          ...inspection.paths.map(
            (entry) =>
              `  ${entry.path}  ${entry.id ?? "-"}  ${entry.idSource ?? "-"}  ${entry.permalink ?? "-"}`,
          ),
        ]
      : []),
    ...(options.list && inspection.excluded.length > 0
      ? [
          "",
          "EXCLUDED PATH  PATTERN",
          ...inspection.excluded.map(
            (entry) => `  ${entry.path}  ${entry.pattern}`,
          ),
        ]
      : []),
  ].join("\n");
}

export function renderContentEntryInspection(
  entry: ContentInspection["paths"][number],
): string {
  return [
    "Content Entry",
    "",
    field("Path", entry.path),
    field("Permalink", entry.permalink ?? "-"),
    field("ID", entry.id ?? "-"),
    field("ID source", entry.idSource ?? "-"),
  ].join("\n");
}

export function renderGraphInspection(inspection: GraphInspection): string {
  return [
    "Content Graph",
    "",
    field("Nodes", inspection.nodeCount),
    field("Edges", inspection.edgeCount),
    ...(inspection.mostLinked.length > 0
      ? [
          "",
          "Most linked",
          ...inspection.mostLinked.map((entry) =>
            field(entry.path, entry.incomingCount),
          ),
        ]
      : []),
  ].join("\n");
}

export function renderBuildInspection(inspection: BuildInspection): string {
  return [
    "Build State",
    "",
    field("Status", inspection.status),
    ...(inspection.status === "valid"
      ? [
          field("Version", inspection.version),
          field("Entries", inspection.entryCount),
          field("Reusable", inspection.reusable ? "yes" : "no"),
          ...(inspection.regenerationReason
            ? [field("Regenerate", inspection.regenerationReason)]
            : []),
        ]
      : []),
    ...(inspection.status === "invalid"
      ? [field("Reason", buildStateInvalidReasonLabels[inspection.reason])]
      : []),
  ].join("\n");
}

export function renderProvenanceInspection(
  inspection: ProvenanceInspection,
): string {
  if (inspection.status === "unavailable") {
    return ["Build Provenance", "", field("Status", inspection.reason)].join(
      "\n",
    );
  }
  const { provenance } = inspection;
  return [
    "Build Provenance",
    "",
    field("Build", provenance.buildId),
    field("Sources", provenance.sources.length),
    field("Transforms", provenance.transforms.length),
    field("Outputs", provenance.outputs.length),
    field("Artifacts", provenance.artifacts?.length ?? 0),
    field("History", inspection.history.length),
    ...(inspection.comparison
      ? [
          field(
            "Compared",
            `${inspection.comparison.from} -> ${inspection.comparison.to}`,
          ),
          field(
            "Delta",
            `+${inspection.comparison.sources.added.length} -${inspection.comparison.sources.removed.length} ~${inspection.comparison.sources.changed.length} sources`,
          ),
        ]
      : []),
    ...(inspection.comparisonUnavailable
      ? [field("Comparison", inspection.comparisonUnavailable)]
      : []),
  ].join("\n");
}

function field(label: string, value: string | number): string {
  return `  ${label.padEnd(14)} ${value}`;
}

function values(entries: readonly string[]): string {
  return entries.length > 0 ? entries.join(", ") : "-";
}
