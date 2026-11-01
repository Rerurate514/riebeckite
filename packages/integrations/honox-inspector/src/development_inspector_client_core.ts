export const inspectorClientCore = String.raw`let diagnosticQuery = "";
let diagnosticSeverity = "all";
let diagnosticCategory = "all";
let diagnosticCode = "all";
let diagnosticCurrentPage = false;
let outputQuery = "";
let outputKind = "all";
let outputStatus = "all";
let outputPage = 0;
let outputChanged = "";
let outputLookup = "";
let dependencyQuery = "";
let dependencyKind = "all";
let dependencyPage = 0;
let graphQuery = "";
let graphKind = "all";
let graphDirection = "both";
let graphPage = 0;
let graphSelected = "";
let graphData;
let pluginQuery = "";
let pluginFilter = "all";
let pluginSort = "duration";
let pluginPage = 0;
let pluginData;
let provenanceData;
let assetsData;
let themeQuery = "";
let themeKind = "all";
let derivedQuery = "";
let derivedStatus = "all";
let provenanceQuery = "";
let provenanceKind = "all";

export function initDevelopmentInspector() {
  let panel;
  let launcher;
  let controller;
  let outputController;
  let graphController;
  let pluginController;
  let provenanceController;
  let assetsController;
  let generation = 0;
  let report;
  let baseDiagnostics;
  let activeTab = 0;
  let refreshing = false;
  let pendingRefresh = false;
  let loadingTimer;
  let themeFrame = 0;
  const tabs = ["Overview", "Diagnostics", "API", "Dependencies", "Plugins", "Output", "Derived", "Provenance", "Assets", "Theme"];
  const tabLabel = (tab) => t(tab);
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
  const graphUrl = () => {
    const parameters = new URLSearchParams();
    if (graphQuery) parameters.set("q", graphQuery);
    if (graphKind !== "all") parameters.set("kind", graphKind);
    if (graphDirection !== "both") parameters.set("direction", graphDirection);
    if (graphSelected) parameters.set("node", graphSelected);
    if (graphPage > 0) parameters.set("page", String(graphPage));
    parameters.set("limit", "40");
    return graphEndpoint + "?" + parameters.toString();
  };
  const pluginsUrl = () => {
    const parameters = new URLSearchParams();
    if (pluginQuery) parameters.set("q", pluginQuery);
    if (pluginFilter !== "all") parameters.set("plugin", pluginFilter);
    if (pluginSort !== "duration") parameters.set("sort", pluginSort);
    if (pluginPage > 0) parameters.set("page", String(pluginPage));
    parameters.set("limit", "100");
    return pluginsEndpoint + "?" + parameters.toString();
  };
  let inspectorConnection;
  const connectInspector = async () => {
    if (!inspectorConnection) {
      inspectorConnection = fetch(bootstrapEndpoint, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error(t("Inspector access is unavailable."));
          return await response.json();
        })
        .catch((error) => {
          inspectorConnection = undefined;
          throw error;
        });
    }
    return await inspectorConnection;
  };
  const inspectorFetch = async (url, options = {}) => {
    const connection = await connectInspector();
    return await fetch(connection.origin + url, {
      ...options,
      headers: { ...(options.headers ?? {}), [tokenHeader]: connection.token },
    });
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
      const response = await inspectorFetch(reportEndpoint + "?path=" + encodeURIComponent(location.pathname), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(t("Inspector report is unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      report = next;
      baseDiagnostics = next.diagnostics.slice();
      graphData = undefined;
      pluginData = undefined;
      provenanceData = undefined;
      assetsData = undefined;
      render();
      void loadOutput(current);
      if (activeTab === 3) void loadGraph(current);
      if (activeTab === 4) void loadPlugins(current);
      if (activeTab === 7) void loadProvenance(current);
      if (activeTab === 8) void loadAssets(current);
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
      const response = await inspectorFetch(outputUrl(), { cache: "no-store", signal: outputController.signal });
      if (!response.ok) throw new Error(t("Inspector output is unavailable."));
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
      report.output = { status: "unavailable", reason: t("output inspection failed") };
      report.dependencies = { status: "unavailable", reason: t("dependency inspection failed") };
      report.regeneration = { status: "unavailable", reason: t("regeneration inspection failed") };
      render();
    }
  };
  const requestOutput = () => {
    if (report && panel?.isConnected) void loadOutput(generation);
  };
  const loadGraph = async (current) => {
    if (!report || !panel?.isConnected) return;
    graphController?.abort();
    graphController = new AbortController();
    try {
      const response = await inspectorFetch(graphUrl(), { cache: "no-store", signal: graphController.signal });
      if (!response.ok) throw new Error(t("Inspector graph is unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      graphData = next.graph;
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      graphData = { status: "unavailable", reason: t("dependency graph inspection failed") };
      render();
    }
  };
  const loadPlugins = async (current) => {
    if (!report || !panel?.isConnected) return;
    pluginController?.abort();
    pluginController = new AbortController();
    try {
      const response = await inspectorFetch(pluginsUrl(), { cache: "no-store", signal: pluginController.signal });
      if (!response.ok) throw new Error(t("Inspector plugin execution is unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      pluginData = next.pluginExecution;
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      pluginData = { status: "unavailable", reason: t("plugin execution inspection failed") };
      render();
    }
  };
  const requestGraph = () => {
    graphData = undefined;
    if (report && panel?.isConnected) void loadGraph(generation);
  };
  const requestPlugins = () => {
    pluginData = undefined;
    if (report && panel?.isConnected) void loadPlugins(generation);
  };
  const loadProvenance = async (current) => {
    if (!report || !panel?.isConnected) return;
    provenanceController?.abort();
    provenanceController = new AbortController();
    try {
      const response = await inspectorFetch(provenanceEndpoint, { cache: "no-store", signal: provenanceController.signal });
      if (!response.ok) throw new Error(t("Inspector provenance is unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      provenanceData = next.provenance ? { status: "available", provenance: next.provenance } : { status: "unavailable", reason: t("provenance was not recorded") };
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      provenanceData = { status: "unavailable", reason: t("provenance inspection failed") };
      render();
    }
  };
  const requestProvenance = () => {
    provenanceData = undefined;
    if (report && panel?.isConnected) void loadProvenance(generation);
  };
  const loadAssets = async (current) => {
    if (!report || !panel?.isConnected) return;
    assetsController?.abort();
    assetsController = new AbortController();
    try {
      const response = await inspectorFetch(assetsEndpoint, { cache: "no-store", signal: assetsController.signal });
      if (!response.ok) throw new Error(t("Inspector assets are unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      assetsData = next.assets;
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      assetsData = { status: "unavailable", reason: t("asset inspection failed") };
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
    outputController?.abort();
    graphController?.abort();
    pluginController?.abort();
    provenanceController?.abort();
    assetsController?.abort();
    clearInterval(loadingTimer);
    panel?.remove();
    launcher?.focus();
  };
  const showLoading = () => {
    if (!panel) return;
    clearInterval(loadingTimer);
    panel.shadowRoot.innerHTML = '<style>' + styles + extraStyles + '</style>' + sectionStart('rb-loading-title') + '<header><strong id="rb-loading-title">Riebeckite Inspector</strong><button type="button" data-close aria-label="' + t("Close inspector") + '">' + t("Close") + '</button></header><p class="status" aria-live="polite">' + t("Loading inspector report…") + '</p></section>';
    const status = panel.shadowRoot.querySelector(".status");
    const started = Date.now();
    loadingTimer = setInterval(() => {
      if (status?.isConnected) status.textContent = t("Loading inspector report… {seconds}s", { seconds: Math.round((Date.now() - started) / 1000) });
    }, 1000);
    panel.shadowRoot.querySelector("[data-close]").addEventListener("click", close);
    setupResize(panel.shadowRoot);
  };
  launcher = document.createElement("button");
  launcher.type = "button";
  launcher.textContent = t("Inspector");
  launcher.setAttribute("aria-label", t("Open Riebeckite Development Inspector"));
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
  const refreshTheme = () => {
    if (!panel?.isConnected || activeTab !== 9) return;
    cancelAnimationFrame(themeFrame);
    themeFrame = requestAnimationFrame(() => render());
  };
  new MutationObserver(refreshTheme).observe(document.documentElement, { attributes: true });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", refreshTheme);

  function sectionStart(titleId) {
    return '<section role="dialog" aria-modal="false" aria-labelledby="' + titleId + '" lang="' + inspectorLanguage + '" tabindex="-1"><div class="resize" data-resize tabindex="0" role="separator" aria-orientation="vertical" aria-label="' + t("Resize inspector") + '"></div>';
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
    root.innerHTML = '<style>' + styles + extraStyles + '</style>' + sectionStart('rb-title') + '<header><div><strong id="rb-title">Riebeckite Inspector</strong><p>' + t("Ctrl+Alt+R · drag the left edge to resize") + '</p></div><div class="actions"><select data-language data-focus-key="language" aria-label="' + t("Language") + '"><option value="en"' + (inspectorLanguage === "en" ? " selected" : "") + '>English</option><option value="ja"' + (inspectorLanguage === "ja" ? " selected" : "") + '>日本語</option></select><button type="button" data-close aria-label="' + t("Close inspector") + '">' + t("Close") + '</button></div></header><div class="summary">' + t("{count} errors", { count: '<b>' + report.summary.errors + '</b>' }) + ' ' + t("{count} warnings", { count: '<b>' + report.summary.warnings + '</b>' }) + ' ' + t("{count} info", { count: '<b>' + report.summary.info + '</b>' }) + '</div><div role="tablist" aria-label="' + t("Inspector sections") + '">' + tabs.map((tab, index) => '<button id="rb-tab-' + index + '" role="tab" aria-controls="rb-panel-' + index + '" aria-selected="' + (index === activeTab) + '" tabindex="' + (index === activeTab ? 0 : -1) + '" data-tab="' + index + '">' + tabLabel(tab) + '</button>').join("") + '</div><div id="rb-panel-' + activeTab + '" role="tabpanel" aria-labelledby="rb-tab-' + activeTab + '" tabindex="0">' + panelContent() + '</div><p class="status" aria-live="polite">' + (report.output ? t("Inspector report updated") : t("Inspector report updated · loading output plan…")) + '</p></section>';
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelector("[data-language]").addEventListener("change", (event) => {
      setInspectorLanguage(event.target.value);
      launcher.textContent = t("Inspector");
      launcher.setAttribute("aria-label", t("Open Riebeckite Development Inspector"));
      render();
    });
    setupResize(root);
    root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = Number(button.dataset.tab); render(); if (activeTab === 3 && !graphData) void loadGraph(generation); if (activeTab === 4 && !pluginData) void loadPlugins(generation); if (activeTab === 7 && !provenanceData) void loadProvenance(generation); if (activeTab === 8 && !assetsData) void loadAssets(generation); }));
    root.querySelectorAll("[data-diagnostic-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readDiagnosticFilters(root); render(); }));
    root.querySelectorAll("[data-output-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readOutputFilters(root); outputPage = 0; render(); requestOutput(); }));
    root.querySelectorAll("[data-output-page]").forEach((button) => button.addEventListener("click", () => { outputPage = Math.max(0, outputPage + Number(button.dataset.outputPage)); render(); requestOutput(); }));
    root.querySelectorAll("[data-dependency-page]").forEach((button) => button.addEventListener("click", () => { dependencyPage = Math.max(0, dependencyPage + Number(button.dataset.dependencyPage)); render(); requestOutput(); }));
    root.querySelectorAll("[data-graph-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readGraphFilters(root); graphPage = 0; render(); requestGraph(); }));
    root.querySelectorAll("[data-graph-page]").forEach((button) => button.addEventListener("click", () => { graphPage = Math.max(0, graphPage + Number(button.dataset.graphPage)); render(); requestGraph(); }));
    root.querySelectorAll("[data-graph-selected]").forEach((button) => button.addEventListener("click", () => { graphSelected = button.dataset.graphSelected; graphPage = 0; render(); requestGraph(); }));
    root.querySelector("[data-graph-clear]")?.addEventListener("click", () => { graphSelected = ""; graphQuery = ""; graphKind = "all"; graphDirection = "both"; graphPage = 0; render(); requestGraph(); });
    root.querySelectorAll("[data-graph-output]").forEach((button) => button.addEventListener("click", () => { outputLookup = button.dataset.graphOutput; outputPage = 0; activeTab = 5; render(); requestOutput(); }));
    root.querySelectorAll("[data-graph-content]").forEach((button) => button.addEventListener("click", () => { outputChanged = button.dataset.graphContent; outputPage = 0; activeTab = 5; render(); requestOutput(); }));
    root.querySelectorAll("[data-plugin-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readPluginFilters(root); pluginPage = 0; render(); requestPlugins(); }));
    root.querySelectorAll("[data-plugin-page]").forEach((button) => button.addEventListener("click", () => { pluginPage = Math.max(0, pluginPage + Number(button.dataset.pluginPage)); render(); requestPlugins(); }));
    root.querySelectorAll("[data-theme-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readThemeFilters(root); render(); }));
    root.querySelectorAll("[data-derived-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readDerivedFilters(root); render(); }));
    root.querySelectorAll("[data-provenance-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readProvenanceFilters(root); render(); }));
    root.querySelectorAll("[data-output-graph]").forEach((button) => button.addEventListener("click", () => { graphSelected = "output:" + button.dataset.outputGraph; graphQuery = ""; graphKind = "all"; graphDirection = "both"; graphPage = 0; graphData = undefined; activeTab = 3; render(); requestGraph(); }));
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
    if (activeTab === 0) return '<dl><dt>' + t("Page") + '</dt><dd>' + escapeHtml(report.currentPage) + '</dd><dt>' + t("Theme") + '</dt><dd>' + escapeHtml(report.theme) + '</dd><dt>' + t("Revision") + '</dt><dd>' + escapeHtml(report.revision) + '</dd></dl>';
    if (activeTab === 1) return diagnosticList(report.diagnostics, report);
    if (activeTab === 2) return apiLifecycleReport(report.apiLifecycle, report.diagnostics);
    if (activeTab === 3) return graphReport(graphData) + dependencyReport(report.dependencies);
    if (activeTab === 4) return pluginExecutionReport(pluginData);
    if (activeTab === 5) return outputReport(report.output) + regenerationReport(report.regeneration);
    if (activeTab === 6) return derivedReport(report.derivedViews);
    if (activeTab === 7) return provenanceReport(provenanceData);
    if (activeTab === 8) return assetsReport(assetsData);
    return themeReport(report.themeConfig);
  }
}

`;
