import {
  buildOutputPlan,
  ContentManager,
  type OutputChangeSet,
  type OutputDependency,
  type OutputDescriptor,
} from "@riebeckite/core";
import {
  collectDevelopmentDiagnostics,
  type DevelopmentDiagnostic,
  diagnoseOutputPlan,
  sortDevelopmentDiagnostics,
} from "@riebeckite/diagnostics";
import { FileSystemContentSource } from "@riebeckite/node";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const reportPath = "/__riebeckite/inspector/report";
const outputPath = "/__riebeckite/inspector/output";
const listedOutputLimit = 20;

type ListedOutput = {
  readonly path: string;
  readonly kind: string;
  readonly producer: string;
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
      readonly removed: readonly ListedOutput[];
      readonly hiddenRemovedCount: number;
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
      () => inspectContentOutputs(content),
      () => inspectContentOutputs(content),
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
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              ...result,
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
      };
    },
    handleHotUpdate({ server }) {
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
): Promise<OutputResult> {
  try {
    const changes = await content.getOutputChangeSet();
    const plan = buildOutputPlan({
      inventory: [...changes.affected, ...changes.unchanged],
      removed: changes.removed,
      affectedPaths: new Set(changes.affected.map((output) => output.path)),
      cacheAvailable: changes.unchanged.length > 0,
    });
    return {
      output: inspectOutput(changes, plan),
      dependencies: inspectDependencies(changes),
      diagnostics: diagnoseOutputPlan(plan),
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
    affected: changes.affected.slice(0, listedOutputLimit).map(listOutput),
    hiddenAffectedCount: Math.max(
      0,
      changes.affected.length - listedOutputLimit,
    ),
    removed: changes.removed.slice(0, listedOutputLimit).map(listOutput),
    hiddenRemovedCount: Math.max(0, changes.removed.length - listedOutputLimit),
  };
}

function inspectDependencies(changes: OutputChangeSet): DependencyInspection {
  const outputs = [...changes.affected, ...changes.unchanged];
  const kinds = new Map<string, number>();
  const listed: { path: string; dependencies: string[] }[] = [];
  let dependencyCount = 0;
  let dependentOutputCount = 0;
  let unknownOutputCount = 0;
  let hiddenOutputCount = 0;
  for (const output of outputs) {
    for (const dependency of output.dependencies) {
      dependencyCount += 1;
      kinds.set(dependency.type, (kinds.get(dependency.type) ?? 0) + 1);
    }
    if (output.dependencies.some(({ type }) => type === "unknown")) {
      unknownOutputCount += 1;
    }
    if (output.dependencies.length === 0) continue;
    dependentOutputCount += 1;
    if (listed.length < listedOutputLimit) {
      listed.push({
        path: output.path,
        dependencies: output.dependencies.map(dependencyLabel),
      });
    } else {
      hiddenOutputCount += 1;
    }
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
    outputs: listed,
    hiddenOutputCount,
  };
}

function listOutput(output: OutputDescriptor): ListedOutput {
  return {
    path: output.path,
    kind: output.kind,
    producer: output.producer,
  };
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

export function initDevelopmentInspector() {
  let panel;
  let launcher;
  let controller;
  let generation = 0;
  let report;
  let activeTab = 0;
  let diagnosticQuery = "";
  let diagnosticSeverity = "all";
  let diagnosticCategory = "all";
  let diagnosticCode = "all";
  let refreshing = false;
  let pendingRefresh = false;
  let loadingTimer;
  const tabs = ["Overview", "Diagnostics", "Dependencies", "Plugins", "Output"];
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
    try {
      const response = await fetch(outputEndpoint, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Inspector output is unavailable.");
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      report.output = next.output;
      report.dependencies = next.dependencies;
      report.diagnostics = report.diagnostics.concat(next.diagnostics);
      report.summary = summarize(report.diagnostics);
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      report.output = { status: "unavailable", reason: "output inspection failed" };
      report.dependencies = { status: "unavailable", reason: "dependency inspection failed" };
      render();
    }
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
    clearInterval(loadingTimer);
    panel?.remove();
    launcher?.focus();
  };
  const showLoading = () => {
    if (!panel) return;
    clearInterval(loadingTimer);
    panel.shadowRoot.innerHTML = '<style>' + styles + '</style><section role="dialog" aria-modal="false" aria-labelledby="rb-loading-title"><header><strong id="rb-loading-title">Riebeckite Inspector</strong><button type="button" data-close aria-label="Close inspector">Close</button></header><p class="status" aria-live="polite">Loading inspector report…</p></section>';
    const status = panel.shadowRoot.querySelector(".status");
    const started = Date.now();
    loadingTimer = setInterval(() => {
      if (status?.isConnected) status.textContent = 'Loading inspector report… ' + Math.round((Date.now() - started) / 1000) + 's';
    }, 1000);
    panel.shadowRoot.querySelector("[data-close]").addEventListener("click", close);
  };
  launcher = document.createElement("button");
  launcher.type = "button";
  launcher.textContent = "Inspector";
  launcher.setAttribute("aria-label", "Open Riebeckite Development Inspector");
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

  function render() {
    clearInterval(loadingTimer);
    const root = panel.shadowRoot;
    root.innerHTML = '<style>' + styles + '</style><section role="dialog" aria-modal="false" aria-labelledby="rb-title" tabindex="-1"><header><div><strong id="rb-title">Riebeckite Inspector</strong><p>Ctrl+Alt+R · drag the left edge to resize</p></div><button type="button" data-close aria-label="Close inspector">Close</button></header><div class="summary"><b>' + report.summary.errors + '</b> errors <b>' + report.summary.warnings + '</b> warnings <b>' + report.summary.info + '</b> info</div><div role="tablist" aria-label="Inspector sections">' + tabs.map((tab, index) => '<button id="rb-tab-' + index + '" role="tab" aria-controls="rb-panel-' + index + '" aria-selected="' + (index === activeTab) + '" tabindex="' + (index === activeTab ? 0 : -1) + '" data-tab="' + index + '">' + tab + '</button>').join("") + '</div><div id="rb-panel-' + activeTab + '" role="tabpanel" aria-labelledby="rb-tab-' + activeTab + '" tabindex="0">' + panelContent() + '</div><p class="status" aria-live="polite">' + (report.output ? "Inspector report updated" : "Inspector report updated · loading output plan…") + '</p></section>';
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = Number(button.dataset.tab); render(); }));
    root.querySelectorAll("[data-diagnostic-filter]").forEach((input) => input.addEventListener("input", () => { diagnosticQuery = root.querySelector("[data-diagnostic-query]").value; diagnosticSeverity = root.querySelector("[data-diagnostic-severity]").value; diagnosticCategory = root.querySelector("[data-diagnostic-category]").value; diagnosticCode = root.querySelector("[data-diagnostic-code]").value; render(); }));
    root.querySelector("[role=tablist]").addEventListener("keydown", (event) => {
      if (event.key === "Home") activeTab = 0;
      else if (event.key === "End") activeTab = tabs.length - 1;
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") activeTab = (activeTab + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") activeTab = (activeTab + tabs.length - 1) % tabs.length;
      else return;
      event.preventDefault(); render(); root.querySelector('[data-tab="' + activeTab + '"]').focus();
    });
  }
  function panelContent() {
    if (activeTab === 0) return '<dl><dt>Page</dt><dd>' + escapeHtml(report.currentPage) + '</dd><dt>Theme</dt><dd>' + escapeHtml(report.theme) + '</dd><dt>Revision</dt><dd>' + escapeHtml(report.revision) + '</dd></dl>';
    if (activeTab === 1) return diagnosticList(report.diagnostics);
    if (activeTab === 2) return dependencyReport(report.dependencies);
    if (activeTab === 3) return '<ol class="plugins">' + (report.plugins.map((plugin) => '<li><code>#' + plugin.order + '</code> ' + escapeHtml(plugin.name) + ' <small>' + (plugin.enabled ? "enabled" : "disabled") + '</small></li>').join("") || "<li>No plugins configured.</li>") + '</ol>';
    return outputReport(report.output);
  }
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
  return '<div class="filters"><label>Search <input data-diagnostic-filter data-diagnostic-query value="' + escapeHtml(diagnosticQuery) + '"></label><label>Severity <select data-diagnostic-filter data-diagnostic-severity>' + options(["all", "error", "warning", "info"], diagnosticSeverity) + '</select></label><label>Category <select data-diagnostic-filter data-diagnostic-category>' + options(["all"].concat(categories), diagnosticCategory) + '</select></label><label>Code <select data-diagnostic-filter data-diagnostic-code>' + options(["all"].concat(codes), diagnosticCode) + '</select></label></div><p class="partial">Current-page filtering is unavailable: source-to-page mappings are not recorded.</p><ul>' + (filtered.map((diagnostic) =>
    '<li data-severity="' + escapeHtml(diagnostic.severity) + '"><details><summary><b>' + escapeHtml(diagnostic.code) + '</b> ' + escapeHtml(diagnostic.message) + location(diagnostic) + '</summary><dl><dt>Fingerprint</dt><dd><code>' + escapeHtml(diagnostic.fingerprint || "legacy") + '</code></dd><dt>Subject</dt><dd>' + escapeHtml(diagnostic.subject.kind + (diagnostic.subject.value ? ": " + diagnostic.subject.value : "")) + '</dd>' + detail("Cause", diagnostic.cause) + detail("Details", diagnostic.details) + detail("Fix" + (diagnostic.fix ? " (" + diagnostic.fix.kind + ")" : ""), diagnostic.fix?.description) + '</dl></details></li>'
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
    listedOutputs("Affected outputs", output.affected, output.hiddenAffectedCount) +
    listedOutputs("Removed outputs", output.removed, output.hiddenRemovedCount) +
    conflictList(output.conflicts);
}

function listedOutputs(title, outputs, hiddenCount) {
  if (outputs.length === 0) return "";
  return '<h3>' + escapeHtml(title) + '</h3><ul>' + outputs.map((output) =>
    '<li><code>' + escapeHtml(output.path) + '</code> <small>' + escapeHtml(output.kind) + ' · ' + escapeHtml(output.producer) + '</small></li>'
  ).join("") + '</ul>' + (hiddenCount > 0 ? '<p class="more">' + hiddenCount + ' more not shown.</p>' : "");
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
    (dependencies.outputs.length === 0 ? "" :
      '<h3>Outputs</h3><ul>' + dependencies.outputs.map((output) =>
        '<li><code>' + escapeHtml(output.path) + '</code><br><small>' + escapeHtml(output.dependencies.join(", ")) + '</small></li>'
      ).join("") + '</ul>') +
    (dependencies.hiddenOutputCount > 0 ? '<p class="more">' + dependencies.hiddenOutputCount + ' more outputs not shown.</p>' : "");
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

const styles = ':host{all:initial}section{box-sizing:border-box;position:fixed;right:0;top:0;bottom:0;z-index:2147483647;width:min(620px,100vw);min-width:360px;resize:horizontal;overflow:auto;background:#171717;color:#f4f4f4;border-left:1px solid #555;padding:16px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #555;padding-bottom:8px}header p,.status,small{color:#b8b8b8;margin:2px 0}.summary{margin:12px 0}button,input,select{border:1px solid #666;background:#242424;color:#fff;padding:6px 8px;font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}button[aria-selected="true"]{border-color:#e2c57b;color:#ffe08a}.partial{color:#e2c57b}.more{color:#b8b8b8;margin:4px 0}h3{color:#b8b8b8;font-size:12px;margin:12px 0 4px;text-transform:uppercase}ul,.plugins{margin:12px 0;padding-left:20px}li{margin:8px 0}li[data-severity="error"]{color:#ff9797}li[data-severity="warning"]{color:#ffe08a}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{color:#b8b8b8}.failure{color:#ff9797}.filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-bottom:1px solid #555;padding:0 0 12px}.filters label{display:grid;gap:2px;color:#b8b8b8}.filters input,.filters select{min-width:0}summary{cursor:pointer}.plugins code{color:#b8b8b8}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}@media(max-width:560px){section{min-width:0;width:100vw;resize:none}.filters{grid-template-columns:1fr}}';
`;
}
