import { ContentManager, FileSystemContentSource } from "@riebeckite/core";
import { collectDevelopmentDiagnostics } from "@riebeckite/diagnostics";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const endpointPath = "/__riebeckite/inspector/report";

export function riebeckiteDevelopmentInspector(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  return {
    name: "riebeckite-development-inspector",
    apply: "serve",
    resolveId(id) {
      return id === clientModuleId ? resolvedClientModuleId : null;
    },
    load(id) {
      return id === resolvedClientModuleId ? inspectorClientModule() : null;
    },
    configureServer(server) {
      server.middlewares.use(endpointPath, async (request, response) => {
        if (!isLocalRequest(request.headers.host, server)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        try {
          const application = getApplication();
          const source = new FileSystemContentSource(application.contentRoot);
          const content = new ContentManager(
            source,
            application.config.content.exclude,
            { config: application.config },
          );
          const report = await collectDevelopmentDiagnostics({
            config: application.config,
            content,
            revision: Date.now(),
          });
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(JSON.stringify(report));
        } catch {
          response.statusCode = 500;
          response.end();
        }
      });
    },
  };
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
  const refresh = async () => {
    if (!panel?.isConnected) return;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error("Inspector report is unavailable.");
      render(panel.shadowRoot, await response.json());
    } catch (error) {
      renderFailure(panel.shadowRoot, error instanceof Error ? error.message : String(error));
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
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "d" && event.altKey && event.shiftKey) {
      event.preventDefault();
      panel?.isConnected ? panel.remove() : open();
    }
  });
  import.meta.hot?.on("vite:beforeUpdate", refresh);
}

function render(root, report) {
  const diagnostics = report.diagnostics.map((diagnostic) =>
    '<li data-severity="' + escapeHtml(diagnostic.severity) + '"><b>' + escapeHtml(diagnostic.code) + '</b> ' + escapeHtml(diagnostic.message) + location(diagnostic) + '</li>'
  ).join("") || "<li>No diagnostic findings.</li>";
  root.innerHTML = '<style>' + styles + '</style><section><header><strong>Riebeckite Inspector</strong><span>Alt+Shift+D</span></header><p class="summary">' + report.summary.errors + ' errors · ' + report.summary.warnings + ' warnings · ' + report.summary.info + ' info</p><p class="partial">Element inspection: PARTIAL — source and component mappings are unavailable.</p><ul>' + diagnostics + '</ul></section>';
}

function renderFailure(root, message) {
  root.innerHTML = '<style>' + styles + '</style><section><header><strong>Riebeckite Inspector</strong></header><p class="failure">' + escapeHtml(message) + '</p></section>';
}

function location(diagnostic) {
  const location = diagnostic.location;
  return location?.file ? ' <small>(' + escapeHtml(location.file) + (location.line ? ':' + location.line : '') + ')</small>' : '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

const styles = ':host{all:initial}section{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(440px,calc(100vw - 32px));max-height:55vh;overflow:auto;background:#171717;color:#f4f4f4;border:1px solid #555;padding:16px;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 8px 24px #0006}header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #555;padding-bottom:8px}header span,small{color:#b8b8b8}.summary{margin:12px 0}.partial{color:#e2c57b}ul{margin:0;padding-left:20px}li{margin:8px 0}li[data-severity="error"]{color:#ff9797}li[data-severity="warning"]{color:#ffe08a}.failure{color:#ff9797}';
`;
}
