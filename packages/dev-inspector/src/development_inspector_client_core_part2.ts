export const inspectorClientCorePart2 = `    return await fetch(connection.origin + url, {
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
      pluginTabData = Object.create(null);
      cleanupPluginTab();
      for (const pluginController of Object.values(pluginTabControllers)) pluginController.abort();
      pluginTabControllers = Object.create(null);
      render();
      void loadOutput(current);
      loadActiveTab(current);
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
    try {`;
