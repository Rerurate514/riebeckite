import { collectDevelopmentDiagnostics } from "@riebeckite/diagnostics";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const endpointPath = "/__riebeckite/inspector/report";

export function riebeckiteDevelopmentInspector(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  let revision = 0;
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
      const middleware = async (
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
          const report = await collectDevelopmentDiagnostics({
            config: application.config,
            revision,
          });
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          const currentPage = currentPageFromRequest(request.url);
          response.end(
            JSON.stringify({
              ...report,
              generatedAt: new Date().toISOString(),
              currentPage,
              theme: application.config.theme.name,
              plugins: application.config.plugins.map((plugin) => plugin.name),
              capabilities: {
                dependencies: "unavailable",
                output: "unavailable",
                pageMetadata: "unavailable",
              },
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_REPORT_FAILED" }));
        }
      };
      server.middlewares.use(endpointPath, middleware);
      return () => prioritizeMiddleware(server, middleware);
    },
    handleHotUpdate({ server }) {
      revision += 1;
      server.hot.send({ type: "custom", event: "riebeckite:inspector" });
    },
  };
}

function currentPageFromRequest(url: string | undefined): string {
  const value = new URL(url ?? endpointPath, "http://localhost").searchParams.get(
    "path",
  );
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

function prioritizeMiddleware(
  server: ViteDevServer,
  middleware: unknown,
): void {
  const stack = (
    server.middlewares as unknown as {
      stack?: Array<{ handle: unknown; route?: string }>;
    }
  ).stack;
  const index =
    stack?.findIndex(
      (layer) => layer.handle === middleware || layer.route === endpointPath,
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
const endpoint = ${JSON.stringify(endpointPath)};
const panelId = "riebeckite-development-inspector";

export function initDevelopmentInspector() {
  let panel;
  let launcher;
  let controller;
  let generation = 0;
  let report;
  let activeTab = 0;
  const tabs = ["Overview", "Diagnostics", "Dependencies", "Plugins", "Output"];
  const refresh = async () => {
    if (!panel?.isConnected) return;
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    try {
      const response = await fetch(endpoint + "?path=" + encodeURIComponent(location.pathname), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Inspector report is unavailable.");
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      report = next;
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
       renderFailure(panel.shadowRoot, error instanceof Error ? error.message : String(error));
       panel.shadowRoot.querySelector("[data-close]").addEventListener("click", close);
    }
  };
  const open = () => {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = panelId;
      panel.attachShadow({ mode: "open" });
      document.body.append(panel);
    }
    refresh();
  };
  const close = () => {
    generation += 1;
    controller?.abort();
    panel?.remove();
    launcher?.focus();
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
    const root = panel.shadowRoot;
    root.innerHTML = '<style>' + styles + '</style><section role="dialog" aria-modal="false" aria-labelledby="rb-title" tabindex="-1"><header><div><strong id="rb-title">Riebeckite Inspector</strong><p>Ctrl+Alt+R</p></div><button type="button" data-close aria-label="Close inspector">Close</button></header><div class="summary"><b>' + report.summary.errors + '</b> errors <b>' + report.summary.warnings + '</b> warnings <b>' + report.summary.info + '</b> info</div><div role="tablist" aria-label="Inspector sections">' + tabs.map((tab, index) => '<button id="rb-tab-' + index + '" role="tab" aria-controls="rb-panel-' + index + '" aria-selected="' + (index === activeTab) + '" tabindex="' + (index === activeTab ? 0 : -1) + '" data-tab="' + index + '">' + tab + '</button>').join("") + '</div><div id="rb-panel-' + activeTab + '" role="tabpanel" aria-labelledby="rb-tab-' + activeTab + '" tabindex="0">' + panelContent() + '</div><p class="status" aria-live="polite">Inspector report updated</p></section>';
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = Number(button.dataset.tab); render(); }));
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
    if (activeTab === 2) return unavailable("Dependencies", report.capabilities.dependencies);
    if (activeTab === 3) return '<ul>' + (report.plugins.map((plugin) => '<li>' + escapeHtml(plugin) + '</li>').join("") || "<li>No plugins configured.</li>") + '</ul>';
    return unavailable("Output", report.capabilities.output);
  }
}

function diagnosticList(diagnostics) {
  return '<ul>' + (diagnostics.map((diagnostic) =>
    '<li data-severity="' + escapeHtml(diagnostic.severity) + '"><b>' + escapeHtml(diagnostic.code) + '</b> ' + escapeHtml(diagnostic.message) + location(diagnostic) + '</li>'
  ).join("") || "<li>No diagnostic findings.</li>") + '</ul>';
}

function unavailable(subject, capability) {
  return '<p class="partial">' + escapeHtml(subject) + ': ' + escapeHtml(capability) + ' in the development inspector.</p>';
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

const styles = ':host{all:initial}section{position:fixed;right:16px;bottom:56px;z-index:2147483647;width:min(540px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#171717;color:#f4f4f4;border:1px solid #555;padding:16px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 8px 24px #0006}header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #555;padding-bottom:8px}header p,.status,small{color:#b8b8b8;margin:2px 0}.summary{margin:12px 0}button{border:1px solid #666;background:#242424;color:#fff;padding:6px 8px;cursor:pointer}button[aria-selected="true"]{border-color:#e2c57b;color:#ffe08a}.partial{color:#e2c57b}ul{margin:12px 0;padding-left:20px}li{margin:8px 0}li[data-severity="error"]{color:#ff9797}li[data-severity="warning"]{color:#ffe08a}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{color:#b8b8b8}.failure{color:#ff9797}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}@media(max-width:560px){section{right:8px;bottom:52px;width:calc(100vw - 32px);max-height:75vh}}';
`;
}
