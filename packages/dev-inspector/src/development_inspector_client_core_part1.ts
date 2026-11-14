export const inspectorClientCorePart1 = `function localizedText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value[inspectorLanguage] || value.en || "";
}

let diagnosticQuery = "";
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
let contentQuery = "";
let contentVisibility = "all";
let contentStatus = "all";
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
  let activeTab = "overview";
  let refreshing = false;
  let pendingRefresh = false;
  let loadingTimer;
  let themeFrame = 0;
  let pluginTabData = Object.create(null);
  let pluginTabControllers = Object.create(null);
  let pluginCleanup = null;
  let pluginMount = 0;
  const builtInTabs = [
    { id: "overview", label: "Overview", render: () => overviewReport(report) },
    { id: "content", label: "Content", render: () => contentReport(report.content) },
    { id: "diagnostics", label: "Diagnostics", render: () => diagnosticList(report.diagnostics, report) },
    { id: "api", label: "API", render: () => apiLifecycleReport(report.apiLifecycle, report.diagnostics) },
    { id: "dependencies", label: "Dependencies", load: (current) => { if (!graphData) void loadGraph(current); }, render: () => graphReport(graphData) + dependencyReport(report.dependencies) },
    { id: "plugins", label: "Plugins", load: (current) => { if (!pluginData) void loadPlugins(current); }, render: () => pluginExecutionReport(pluginData) },
    { id: "output", label: "Output", render: () => outputReport(report.output) + regenerationReport(report.regeneration) },
    { id: "derived", label: "Derived", render: () => derivedReport(report.derivedViews) },
    { id: "provenance", label: "Provenance", load: (current) => { if (!provenanceData) void loadProvenance(current); }, render: () => provenanceReport(provenanceData) },
    { id: "assets", label: "Assets", load: (current) => { if (!assetsData) void loadAssets(current); }, render: () => assetsReport(assetsData) },
    { id: "theme", label: "Theme", render: () => themeReport(report.themeConfig) }
  ];
  const allTabs = () => builtInTabs.map((tab) => ({ ...tab, label: t(tab.label) })).concat(
    (report?.inspectorTabs ?? []).slice().sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id)).map((tab) => ({
      id: "plugin:" + tab.id,
      label: localizedText(tab.title),
      description: localizedText(tab.description),
      plugin: tab.plugin,
      pluginId: tab.id,
      hasClient: tab.hasClient,
      hasData: tab.hasData,
      error: tab.error
    }))
  );
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
    const connection = await connectInspector();`;
