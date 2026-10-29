import {
  buildOutputPlan,
  ContentManager,
  isPersistentlyCacheable,
  type OutputChangeReason,
  type OutputChangeSet,
  type OutputDependency,
  type OutputDescriptor,
  readContentBuildStateStatus,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import {
  collectDevelopmentDiagnostics,
  type DevelopmentDiagnostic,
  diagnoseOutputPlan,
  sortDevelopmentDiagnostics,
} from "@riebeckite/diagnostics";
import {
  FileSystemContentSource,
  isIgnoredContentPath,
} from "@riebeckite/node";
import type { Plugin, ViteDevServer } from "vite";
import { isPathInsideDirectory, toLogicalPath } from "./content_watch.js";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const reportPath = "/__riebeckite/inspector/report";
const outputPath = "/__riebeckite/inspector/output";
const listedOutputLimit = 20;
const maximumListedOutputLimit = 100;
const invalidationDelayMs = 150;

type ListedOutput = {
  readonly path: string;
  readonly kind: string;
  readonly producer: string;
  readonly reason?: string;
};

type OutputInspection =
  | {
      readonly status: "available";
      readonly candidateOutputCount: number;
      readonly affectedOutputCount: number;
      readonly unchangedOutputCount: number;
      readonly removedOutputCount: number;
      readonly fullRegenerationRequired: boolean;
      readonly conflicts: readonly {
        readonly path: string;
        readonly owners: readonly string[];
      }[];
      readonly affected: readonly ListedOutput[];
      readonly hiddenAffectedCount: number;
      readonly unchanged: readonly ListedOutput[];
      readonly hiddenUnchangedCount: number;
      readonly removed: readonly ListedOutput[];
      readonly hiddenRemovedCount: number;
      readonly lookups?: OutputLookups;
    }
  | { readonly status: "unavailable"; readonly reason: string };

type OutputLookups = {
  readonly output?:
    | {
        readonly status: "found";
        readonly target: string;
        readonly output: ListedOutput;
        readonly dependencies: readonly string[];
        readonly relatedOutputs: readonly ListedOutput[];
        readonly hiddenRelatedCount: number;
      }
    | {
        readonly status: "not-found";
        readonly target: string;
      };
  readonly changed?: {
    readonly target: string;
    readonly outputCount: number;
    readonly outputs: readonly ListedOutput[];
    readonly hiddenOutputCount: number;
  };
};

type RegenerationReason = {
  readonly kind: string;
  readonly source: string;
  readonly detail?: string;
};

type RegenerationInspection =
  | {
      readonly status: "available";
      readonly required: boolean;
      readonly reasons: readonly RegenerationReason[];
      readonly unknown: readonly string[];
    }
  | { readonly status: "unavailable"; readonly reason: string };

type DependencyInspection =
  | {
      readonly status: "available";
      readonly outputCount: number;
      readonly dependentOutputCount: number;
      readonly dependencyCount: number;
      readonly unknownOutputCount: number;
      readonly kinds: readonly {
        readonly kind: string;
        readonly count: number;
      }[];
      readonly outputs: readonly {
        readonly path: string;
        readonly dependencies: readonly string[];
      }[];
      readonly hiddenOutputCount: number;
    }
  | { readonly status: "unavailable"; readonly reason: string };

type OutputResult = {
  readonly output: OutputInspection;
  readonly dependencies: DependencyInspection;
  readonly diagnostics: readonly DevelopmentDiagnostic[];
  readonly regeneration: RegenerationInspection;
  readonly affected: readonly OutputDescriptor[];
  readonly unchanged: readonly OutputDescriptor[];
  readonly removed: readonly OutputDescriptor[];
  readonly reasons: ReadonlyMap<string, OutputChangeReason>;
};

type OutputQuery = {
  readonly page: number;
  readonly limit: number;
  readonly query: string;
  readonly kind: string | undefined;
  readonly status: string;
  readonly changed: string | undefined;
  readonly output: string | undefined;
  readonly dependencyPage: number;
  readonly dependencyLimit: number;
  readonly dependencyQuery: string;
  readonly dependencyKind: string | undefined;
};

type CachedInspection = {
  readonly application: ResolvedHonoxApplication;
  readonly revision: number;
  readonly report: Promise<
    Awaited<ReturnType<typeof collectDevelopmentDiagnostics>>
  >;
  readonly output: Promise<OutputResult>;
  readonly dispose: () => Promise<void>;
};

export function riebeckiteDevelopmentInspector(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  let revision = 0;
  let inspection: CachedInspection | null = null;
  const inspectApplication = (
    application: ResolvedHonoxApplication,
    currentRevision: number,
  ): CachedInspection => {
    if (
      inspection?.revision === currentRevision &&
      inspection.application === application
    ) {
      return inspection;
    }
    if (inspection) {
      const previous = inspection;
      const disposePrevious = () => {
        void previous.dispose().catch(() => {});
      };
      void Promise.allSettled([previous.report, previous.output]).then(
        disposePrevious,
      );
      inspection = null;
    }
    const content = createInspectionContent(application);
    let disposed = false;
    const dispose = async () => {
      if (disposed) return;
      disposed = true;
      await content.dispose();
    };
    const report = collectDevelopmentDiagnostics({
      config: application.config,
      content,
      revision: currentRevision,
      includeOutput: false,
    });
    const output = report.then(
      () => inspectContentOutputs(content, application),
      () => inspectContentOutputs(content, application),
    );
    const entry: CachedInspection = {
      application,
      revision: currentRevision,
      report,
      output,
      dispose,
    };
    inspection = entry;
    void report.catch(() => {
      if (inspection === entry) inspection = null;
      void output.then(dispose, dispose);
    });
    return entry;
  };
  return {
    name: "riebeckite-development-inspector",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      return id === clientModuleId ? resolvedClientModuleId : null;
    },
    load(id) {
      return id === resolvedClientModuleId ? inspectorClientModule() : null;
    },
    configureServer(server) {
      const reportMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        if (!isLocalRequest(request.headers.host, server)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        try {
          const application = getApplication();
          const report = await inspectApplication(application, revision).report;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              ...report,
              generatedAt: new Date().toISOString(),
              currentPage: currentPageFromRequest(request.url),
              theme: application.config.theme.name,
              plugins: application.config.plugins.map((plugin, index) => ({
                name: plugin.name,
                order: index + 1,
                enabled: true,
              })),
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_REPORT_FAILED" }));
        }
      };
      const outputMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        if (!isLocalRequest(request.headers.host, server)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision);
          const result = await entry.output;
          const query = outputQueryFromRequest(request.url);
          const responseBody = serializeOutputResult(result, query);
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              ...responseBody,
              diagnostics: sortDevelopmentDiagnostics(result.diagnostics),
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_OUTPUT_FAILED" }));
        }
      };
      server.middlewares.use(reportPath, reportMiddleware);
      server.middlewares.use(outputPath, outputMiddleware);
      return () => {
        prioritizeMiddleware(server, outputMiddleware, outputPath);
        prioritizeMiddleware(server, reportMiddleware, reportPath);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const schedule = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = undefined;
            revision += 1;
            server.hot.send({ type: "custom", event: "riebeckite:inspector" });
          }, invalidationDelayMs);
        };
        const handle = (file: string) => {
          let application: ResolvedHonoxApplication;
          try {
            application = getApplication();
          } catch {
            return;
          }
          if (!isContentWatchTarget(application, file)) return;
          schedule();
        };
        server.watcher.on("add", handle);
        server.watcher.on("unlink", handle);
        server.httpServer?.once("close", () => {
          if (timer) clearTimeout(timer);
          server.watcher.off("add", handle);
          server.watcher.off("unlink", handle);
        });
      };
    },
    handleHotUpdate({ file, server }) {
      let application: ResolvedHonoxApplication | undefined;
      try {
        application = getApplication();
      } catch {
        application = undefined;
      }
      if (!shouldInvalidateInspection(application, file)) return;
      revision += 1;
      server.hot.send({ type: "custom", event: "riebeckite:inspector" });
    },
  };
}

function createInspectionContent(
  application: ResolvedHonoxApplication,
): ContentManager {
  const { config, contentRoot } = application;
  return new ContentManager(
    config.content.source ??
      new FileSystemContentSource(contentRoot, config.content.exclude),
    config.content.exclude,
    { config, commitBuildState: false },
  );
}

async function inspectContentOutputs(
  content: ContentManager,
  application: ResolvedHonoxApplication,
): Promise<OutputResult> {
  try {
    const changes = await content.getOutputChangeSet();
    const plan = buildOutputPlan({
      inventory: [...changes.affected, ...changes.unchanged],
      removed: changes.removed,
      affectedPaths: new Set(changes.affected.map((output) => output.path)),
      cacheAvailable: changes.unchanged.length > 0,
    });
    const buildReasons = await content.getFullRegenerationReasons();
    return {
      output: inspectOutput(changes, plan),
      dependencies: inspectDependencies(changes),
      diagnostics: diagnoseOutputPlan(plan),
      regeneration: await inspectRegeneration(
        application,
        changes,
        buildReasons,
      ),
      affected: changes.affected,
      unchanged: changes.unchanged,
      removed: changes.removed,
      reasons: changes.reasons ?? new Map(),
    };
  } catch {
    return {
      output: {
        status: "unavailable",
        reason: "output inspection failed",
      },
      dependencies: {
        status: "unavailable",
        reason: "dependency inspection failed",
      },
      diagnostics: [],
      regeneration: {
        status: "unavailable",
        reason: "regeneration inspection failed",
      },
      affected: [],
      unchanged: [],
      removed: [],
      reasons: new Map(),
    };
  }
}

function inspectOutput(
  changes: OutputChangeSet,
  plan: ReturnType<typeof buildOutputPlan>,
): OutputInspection {
  return {
    status: "available",
    candidateOutputCount: changes.candidateOutputCount,
    affectedOutputCount: changes.affectedOutputCount,
    unchangedOutputCount: changes.unchangedOutputCount,
    removedOutputCount: changes.removedOutputCount,
    fullRegenerationRequired: changes.fullRegenerationRequired,
    conflicts: plan.conflicts.map((conflict) => ({
      path: conflict.path,
      owners: conflict.owners,
    })),
    affected: [],
    hiddenAffectedCount: changes.affected.length,
    unchanged: [],
    hiddenUnchangedCount: changes.unchanged.length,
    removed: [],
    hiddenRemovedCount: changes.removed.length,
  };
}

function inspectDependencies(changes: OutputChangeSet): DependencyInspection {
  const outputs = [...changes.affected, ...changes.unchanged];
  const kinds = new Map<string, number>();
  let dependencyCount = 0;
  let dependentOutputCount = 0;
  let unknownOutputCount = 0;
  for (const output of outputs) {
    for (const dependency of output.dependencies) {
      dependencyCount += 1;
      kinds.set(dependency.type, (kinds.get(dependency.type) ?? 0) + 1);
    }
    if (output.dependencies.some(({ type }) => type === "unknown")) {
      unknownOutputCount += 1;
    }
    if (output.dependencies.length > 0) dependentOutputCount += 1;
  }
  return {
    status: "available",
    outputCount: outputs.length,
    dependentOutputCount,
    dependencyCount,
    unknownOutputCount,
    kinds: [...kinds.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => ({ kind, count })),
    outputs: [],
    hiddenOutputCount: dependentOutputCount,
  };
}

function serializeOutputResult(
  result: OutputResult,
  query: OutputQuery,
): Pick<OutputResult, "output" | "dependencies" | "regeneration"> & {
  readonly diagnostics: readonly DevelopmentDiagnostic[];
} {
  const allOutputs = [...result.affected, ...result.unchanged];
  const affected = (
    query.status === "all" || query.status === "affected" ? result.affected : []
  ).filter((output) =>
    outputMatches(output, query, result.reasons.get(output.path)),
  );
  const unchanged = (
    query.status === "all" || query.status === "unchanged"
      ? result.unchanged
      : []
  ).filter((output) => outputMatches(output, query, undefined));
  const removed = (
    query.status === "all" || query.status === "removed" ? result.removed : []
  ).filter((output) => outputMatches(output, query, undefined));
  const affectedPage = pageOf(affected, query.page, query.limit);
  const unchangedPage = pageOf(unchanged, query.page, query.limit);
  const removedPage = pageOf(removed, query.page, query.limit);
  const dependencies = allOutputs.filter((output) =>
    dependencyMatches(output, query),
  );
  const dependencyPage = pageOf(
    dependencies,
    query.dependencyPage,
    query.dependencyLimit,
  );
  return {
    output:
      result.output.status === "available"
        ? {
            ...result.output,
            affected: affectedPage.items.map((output) =>
              listedOutput(output, result.reasons.get(output.path)),
            ),
            hiddenAffectedCount: affectedPage.hidden,
            unchanged: unchangedPage.items.map((output) =>
              listedOutput(output, "no tracked dependency changed"),
            ),
            hiddenUnchangedCount: unchangedPage.hidden,
            removed: removedPage.items.map((output) =>
              listedOutput(
                output,
                "not present in the current output inventory",
              ),
            ),
            hiddenRemovedCount: removedPage.hidden,
            lookups:
              query.output || query.changed
                ? outputLookups(result, query)
                : undefined,
          }
        : result.output,
    dependencies:
      result.dependencies.status === "available"
        ? {
            ...result.dependencies,
            outputs: dependencyPage.items.map((output) => ({
              path: output.path,
              dependencies: output.dependencies.map(dependencyLabel),
            })),
            hiddenOutputCount: dependencyPage.hidden,
          }
        : result.dependencies,
    regeneration: result.regeneration,
    diagnostics: result.diagnostics,
  };
}

async function inspectRegeneration(
  application: ResolvedHonoxApplication,
  changes: OutputChangeSet,
  buildReasons: readonly string[],
): Promise<RegenerationInspection> {
  try {
    const statePath = resolveContentBuildStatePath(
      application.config,
      undefined,
    );
    const stateStatus = await readContentBuildStateStatus(statePath);
    const cacheability = isPersistentlyCacheable("", application.config);
    const reasons: RegenerationReason[] = [];
    const unknown: string[] = [];
    for (const reason of new Set(buildReasons)) {
      switch (reason) {
        case "incremental-disabled":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "incremental regeneration is disabled",
          });
          break;
        case "cache-missing-or-invalid":
          if (stateStatus.kind === "missing") {
            reasons.push({
              kind: "build-state-missing",
              source: "content-build-state",
              detail: "the saved build state does not exist",
            });
          } else if (stateStatus.kind === "invalid") {
            reasons.push({
              kind:
                stateStatus.reason === "unsupported-version"
                  ? "build-state-incompatible"
                  : "build-state-invalid",
              source: "content-build-state",
              detail: stateStatus.reason,
            });
          } else {
            reasons.push({
              kind: "cache-missing-or-invalid",
              source: "content-build-plan",
              detail: "the saved build state could not be reused",
            });
          }
          break;
        case "pipeline-fingerprint-changed":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail:
              "the resolved pipeline fingerprint differs from the saved build state",
          });
          break;
        case "content-plugin-uncacheable":
          reasons.push({
            kind: reason,
            source: "content-persistent-cache",
            detail:
              cacheability.reason ??
              "a content plugin prevents persistent caching",
          });
          break;
        case "external-dependency-unavailable":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "an external dependency could not be resolved",
          });
          break;
        case "publishing-state-expired":
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "the saved publishing state has expired",
          });
          break;
        default:
          reasons.push({
            kind: reason,
            source: "content-build-plan",
            detail: "the content build plan reported this reason",
          });
      }
    }
    const unknownOutputCount = [
      ...changes.affected,
      ...changes.unchanged,
    ].filter((output) =>
      output.dependencies.some(({ type }) => type === "unknown"),
    ).length;
    if (changes.fullRegenerationRequired) {
      if (unknownOutputCount > 0) {
        reasons.push({
          kind: "output-dependency-unknown",
          source: "output-change-set",
          detail: `${unknownOutputCount} outputs have unknown dependencies`,
        });
      } else if (
        !reasons.some(
          (reason) => reason.kind === "external-dependency-unavailable",
        )
      ) {
        reasons.push({
          kind: "full-regeneration-required",
          source: "output-change-set",
          detail: "the output change set requires full regeneration",
        });
        unknown.push("output-change-set-cause");
      }
    }
    return {
      status: "available",
      required: reasons.length > 0,
      reasons,
      unknown,
    };
  } catch {
    return {
      status: "unavailable",
      reason: "regeneration inspection failed",
    };
  }
}

function outputQueryFromRequest(url: string | undefined): OutputQuery {
  const parameters = new URL(url ?? outputPath, "http://localhost")
    .searchParams;
  return {
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: pageLimit(parameters.get("limit")),
    query: parameters.get("q") ?? "",
    kind: parameters.get("kind") ?? undefined,
    status: parameters.get("status") ?? "all",
    changed: normalizeChangedTarget(parameters.get("changed")),
    output: parameters.get("output") ?? undefined,
    dependencyPage: nonNegativeInteger(parameters.get("dpage"), 0),
    dependencyLimit: pageLimit(parameters.get("dlimit")),
    dependencyQuery: parameters.get("dq") ?? "",
    dependencyKind: parameters.get("dkind") ?? undefined,
  };
}

function normalizeChangedTarget(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/^content:/, "");
}

function nonNegativeInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function pageLimit(value: string | null): number {
  const parsed = nonNegativeInteger(value, listedOutputLimit);
  return Math.min(
    maximumListedOutputLimit,
    Math.max(1, parsed || listedOutputLimit),
  );
}

function pageOf<T>(
  values: readonly T[],
  page: number,
  limit: number,
): { items: readonly T[]; hidden: number; total: number } {
  const start = page * limit;
  return {
    items: values.slice(start, start + limit),
    hidden: Math.max(0, values.length - start - limit),
    total: values.length,
  };
}

function outputMatches(
  output: OutputDescriptor,
  query: OutputQuery,
  reason: OutputChangeReason | undefined,
): boolean {
  if (query.kind && output.kind !== query.kind) return false;
  if (query.changed) {
    if (reason?.type !== "content" || reason.slug !== query.changed)
      return false;
  }
  return matchesText(
    [output.path, output.kind, output.producer, reasonLabel(reason)],
    query.query,
  );
}

function dependencyMatches(
  output: OutputDescriptor,
  query: OutputQuery,
): boolean {
  if (output.dependencies.length === 0) return false;
  if (
    query.dependencyKind &&
    !output.dependencies.some(
      (dependency) => dependency.type === query.dependencyKind,
    )
  ) {
    return false;
  }
  const labels = output.dependencies.map(dependencyLabel);
  if (query.changed && !labels.includes(`content:${query.changed}`)) {
    return false;
  }
  return matchesText(
    [output.path, output.kind, ...labels],
    query.dependencyQuery,
  );
}

function matchesText(values: readonly (string | undefined)[], query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

function outputLookups(
  result: OutputResult,
  query: OutputQuery,
): OutputLookups {
  const allOutputs = [...result.affected, ...result.unchanged];
  const lookups: {
    output?: OutputLookups["output"];
    changed?: OutputLookups["changed"];
  } = {};
  if (query.output) {
    const selected = allOutputs.find((output) => output.path === query.output);
    if (!selected) {
      lookups.output = { status: "not-found", target: query.output };
    } else {
      const labels = new Set(selected.dependencies.map(dependencyLabel));
      const related = allOutputs.filter(
        (output) =>
          output.path !== selected.path &&
          output.dependencies.some((dependency) =>
            labels.has(dependencyLabel(dependency)),
          ),
      );
      const page = pageOf(related, query.page, query.limit);
      lookups.output = {
        status: "found",
        target: query.output,
        output: listedOutput(selected),
        dependencies: [...labels],
        relatedOutputs: page.items.map((output) => listedOutput(output)),
        hiddenRelatedCount: page.hidden,
      };
    }
  }
  if (query.changed) {
    const target = query.changed;
    const outputs = result.affected.filter((output) => {
      const reason = result.reasons.get(output.path);
      return (
        (reason?.type === "content" && reason.slug === target) ||
        output.dependencies.some(
          (dependency) =>
            dependency.type === "content" && dependency.slug === target,
        )
      );
    });
    const page = pageOf(outputs, query.page, query.limit);
    lookups.changed = {
      target,
      outputCount: outputs.length,
      outputs: page.items.map((output) =>
        listedOutput(output, result.reasons.get(output.path)),
      ),
      hiddenOutputCount: page.hidden,
    };
  }
  return lookups;
}

function listedOutput(
  output: OutputDescriptor,
  reason?: OutputChangeReason | string,
): ListedOutput {
  const label = typeof reason === "string" ? reason : reasonLabel(reason);
  return {
    path: output.path,
    kind: output.kind,
    producer: output.producer,
    ...(label ? { reason: label } : {}),
  };
}

function reasonLabel(
  reason: OutputChangeReason | undefined,
): string | undefined {
  if (!reason) return undefined;
  switch (reason.type) {
    case "new-output":
      return "new output";
    case "kind-changed":
      return `output kind changed from ${reason.previousKind}`;
    case "unknown-dependency":
      return "unknown dependency";
    case "external":
      return `external:${reason.id} changed`;
    case "global":
      return "global dependency changed";
    case "content":
      return `content:${reason.slug} changed`;
    case "tag":
      return `tag:${reason.tag} changed`;
    case "folder":
      return `folder:${reason.folder} changed`;
    case "file":
      return `file:${reason.path} changed`;
    case "public-location":
      return `public-location:${reason.pathname} changed`;
    case "content-query":
      return `content-query:${reason.properties.join(",")}${
        reason.unknown ? "?" : ""
      } changed`;
    case "projection":
      return `projection:${reason.projection} changed`;
  }
}

function dependencyLabel(dependency: OutputDependency): string {
  switch (dependency.type) {
    case "content":
      return `content:${dependency.slug}`;
    case "tag":
      return `tag:${dependency.tag}`;
    case "folder":
      return `folder:${dependency.folder}`;
    case "file":
      return `file:${dependency.path}`;
    case "public-location":
      return `public-location:${dependency.pathname}`;
    case "projection":
      return `projection:${dependency.projection}`;
    case "external":
      return `external:${dependency.id}`;
    case "content-query":
      return `content-query:${dependency.properties.join(",")}${
        dependency.unknown ? "?" : ""
      }`;
    case "global":
      return "global";
    case "unknown":
      return "unknown";
  }
}

function shouldInvalidateInspection(
  application: ResolvedHonoxApplication | undefined,
  file: string,
): boolean {
  if (!application) return true;
  return (
    !isPathInsideDirectory(application.appRoot, file) ||
    isPathInsideDirectory(application.contentRoot, file) ||
    file === application.configFile
  );
}

function isContentWatchTarget(
  application: ResolvedHonoxApplication,
  file: string,
): boolean {
  if (!isPathInsideDirectory(application.contentRoot, file)) return false;
  return !isIgnoredContentPath(
    toLogicalPath(application.contentRoot, file),
    application.config.content.exclude ?? [],
  );
}

function currentPageFromRequest(url: string | undefined): string {
  const value = new URL(url ?? reportPath, "http://localhost").searchParams.get(
    "path",
  );
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function prioritizeMiddleware(
  server: ViteDevServer,
  middleware: unknown,
  path: string,
): void {
  const stack = (
    server.middlewares as unknown as {
      stack?: Array<{ handle: unknown; route?: string }>;
    }
  ).stack;
  const index =
    stack?.findIndex(
      (layer) => layer.handle === middleware || layer.route === path,
    ) ?? -1;
  if (index > 0 && stack) stack.unshift(...stack.splice(index, 1));
}

function isLocalRequest(
  host: string | undefined,
  server: ViteDevServer,
): boolean {
  if (!host) return false;
  const hostname = host.replace(/:\d+$/, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
    return true;
  const address = server.httpServer?.address();
  return typeof address === "object" && address?.address === hostname;
}

function inspectorClientModule(): string {
  return `
const reportEndpoint = ${JSON.stringify(reportPath)};
const outputEndpoint = ${JSON.stringify(outputPath)};
const panelId = "riebeckite-development-inspector";
const outputLimit = ${listedOutputLimit};

let diagnosticQuery = "";
let diagnosticSeverity = "all";
let diagnosticCategory = "all";
let diagnosticCode = "all";
let outputQuery = "";
let outputKind = "all";
let outputStatus = "all";
let outputPage = 0;
let outputChanged = "";
let outputLookup = "";
let dependencyQuery = "";
let dependencyKind = "all";
let dependencyPage = 0;

export function initDevelopmentInspector() {
  let panel;
  let launcher;
  let controller;
  let outputController;
  let generation = 0;
  let report;
  let baseDiagnostics;
  let activeTab = 0;
  let refreshing = false;
  let pendingRefresh = false;
  let loadingTimer;
  const tabs = ["Overview", "Diagnostics", "Dependencies", "Plugins", "Output"];
  const outputUrl = () => {
    const parameters = new URLSearchParams();
    if (outputQuery) parameters.set("q", outputQuery);
    if (outputKind !== "all") parameters.set("kind", outputKind);
    if (outputStatus !== "all") parameters.set("status", outputStatus);
    if (outputChanged) parameters.set("changed", outputChanged);
    if (outputLookup) parameters.set("output", outputLookup);
    if (outputPage > 0) parameters.set("page", String(outputPage));
    parameters.set("limit", String(outputLimit));
    if (dependencyQuery) parameters.set("dq", dependencyQuery);
    if (dependencyKind !== "all") parameters.set("dkind", dependencyKind);
    if (dependencyPage > 0) parameters.set("dpage", String(dependencyPage));
    parameters.set("dlimit", String(outputLimit));
    return outputEndpoint + "?" + parameters.toString();
  };
  const refresh = async () => {
    if (!panel?.isConnected) return;
    if (refreshing) {
      pendingRefresh = true;
      return;
    }
    refreshing = true;
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    try {
      const response = await fetch(reportEndpoint + "?path=" + encodeURIComponent(location.pathname), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Inspector report is unavailable.");
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      report = next;
      baseDiagnostics = next.diagnostics.slice();
      render();
      void loadOutput(current);
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      clearInterval(loadingTimer);
      renderFailure(panel.shadowRoot, error instanceof Error ? error.message : String(error));
      panel.shadowRoot.querySelector("[data-close]").addEventListener("click", close);
    } finally {
      refreshing = false;
      if (pendingRefresh) {
        pendingRefresh = false;
        void refresh();
      }
    }
  };
  const loadOutput = async (current) => {
    if (!report || !panel?.isConnected) return;
    outputController?.abort();
    outputController = new AbortController();
    try {
      const response = await fetch(outputUrl(), { cache: "no-store", signal: outputController.signal });
      if (!response.ok) throw new Error("Inspector output is unavailable.");
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      report.output = next.output;
      report.dependencies = next.dependencies;
      report.regeneration = next.regeneration;
      report.diagnostics = (baseDiagnostics ?? []).concat(next.diagnostics);
      report.summary = summarize(report.diagnostics);
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      report.output = { status: "unavailable", reason: "output inspection failed" };
      report.dependencies = { status: "unavailable", reason: "dependency inspection failed" };
      report.regeneration = { status: "unavailable", reason: "regeneration inspection failed" };
      render();
    }
  };
  const requestOutput = () => {
    if (report && panel?.isConnected) void loadOutput(generation);
  };
  const open = () => {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = panelId;
      panel.attachShadow({ mode: "open" });
    }
    if (!panel.isConnected) document.body.append(panel);
    showLoading();
    void refresh();
  };
  const close = () => {
    generation += 1;
    pendingRefresh = false;
    controller?.abort();
    outputController?.abort();
    clearInterval(loadingTimer);
    panel?.remove();
    launcher?.focus();
  };
  const showLoading = () => {
    if (!panel) return;
    clearInterval(loadingTimer);
    panel.shadowRoot.innerHTML = '<style>' + styles + '</style>' + sectionStart('rb-loading-title') + '<header><strong id="rb-loading-title">Riebeckite Inspector</strong><button type="button" data-close aria-label="Close inspector">Close</button></header><p class="status" aria-live="polite">Loading inspector report…</p></section>';
    const status = panel.shadowRoot.querySelector(".status");
    const started = Date.now();
    loadingTimer = setInterval(() => {
      if (status?.isConnected) status.textContent = 'Loading inspector report… ' + Math.round((Date.now() - started) / 1000) + 's';
    }, 1000);
    panel.shadowRoot.querySelector("[data-close]").addEventListener("click", close);
    setupResize(panel.shadowRoot);
  };
  launcher = document.createElement("button");
  launcher.type = "button";
  launcher.textContent = "Inspector";
  launcher.setAttribute("aria-label", "Open Riebeckite Development Inspector");
  launcher.setAttribute("aria-haspopup", "dialog");
  launcher.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;border:1px solid #434343;border-radius:4px;background:#171717;color:#fff;padding:8px 12px;font:600 12px system-ui;cursor:pointer";
  launcher.addEventListener("click", open);
  document.body.append(launcher);
  window.addEventListener("keydown", (event) => {
    const editable = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
    if (event.key === "Escape" && panel?.isConnected) {
      event.preventDefault();
      close();
    } else if (event.key.toLowerCase() === "r" && event.ctrlKey && event.altKey && !editable) {
      event.preventDefault();
      panel?.isConnected ? close() : open();
    }
  });
  import.meta.hot?.on("riebeckite:inspector", refresh);

  function sectionStart(titleId) {
    return '<section role="dialog" aria-modal="false" aria-labelledby="' + titleId + '" tabindex="-1"><div class="resize" data-resize tabindex="0" role="separator" aria-orientation="vertical" aria-label="Resize inspector"></div>';
  }

  function setupResize(root) {
    const section = root.querySelector("section");
    const handle = root.querySelector("[data-resize]");
    if (!section || !handle || !panel) return;
    const apply = (width) => {
      const maximum = Math.min(window.innerWidth, 900);
      panel.style.setProperty("--rb-width", Math.round(Math.max(360, Math.min(maximum, width))) + "px");
    };
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = section.getBoundingClientRect().width;
      const move = (moveEvent) => {
        apply(startWidth + startX - moveEvent.clientX);
      };
      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    });
    handle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      apply(section.getBoundingClientRect().width + (event.key === "ArrowLeft" ? 32 : -32));
    });
  }

  function render() {
    clearInterval(loadingTimer);
    const root = panel.shadowRoot;
    const active = root.activeElement;
    const focusKey = active?.dataset?.focusKey;
    const selection = active && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : undefined;
    const openDetails = new Set(Array.from(root.querySelectorAll("details[open][data-detail-key]")).map((details) => details.dataset.detailKey));
    root.innerHTML = '<style>' + styles + '</style>' + sectionStart('rb-title') + '<header><div><strong id="rb-title">Riebeckite Inspector</strong><p>Ctrl+Alt+R · drag the left edge to resize</p></div><button type="button" data-close aria-label="Close inspector">Close</button></header><div class="summary"><b>' + report.summary.errors + '</b> errors <b>' + report.summary.warnings + '</b> warnings <b>' + report.summary.info + '</b> info</div><div role="tablist" aria-label="Inspector sections">' + tabs.map((tab, index) => '<button id="rb-tab-' + index + '" role="tab" aria-controls="rb-panel-' + index + '" aria-selected="' + (index === activeTab) + '" tabindex="' + (index === activeTab ? 0 : -1) + '" data-tab="' + index + '">' + tab + '</button>').join("") + '</div><div id="rb-panel-' + activeTab + '" role="tabpanel" aria-labelledby="rb-tab-' + activeTab + '" tabindex="0">' + panelContent() + '</div><p class="status" aria-live="polite">' + (report.output ? "Inspector report updated" : "Inspector report updated · loading output plan…") + '</p></section>';
    root.querySelector("[data-close]").addEventListener("click", close);
    setupResize(root);
    root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = Number(button.dataset.tab); render(); }));
    root.querySelectorAll("[data-diagnostic-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readDiagnosticFilters(root); render(); }));
    root.querySelectorAll("[data-output-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readOutputFilters(root); outputPage = 0; render(); requestOutput(); }));
    root.querySelectorAll("[data-output-page]").forEach((button) => button.addEventListener("click", () => { outputPage = Math.max(0, outputPage + Number(button.dataset.outputPage)); render(); requestOutput(); }));
    root.querySelectorAll("[data-dependency-page]").forEach((button) => button.addEventListener("click", () => { dependencyPage = Math.max(0, dependencyPage + Number(button.dataset.dependencyPage)); render(); requestOutput(); }));
    const lookupInput = root.querySelector("[data-output-lookup]");
    const lookupSubmit = root.querySelector("[data-output-lookup-submit]");
    lookupSubmit?.addEventListener("click", () => { outputLookup = lookupInput?.value.trim() ?? ""; outputPage = 0; render(); requestOutput(); });
    lookupInput?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lookupSubmit?.click(); } });
    root.querySelector("[role=tablist]").addEventListener("keydown", (event) => {
      if (event.key === "Home") activeTab = 0;
      else if (event.key === "End") activeTab = tabs.length - 1;
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") activeTab = (activeTab + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") activeTab = (activeTab + tabs.length - 1) % tabs.length;
      else return;
      event.preventDefault(); render(); root.querySelector('[data-tab="' + activeTab + '"]').focus();
    });
    if (focusKey) {
      const target = Array.from(root.querySelectorAll("[data-focus-key]")).find((element) => element.dataset.focusKey === focusKey);
      if (target) {
        target.focus();
        if (selection && typeof target.setSelectionRange === "function") target.setSelectionRange(selection[0], selection[1]);
      }
    }
    for (const details of root.querySelectorAll("details[data-detail-key]")) {
      if (openDetails.has(details.dataset.detailKey)) details.open = true;
    }
  }
  function panelContent() {
    if (activeTab === 0) return '<dl><dt>Page</dt><dd>' + escapeHtml(report.currentPage) + '</dd><dt>Theme</dt><dd>' + escapeHtml(report.theme) + '</dd><dt>Revision</dt><dd>' + escapeHtml(report.revision) + '</dd></dl>';
    if (activeTab === 1) return diagnosticList(report.diagnostics);
    if (activeTab === 2) return dependencyReport(report.dependencies);
    if (activeTab === 3) return '<ol class="plugins">' + (report.plugins.map((plugin) => '<li><code>#' + plugin.order + '</code> ' + escapeHtml(plugin.name) + ' <small>' + (plugin.enabled ? "enabled" : "disabled") + '</small></li>').join("") || "<li>No plugins configured.</li>") + '</ol>';
    return outputReport(report.output) + regenerationReport(report.regeneration);
  }
}

function readDiagnosticFilters(root) {
  diagnosticQuery = root.querySelector("[data-diagnostic-query]").value;
  diagnosticSeverity = root.querySelector("[data-diagnostic-severity]").value;
  diagnosticCategory = root.querySelector("[data-diagnostic-category]").value;
  diagnosticCode = root.querySelector("[data-diagnostic-code]").value;
}

function readOutputFilters(root) {
  outputQuery = root.querySelector("[data-output-query]")?.value ?? outputQuery;
  outputKind = root.querySelector("[data-output-kind]")?.value ?? outputKind;
  outputStatus = root.querySelector("[data-output-status]")?.value ?? outputStatus;
  outputChanged = root.querySelector("[data-output-changed]")?.value.trim() ?? outputChanged;
  dependencyQuery = root.querySelector("[data-dependency-query]")?.value ?? dependencyQuery;
  dependencyKind = root.querySelector("[data-dependency-kind]")?.value ?? dependencyKind;
}

function summarize(diagnostics) {
  return {
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    info: diagnostics.filter((diagnostic) => diagnostic.severity === "info").length,
  };
}

function diagnosticList(diagnostics) {
  const categories = [...new Set(diagnostics.map((diagnostic) => diagnostic.category))].sort();
  const codes = [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
  const filtered = diagnostics.filter((diagnostic) =>
    (diagnosticSeverity === "all" || diagnostic.severity === diagnosticSeverity) &&
    (diagnosticCategory === "all" || diagnostic.category === diagnosticCategory) &&
    (diagnosticCode === "all" || diagnostic.code === diagnosticCode) &&
    (!diagnosticQuery || [diagnostic.code, diagnostic.message, diagnostic.subject.value, diagnostic.location?.file].filter(Boolean).join(" ").toLowerCase().includes(diagnosticQuery.toLowerCase()))
  );
  return '<div class="filters"><label>Search <input data-diagnostic-filter data-diagnostic-query data-focus-key="diagnostic-query" value="' + escapeHtml(diagnosticQuery) + '"></label><label>Severity <select data-diagnostic-filter data-diagnostic-severity data-focus-key="diagnostic-severity">' + options(["all", "error", "warning", "info"], diagnosticSeverity) + '</select></label><label>Category <select data-diagnostic-filter data-diagnostic-category data-focus-key="diagnostic-category">' + options(["all"].concat(categories), diagnosticCategory) + '</select></label><label>Code <select data-diagnostic-filter data-diagnostic-code data-focus-key="diagnostic-code">' + options(["all"].concat(codes), diagnosticCode) + '</select></label></div><p class="partial">Current-page filtering is unavailable: source-to-page mappings are not recorded.</p><ul>' + (filtered.map((diagnostic, index) =>
    '<li data-severity="' + escapeHtml(diagnostic.severity) + '"><details data-detail-key="' + escapeHtml(diagnostic.fingerprint || "legacy-" + index) + '"><summary><b>' + escapeHtml(diagnostic.code) + '</b> ' + escapeHtml(diagnostic.message) + location(diagnostic) + '</summary><dl><dt>Fingerprint</dt><dd><code>' + escapeHtml(diagnostic.fingerprint || "legacy") + '</code></dd><dt>Subject</dt><dd>' + escapeHtml(diagnostic.subject.kind + (diagnostic.subject.value ? ": " + diagnostic.subject.value : "")) + '</dd>' + detail("Cause", diagnostic.cause) + detail("Details", diagnostic.details) + detail("Fix" + (diagnostic.fix ? " (" + diagnostic.fix.kind + ")" : ""), diagnostic.fix?.description) + '</dl></details></li>'
  ).join("") || "<li>No matching diagnostic findings.</li>") + '</ul>';
}

function options(values, selected) {
  return values.map((value) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + '>' + escapeHtml(value) + '</option>').join("");
}

function detail(label, value) {
  return value ? '<dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd>' : "";
}

function outputReport(output) {
  if (!output) return '<p class="status" aria-live="polite">Loading output plan…</p>';
  if (output.status !== "available") return unavailable("Output", output.reason);
  return '<dl>' +
    '<dt>Candidate</dt><dd>' + output.candidateOutputCount + '</dd>' +
    '<dt>Affected</dt><dd>' + output.affectedOutputCount + '</dd>' +
    '<dt>Unchanged</dt><dd>' + output.unchangedOutputCount + '</dd>' +
    '<dt>Removed</dt><dd>' + output.removedOutputCount + '</dd>' +
    '<dt>Full regeneration</dt><dd>' + (output.fullRegenerationRequired ? "required" : "not required") + '</dd>' +
    '<dt>Owner conflicts</dt><dd>' + output.conflicts.length + '</dd>' +
    '</dl>' +
    '<div class="filters"><label>Search <input data-output-filter data-output-query data-focus-key="output-query" value="' + escapeHtml(outputQuery) + '"></label><label>Kind <select data-output-filter data-output-kind data-focus-key="output-kind">' + options(["all", "content", "redirect", "plugin-page", "generated"], outputKind) + '</select></label><label>Status <select data-output-filter data-output-status data-focus-key="output-status">' + options(["all", "affected", "unchanged", "removed"], outputStatus) + '</select></label><label>Changed content <input data-output-filter data-output-changed data-focus-key="output-changed" value="' + escapeHtml(outputChanged) + '"></label></div>' +
    '<div class="filters"><label>Output path <input data-output-lookup data-focus-key="output-lookup" value="' + escapeHtml(outputLookup) + '"></label><button type="button" data-output-lookup-submit data-focus-key="output-lookup-submit">Inspect path</button></div>' +
    lookupReport(output.lookups) +
    listedOutputs("Affected outputs", output.affected, output.hiddenAffectedCount, "output") +
    listedOutputs("Unchanged outputs", output.unchanged, output.hiddenUnchangedCount, "output") +
    listedOutputs("Removed outputs", output.removed, output.hiddenRemovedCount, "output") +
    conflictList(output.conflicts);
}

function lookupReport(lookups) {
  if (!lookups) return "";
  let html = "";
  if (lookups.output) {
    if (lookups.output.status === "not-found") {
      html += '<p class="partial">Output not found: ' + escapeHtml(lookups.output.target) + '.</p>';
    } else {
      html += '<h3>Output details</h3><p><code>' + escapeHtml(lookups.output.output.path) + '</code> <small>' + escapeHtml(lookups.output.output.kind) + ' · ' + escapeHtml(lookups.output.output.producer) + '</small></p><p class="reason"><b>Dependencies</b> ' + escapeHtml(lookups.output.dependencies.join(", ") || "none") + '</p>' +
        listedOutputs("Related outputs", lookups.output.relatedOutputs, lookups.output.hiddenRelatedCount, "output");
    }
  }
  if (lookups.changed) {
    html += '<h3>Changed content: ' + escapeHtml(lookups.changed.target) + '</h3><p>' + lookups.changed.outputCount + ' affected outputs.</p>' +
      listedOutputs("Direct regeneration targets", lookups.changed.outputs, lookups.changed.hiddenOutputCount, "output");
  }
  return html;
}

function listedOutputs(title, outputs, hiddenCount, pageKind) {
  if (outputs.length === 0) return "";
  return '<h3>' + escapeHtml(title) + '</h3><ul>' + outputs.map((output) =>
    '<li><code>' + escapeHtml(output.path) + '</code> <small>' + escapeHtml(output.kind) + ' · ' + escapeHtml(output.producer) + '</small>' + (output.reason ? '<div class="reason">' + escapeHtml(output.reason) + '</div>' : '') + '</li>'
  ).join("") + '</ul>' + (hiddenCount > 0 ? '<p class="more">' + hiddenCount + ' more not shown.</p>' : "") + pagination(pageKind, hiddenCount);
}

function pagination(kind, hiddenCount) {
  if (kind !== "output" && kind !== "dependency") return "";
  const page = kind === "output" ? outputPage : dependencyPage;
  if (page === 0 && hiddenCount === 0) return "";
  return '<p class="actions"><button type="button" data-' + kind + '-page="-1" data-focus-key="' + kind + '-previous"' + (page === 0 ? " disabled" : "") + '>Previous</button><span>Page ' + (page + 1) + '</span><button type="button" data-' + kind + '-page="1" data-focus-key="' + kind + '-next"' + (hiddenCount === 0 ? " disabled" : "") + '>Next</button></p>';
}

function conflictList(conflicts) {
  if (conflicts.length === 0) return "";
  return '<h3>Owner conflicts</h3><ul>' + conflicts.map((conflict) =>
    '<li><code>' + escapeHtml(conflict.path) + '</code> <small>' + escapeHtml(conflict.owners.join(", ")) + '</small></li>'
  ).join("") + '</ul>';
}

function dependencyReport(dependencies) {
  if (!dependencies) return '<p class="status" aria-live="polite">Loading dependencies…</p>';
  if (dependencies.status !== "available") return unavailable("Dependencies", dependencies.reason);
  return '<dl>' +
    '<dt>Outputs</dt><dd>' + dependencies.outputCount + '</dd>' +
    '<dt>With dependencies</dt><dd>' + dependencies.dependentOutputCount + '</dd>' +
    '<dt>Dependencies</dt><dd>' + dependencies.dependencyCount + '</dd>' +
    '<dt>Unknown outputs</dt><dd>' + dependencies.unknownOutputCount + '</dd>' +
    '</dl>' +
    (dependencies.kinds.length === 0 ? "<p>No output dependencies.</p>" :
      '<h3>Kinds</h3><ul>' + dependencies.kinds.map((kind) =>
        '<li>' + escapeHtml(kind.kind) + ' <small>' + kind.count + '</small></li>'
      ).join("") + '</ul>') +
    '<div class="filters"><label>Search <input data-output-filter data-dependency-query data-focus-key="dependency-query" value="' + escapeHtml(dependencyQuery) + '"></label><label>Dependency kind <select data-output-filter data-dependency-kind data-focus-key="dependency-kind">' + options(["all"].concat(dependencies.kinds.map((kind) => kind.kind)), dependencyKind) + '</select></label></div>' +
    (dependencies.outputs.length === 0 ? '<p class="more">No matching outputs.</p>' :
      '<h3>Outputs</h3><ul>' + dependencies.outputs.map((output) =>
        '<li><code>' + escapeHtml(output.path) + '</code><br><small>' + escapeHtml(output.dependencies.join(", ")) + '</small></li>'
      ).join("") + '</ul>') +
    (dependencies.hiddenOutputCount > 0 ? '<p class="more">' + dependencies.hiddenOutputCount + ' more outputs not shown.</p>' : "") +
    pagination("dependency", dependencies.hiddenOutputCount);
}

function regenerationReport(regeneration) {
  if (!regeneration) return "";
  if (regeneration.status !== "available") return unavailable("Full regeneration reasons", regeneration.reason);
  const required = regeneration.required ? '<p class="partial">Full regeneration is required.</p>' : '<p>No full regeneration reason was reported.</p>';
  const reasons = regeneration.reasons.length === 0 ? "" : '<ul>' + regeneration.reasons.map((reason) =>
    '<li><b>' + escapeHtml(reason.kind) + '</b> <small>' + escapeHtml(reason.source) + '</small>' + (reason.detail ? '<div class="reason">' + escapeHtml(reason.detail) + '</div>' : "") + '</li>'
  ).join("") + '</ul>';
  const unknown = regeneration.unknown.length === 0 ? "" : '<p class="partial">Cause unavailable: ' + escapeHtml(regeneration.unknown.join(", ")) + '.</p>';
  return '<h3>Full regeneration reasons</h3>' + required + reasons + unknown;
}

function unavailable(subject, capability) {
  return '<p class="partial">' + escapeHtml(subject) + ' unavailable: ' + escapeHtml(capability) + '.</p>';
}

function renderFailure(root, message) {
   root.innerHTML = '<style>' + styles + '</style><section role="dialog" aria-modal="false" aria-labelledby="rb-failure-title"><header><strong id="rb-failure-title">Riebeckite Inspector</strong><button type="button" data-close aria-label="Close inspector">Close</button></header><p class="failure" aria-live="polite">' + escapeHtml(message) + '</p></section>';
}

function location(diagnostic) {
  const location = diagnostic.location;
  return location?.file ? ' <small>(' + escapeHtml(location.file) + (location.line ? ':' + location.line : '') + ')</small>' : '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

const styles = ':host{all:initial}section{box-sizing:border-box;position:fixed;right:0;top:0;bottom:0;z-index:2147483647;width:var(--rb-width,min(620px,100vw));max-width:100vw;min-width:360px;overflow:auto;background:#171717;color:#f4f4f4;border-left:1px solid #555;padding:16px 16px 16px 22px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.resize{position:fixed;top:0;bottom:0;right:calc(var(--rb-width,min(620px,100vw)) - 5px);width:10px;z-index:2147483647;cursor:ew-resize;touch-action:none}.resize:focus-visible{outline:2px solid #ffe08a;outline-offset:-2px}header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #555;padding-bottom:8px}header p,.status,small{color:#b8b8b8;margin:2px 0}.summary{margin:12px 0}button,input,select{border:1px solid #666;background:#242424;color:#fff;padding:6px 8px;font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}button[aria-selected="true"]{border-color:#e2c57b;color:#ffe08a}.partial{color:#e2c57b}.more{color:#b8b8b8;margin:4px 0}.reason{color:#b8b8b8;margin:2px 0}.actions{display:flex;align-items:center;gap:8px}.actions span{color:#b8b8b8}h3{color:#b8b8b8;font-size:12px;margin:12px 0 4px;text-transform:uppercase}ul,.plugins{margin:12px 0;padding-left:20px}li{margin:8px 0}li[data-severity="error"]{color:#ff9797}li[data-severity="warning"]{color:#ffe08a}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{color:#b8b8b8}.failure{color:#ff9797}.filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-bottom:1px solid #555;padding:0 0 12px;margin:8px 0}.filters label{display:grid;gap:2px;color:#b8b8b8}.filters input,.filters select{min-width:0}summary{cursor:pointer}.plugins code{color:#b8b8b8}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}@media(max-width:560px){section{min-width:0;width:100vw;padding-left:16px}.resize{display:none}.filters{grid-template-columns:1fr}}';
`;
}
