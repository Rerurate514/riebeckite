import type {
  ApiInspection,
  ApplicationInspection,
  AssetInspection,
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
    "  riebeckite inspect assets",
    "  riebeckite inspect api",
  ].join("\n");
}

export function renderApiInspection(
  inspection: ApiInspection,
  options: { deprecatedOnly: boolean },
): string {
  const entries = options.deprecatedOnly
    ? inspection.deprecated
    : inspection.entries;
  const used = new Set(inspection.usedIds);
  return [
    "API Lifecycle",
    "",
    field("APIs", inspection.entries.length),
    field("Deprecated", inspection.deprecated.length),
    field("Registry issues", inspection.issues.length),
    ...(inspection.issues.length > 0
      ? [
          "",
          "Issues",
          ...inspection.issues.map(
            (entry) =>
              `  ${entry.apiId ?? "-"}  ${entry.code}  ${entry.message}`,
          ),
        ]
      : []),
    "",
    entries.length === 0
      ? options.deprecatedOnly
        ? "No deprecated APIs are registered."
        : "No lifecycle-managed APIs are registered."
      : "APIs",
    ...entries.flatMap((entry) => [
      "",
      `  ${entry.id}`,
      ...(entry.summary ? [field("Summary", entry.summary)] : []),
      field("Status", entry.status),
      field("Kind", entry.kind),
      field("Package", entry.package ?? entry.id.split("#")[0]),
      ...(entry.deprecatedSince
        ? [field("Deprecated since", entry.deprecatedSince)]
        : []),
      ...(entry.replacement ? [field("Replacement", entry.replacement)] : []),
      ...(entry.removalVersion ? [field("Removal", entry.removalVersion)] : []),
      ...(entry.migrationGuide
        ? [field("Migration guide", entry.migrationGuide)]
        : []),
      ...(entry.reason ? [field("Reason", entry.reason)] : []),
      ...(entry.status === "deprecated"
        ? [field("Used", used.has(entry.id) ? "yes" : "not detected")]
        : []),
    ]),
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

export function renderAssetInspection(
  inspection: AssetInspection,
  options: { list: boolean },
): string {
  const { report } = inspection;
  const unused = report.assets.filter((asset) => asset.usage === "unused");
  const possiblyUnused = report.assets.filter(
    (asset) => asset.usage === "possibly-unused",
  );
  return [
    "Asset Inspector",
    "",
    field("Source", inspection.source),
    field("Assets", report.totals.assets),
    field("Size", formatBytes(report.totals.bytes)),
    field("Used", report.totals.used),
    field("Possibly unused", report.totals.possiblyUnused),
    field(
      "Unused",
      `${report.totals.unused} (${formatBytes(report.totals.unusedBytes)})`,
    ),
    field("Duplicate groups", report.totals.duplicates),
    field("Redundant bytes", formatBytes(report.totals.duplicateBytes)),
    field("Large threshold", formatBytes(report.largeThresholdBytes)),
    "",
    "Formats",
    ...report.formats.map((entry) =>
      field(
        `${entry.kind}/${entry.extension}`,
        `${entry.count} (${formatBytes(entry.bytes)})`,
      ),
    ),
    ...(unused.length > 0
      ? [
          "",
          "Unused assets",
          ...unused.map(
            (asset) =>
              `  ${asset.path}  ${formatBytes(asset.size)}  ${asset.reasons.join("; ")}`,
          ),
        ]
      : []),
    ...(possiblyUnused.length > 0
      ? [
          "",
          "Possibly unused assets",
          ...possiblyUnused.map(
            (asset) =>
              `  ${asset.path}  ${formatBytes(asset.size)}  ${asset.reasons.join("; ")}`,
          ),
        ]
      : []),
    ...(report.duplicates.length > 0
      ? [
          "",
          "Duplicate assets",
          ...report.duplicates.flatMap((group) => [
            `  ${formatBytes(group.size)} each, ${group.hash.slice(0, 12)}`,
            ...group.paths.map((assetPath) => `    ${assetPath}`),
          ]),
        ]
      : []),
    ...(report.optimizations.length > 0
      ? [
          "",
          "Optimization candidates",
          ...report.optimizations.map(
            (entry) =>
              `  ${entry.path}  ${formatBytes(entry.size)}  ${entry.recommendation}`,
          ),
        ]
      : []),
    ...(options.list
      ? [
          "",
          "PATH  SIZE  USAGE  REFERENCES",
          ...report.assets.map(
            (asset) =>
              `  ${asset.path}  ${formatBytes(asset.size)}  ${asset.usage}  ${asset.references.join(", ") || "-"}`,
          ),
        ]
      : []),
  ].join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function field(label: string, value: string | number): string {
  return `  ${label.padEnd(14)} ${value}`;
}

function values(entries: readonly string[]): string {
  return entries.length > 0 ? entries.join(", ") : "-";
}
