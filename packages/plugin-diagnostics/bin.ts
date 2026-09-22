import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { resolveConfig } from "@riebeckite/core";
import { formatDiagnostics, runDiagnostics } from "./index.js";
import type { DiagnosticsOptions, DiagnosticsReport } from "./src/types.js";

type CliArgs = {
  help: boolean;
  noColor: boolean;
  failOnError: boolean;
  format: "text" | "json";
  exitOn: "error" | "warning" | "info" | null;
  config: string | null;
  content: string | null;
  exclude: string[];
  requiredFrontmatter: string[];
  reportUnusedAssets: boolean;
  reportOrphans: boolean;
  publishStrategy: "explicit" | "selective" | null;
  explicit: Set<string>;
};

const HELP = `riebeckite-diagnostics

Check an Obsidian vault / Riebeckite content directory for content problems:
broken wikilinks, broken images, broken markdown links, unused assets,
orphan notes, missing frontmatter, publish conflicts, duplicate titles,
slug collisions, and excluded-but-public notes.

Usage:
  riebeckite-diagnostics [options]

Options:
  --config <path>             Path to riebeckite.config.ts (loaded under tsx)
  --content <dir>             Content directory to analyze (default: .)
  --exclude <glob>            Extra exclude glob (repeatable)
  --publish-strategy <mode>   explicit | selective (default: selective)
  --report-unused-assets      Report images never referenced by any note
  --report-orphans            Report published notes with no incoming links
  --required-frontmatter <f>  Comma-separated required frontmatter fields
  --fail-on-error             Exit with code 1 when errors are found (default)
  --exit-on <severity>        Exit with code 1 at/above severity (info|warning|error)
  --format <text|json>        Output format (default: text)
  --no-color                  Disable ANSI colors
  -h, --help                  Show this help

Exit codes:
  0  no errors
  1  one or more errors reported (or the --exit-on threshold is met)
  2  invalid arguments
`;

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }

  if (!args.config && !args.content) {
    process.stderr.write("error: set --config <path> or --content <dir>\n\n");
    process.stderr.write(HELP);
    return 2;
  }

  const config = args.config ? await loadConfigFile(args.config) : null;
  const options: DiagnosticsOptions = {
    ...(config ? diagnosticsOptionsFromConfig(config) : {}),
    ...(args.explicit.has("reportUnusedAssets")
      ? { reportUnusedAssets: args.reportUnusedAssets }
      : {}),
    ...(args.explicit.has("reportOrphans")
      ? { reportOrphans: args.reportOrphans }
      : {}),
    ...(args.explicit.has("requiredFrontmatter")
      ? { requiredFrontmatter: args.requiredFrontmatter }
      : {}),
    ...(args.explicit.has("publishStrategy")
      ? { publishStrategy: args.publishStrategy ?? undefined }
      : {}),
    exclude: [
      ...(config ? (diagnosticsOptionsFromConfig(config).exclude ?? []) : []),
      ...args.exclude,
    ],
  };

  let target: ResolvedRiebeckiteConfig | string;
  if (config) {
    target = config;
  } else {
    target = args.content ?? ".";
  }

  const report = await runDiagnostics(target, options);
  writeReport(report, args);

  if (args.exitOn) {
    if (countAtOrAbove(report, args.exitOn) > 0) return 1;
    return 0;
  }
  return report.hasErrors ? 1 : 0;
}

function diagnosticsOptionsFromConfig(
  config: ResolvedRiebeckiteConfig,
): DiagnosticsOptions {
  const plugin = config.plugins.find(
    (candidate) => candidate.name === "diagnostics",
  );
  const options = plugin?.options;
  return options && typeof options === "object"
    ? (options as DiagnosticsOptions)
    : {};
}

function writeReport(report: DiagnosticsReport, args: CliArgs) {
  if (args.format === "json") {
    process.stdout.write(
      `${JSON.stringify(
        {
          summary: report.summary,
          hasErrors: report.hasErrors,
          hasWarnings: report.hasWarnings,
          diagnostics: report.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message,
            filePath: diagnostic.filePath,
            slug: diagnostic.slug,
            line: diagnostic.line,
            column: diagnostic.column,
            target: diagnostic.target,
            suggestion: diagnostic.suggestion,
          })),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  process.stdout.write(
    `${formatDiagnostics(report, { color: !args.noColor })}\n`,
  );
}

function countAtOrAbove(
  report: DiagnosticsReport,
  severity: CliArgs["exitOn"],
): number {
  switch (severity) {
    case "error":
      return report.summary.error;
    case "warning":
      return report.summary.error + report.summary.warning;
    default:
      return report.summary.total;
  }
}

async function loadConfigFile(
  configPath: string,
): Promise<ResolvedRiebeckiteConfig> {
  const absolutePath = path.resolve(process.cwd(), configPath);
  let module: unknown;
  try {
    module = await import(pathToFileURL(absolutePath).href);
  } catch (error) {
    throw new Error(
      `failed to load config "${configPath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const raw = (module as { default?: unknown }).default ?? module;
  const resolved = resolveConfig(raw as Parameters<typeof resolveConfig>[0]);
  const directory = path.resolve(process.cwd(), resolved.content.directory);
  return {
    ...resolved,
    content: {
      ...resolved.content,
      directory,
    },
  };
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    noColor: false,
    failOnError: false,
    format: "text",
    exitOn: null,
    config: null,
    content: null,
    exclude: [],
    requiredFrontmatter: [],
    reportUnusedAssets: false,
    reportOrphans: false,
    publishStrategy: null,
    explicit: new Set<string>(),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--no-color":
        args.noColor = true;
        break;
      case "--fail-on-error":
        args.failOnError = true;
        break;
      case "--report-unused-assets":
        args.reportUnusedAssets = true;
        args.explicit.add("reportUnusedAssets");
        break;
      case "--report-orphans":
        args.reportOrphans = true;
        args.explicit.add("reportOrphans");
        break;
      case "--format":
        args.format = (argv[++i] ?? "text") === "json" ? "json" : "text";
        break;
      case "--exit-on": {
        const value = argv[++i];
        args.exitOn =
          value === "error" || value === "warning" || value === "info"
            ? value
            : null;
        break;
      }
      case "--config":
        args.config = argv[++i] ?? "";
        break;
      case "--content":
        args.content = argv[++i] ?? "";
        break;
      case "--publish-strategy": {
        const value = argv[++i];
        args.publishStrategy =
          value === "explicit" || value === "selective" ? value : null;
        if (args.publishStrategy) args.explicit.add("publishStrategy");
        break;
      }
      case "--exclude":
        if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
          args.exclude.push(argv[++i]);
        }
        break;
      case "--required-frontmatter": {
        args.explicit.add("requiredFrontmatter");
        if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
          args.requiredFrontmatter.push(
            ...(argv[++i] ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return args;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    },
  );
}
