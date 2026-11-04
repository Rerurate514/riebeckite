export const inspectorClientRender = `function readDerivedFilters(root) {
  derivedQuery = root.querySelector("[data-derived-query]").value;
  derivedStatus = root.querySelector("[data-derived-status]").value;
}

function readDiagnosticFilters(root) {
  diagnosticQuery = root.querySelector("[data-diagnostic-query]").value;
  diagnosticSeverity = root.querySelector("[data-diagnostic-severity]").value;
  diagnosticCategory = root.querySelector("[data-diagnostic-category]").value;
  diagnosticCode = root.querySelector("[data-diagnostic-code]").value;
  diagnosticCurrentPage = root.querySelector("[data-diagnostic-current-page]")?.checked ?? false;
}

function readContentFilters(root) {
  contentQuery = root.querySelector("[data-content-query]")?.value ?? contentQuery;
  contentVisibility = root.querySelector("[data-content-visibility]")?.value ?? contentVisibility;
  contentStatus = root.querySelector("[data-content-status]")?.value ?? contentStatus;
}

function formatDuration(milliseconds) {
  return milliseconds < 1000 ? Math.round(milliseconds) + " ms" : (milliseconds / 1000).toFixed(2) + " s";
}

function overviewReport(report) {
  const base = '<dl><dt>' + t("Page") + '</dt><dd>' + escapeHtml(report.currentPage) + '</dd><dt>' + t("Theme") + '</dt><dd>' + escapeHtml(report.theme) + '</dd><dt>' + t("Revision") + '</dt><dd>' + escapeHtml(report.revision) + '</dd></dl>';
  const performance = report.performance;
  if (!performance) return base + '<p class="more">' + t("Build performance is unavailable.") + '</p>';
  const slowest = Array.isArray(performance.slowestPlugins) && performance.slowestPlugins.length > 0
    ? '<h3>' + t("Slowest plugins") + '</h3><ul>' + performance.slowestPlugins.map((plugin) =>
      '<li><b>' + escapeHtml(plugin.name) + '</b> <small>' + escapeHtml(formatDuration(plugin.durationMs)) + ' · ' + plugin.executed + ' / ' + plugin.reused + ' ' + t("executed / reused") + '</small></li>'
    ).join("") + '</ul>'
    : "";
  return base +
    '<h3>' + t("Build performance") + '</h3><dl>' +
    '<dt>' + t("Build duration") + '</dt><dd>' + escapeHtml(formatDuration(performance.durationMs)) + '</dd>' +
    '<dt>' + t("Manifest hooks") + '</dt><dd>' + performance.manifestHooksExecuted + ' / ' + performance.manifestHooksReused + ' ' + t("executed / reused") + '</dd>' +
    '<dt>' + t("Hook duration") + '</dt><dd>' + escapeHtml(formatDuration(performance.manifestHookDurationMs)) + '</dd>' +
    '<dt>' + t("Cache hits") + '</dt><dd>' + performance.manifestHookCacheHit + '</dd>' +
    '<dt>' + t("Cache misses") + '</dt><dd>' + performance.manifestHookCacheMiss + '</dd>' +
    '</dl>' + slowest;
}

function contentReport(data) {
  if (!data || data.status === "unavailable") return '<p class="status" aria-live="polite">' + t("Content inventory is unavailable.") + '</p>';
  const counts = data.counts;
  const orphanSlugs = new Set((data.orphans || []).map((orphan) => orphan.slug));
  const query = contentQuery.trim().toLowerCase();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const filtered = entries.filter((entry) => {
    if (contentVisibility !== "all" && entry.visibility !== contentVisibility) return false;
    if (contentStatus === "routable" && !entry.routable) return false;
    if (contentStatus === "discoverable" && !entry.discoverable) return false;
    if (contentStatus === "orphan" && !orphanSlugs.has(entry.slug)) return false;
    if (!query) return true;
    return [entry.title, entry.slug, entry.permalink]
      .concat(entry.aliases || [], (entry.redirects || []).flatMap((redirect) => [redirect.from, redirect.to]))
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const listed = filtered.slice(0, 200);
  const rows = listed.map((entry) => {
    const aliases = (entry.aliases || []).map(escapeHtml).join("<br>");
    const redirects = (entry.redirects || []).map((redirect) => escapeHtml(redirect.from) + " → " + escapeHtml(redirect.to)).join("<br>");
    return '<tr><td><strong>' + escapeHtml(entry.title) + '</strong><br><small>' + escapeHtml(entry.slug) + '</small></td><td><code>' + escapeHtml(entry.permalink) + '</code>' + (entry.language ? '<br><small>' + escapeHtml(entry.language) + '</small>' : '') + '</td><td>' + escapeHtml(t(entry.visibility)) + (entry.routable ? '' : '<br><small>' + t("not routable") + '</small>') + '</td><td>' + entry.incomingLinks + '</td><td>' + entry.unresolvedLinks.length + '</td><td>' + aliases + '</td><td>' + redirects + '</td></tr>';
  }).join("");
  const unresolved = (data.unresolved || []).slice(0, 100).map((link) => '<li><code>' + escapeHtml(link.source) + '</code> → <code>' + escapeHtml(link.raw) + '</code></li>').join("");
  const ambiguities = (data.ambiguities || []).slice(0, 50).map((target) => '<li><code>' + escapeHtml(target.key) + '</code> <small>' + escapeHtml(target.candidates.join(", ")) + '</small></li>').join("");
  const orphans = (data.orphans || []).slice(0, 100).map((entry) => '<li><b>' + escapeHtml(entry.title) + '</b> <code>' + escapeHtml(entry.permalink) + '</code></li>').join("");
  return '<dl>' +
    '<dt>' + t("Entries") + '</dt><dd>' + counts.entries + '</dd>' +
    '<dt>' + t("Public") + '</dt><dd>' + counts.public + '</dd>' +
    '<dt>' + t("Unlisted") + '</dt><dd>' + counts.unlisted + '</dd>' +
    '<dt>' + t("Draft") + '</dt><dd>' + counts.draft + '</dd>' +
    '<dt>' + t("Scheduled") + '</dt><dd>' + counts.scheduled + '</dd>' +
    '<dt>' + t("Routable") + '</dt><dd>' + counts.routable + '</dd>' +
    '<dt>' + t("Discoverable") + '</dt><dd>' + counts.discoverable + '</dd>' +
    '<dt>' + t("Orphan pages") + '</dt><dd>' + counts.orphans + '</dd>' +
    '<dt>' + t("Unresolved links") + '</dt><dd>' + counts.unresolvedLinks + '</dd>' +
    '<dt>' + t("Ambiguous targets") + '</dt><dd>' + counts.ambiguousKeys + '</dd>' +
    '</dl>' +
    '<div class="filters"><label>' + t("Search") + ' <input data-content-filter data-content-query data-focus-key="content-query" value="' + escapeHtml(contentQuery) + '" placeholder="' + escapeHtml(t("Title, path, alias, or redirect")) + '"></label><label>' + t("Visibility") + ' <select data-content-filter data-content-visibility data-focus-key="content-visibility">' + options(["all", "public", "unlisted", "draft", "scheduled"], contentVisibility) + '</select></label><label>' + t("Status") + ' <select data-content-filter data-content-status data-focus-key="content-status">' + options(["all", "routable", "discoverable", "orphan"], contentStatus) + '</select></label></div>' +
    (listed.length > 0
      ? '<table><thead><tr><th>' + t("Title") + '</th><th>' + t("Path") + '</th><th>' + t("Visibility") + '</th><th>' + t("Incoming links") + '</th><th>' + t("Unresolved links") + '</th><th>' + t("Aliases") + '</th><th>' + t("Redirects") + '</th></tr></thead><tbody>' + rows + '</tbody></table>'
      : '<p class="more">' + t("No matching content.") + '</p>') +
    (filtered.length > listed.length ? '<p class="more">' + t("{count} more not shown.", { count: filtered.length - listed.length }) + '</p>' : '') +
    '<h3>' + t("Unresolved links") + '</h3>' + (unresolved ? '<ul>' + unresolved + '</ul>' : '<p class="more">' + t("No unresolved links.") + '</p>') +
    ((data.unresolved || []).length > 100 ? '<p class="more">' + t("{count} more not shown.", { count: data.unresolved.length - 100 }) + '</p>' : '') +
    '<h3>' + t("Ambiguous targets") + '</h3>' + (ambiguities ? '<ul>' + ambiguities + '</ul>' : '<p class="more">' + t("No ambiguous targets.") + '</p>') +
    '<h3>' + t("Orphan pages") + '</h3>' + (orphans ? '<ul>' + orphans + '</ul>' : '<p class="more">' + t("No orphan pages.") + '</p>');
}

function readOutputFilters(root) {
  outputQuery = root.querySelector("[data-output-query]")?.value ?? outputQuery;
  outputKind = root.querySelector("[data-output-kind]")?.value ?? outputKind;
  outputStatus = root.querySelector("[data-output-status]")?.value ?? outputStatus;
  outputChanged = root.querySelector("[data-output-changed]")?.value.trim() ?? outputChanged;
  dependencyQuery = root.querySelector("[data-dependency-query]")?.value ?? dependencyQuery;
  dependencyKind = root.querySelector("[data-dependency-kind]")?.value ?? dependencyKind;
}

function readGraphFilters(root) {
  graphQuery = root.querySelector("[data-graph-query]")?.value ?? graphQuery;
  graphKind = root.querySelector("[data-graph-kind]")?.value ?? graphKind;
  graphDirection = root.querySelector("[data-graph-direction]")?.value ?? graphDirection;
}

function readPluginFilters(root) {
  pluginQuery = root.querySelector("[data-plugin-query]")?.value ?? pluginQuery;
  pluginFilter = root.querySelector("[data-plugin-select]")?.value ?? pluginFilter;
  pluginSort = root.querySelector("[data-plugin-sort]")?.value ?? pluginSort;
}

function readThemeFilters(root) {
  themeQuery = root.querySelector("[data-theme-query]")?.value ?? themeQuery;
  themeKind = root.querySelector("[data-theme-kind]")?.value ?? themeKind;
}

function readProvenanceFilters(root) {
  provenanceQuery = root.querySelector("[data-provenance-query]")?.value ?? provenanceQuery;
  provenanceKind = root.querySelector("[data-provenance-kind]")?.value ?? provenanceKind;
}

function summarize(diagnostics) {
  return {
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    info: diagnostics.filter((diagnostic) => diagnostic.severity === "info").length,
  };
}

function diagnosticList(diagnostics, report) {
  const categories = [...new Set(diagnostics.map((diagnostic) => diagnostic.category))].sort();
  const codes = [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort();
  const pageSources = Array.isArray(report.currentPageSources) ? report.currentPageSources : [];
  const scopeToPage = diagnosticCurrentPage && pageSources.length > 0;
  const filtered = diagnostics.filter((diagnostic) =>
    (diagnosticSeverity === "all" || diagnostic.severity === diagnosticSeverity) &&
    (diagnosticCategory === "all" || diagnostic.category === diagnosticCategory) &&
    (diagnosticCode === "all" || diagnostic.code === diagnosticCode) &&
    (!scopeToPage || diagnosticMatchesPage(diagnostic, pageSources)) &&
    (!diagnosticQuery || [diagnostic.code, diagnostic.message, diagnostic.subject.value, diagnostic.location?.file].filter(Boolean).join(" ").toLowerCase().includes(diagnosticQuery.toLowerCase()))
  );
  const pageScope = pageSources.length > 0
    ? '<label><input type="checkbox" data-diagnostic-filter data-diagnostic-current-page data-focus-key="diagnostic-current-page"' + (diagnosticCurrentPage ? " checked" : "") + '> ' + t("Only this page ({sources})", { sources: escapeHtml(pageSources.join(", ")) }) + '</label>'
    : '<span class="partial">' + t("No source is mapped to {page}; showing all diagnostics.", { page: escapeHtml(report.currentPage) }) + '</span>';
  return '<div class="filters"><label>' + t("Search") + ' <input data-diagnostic-filter data-diagnostic-query data-focus-key="diagnostic-query" value="' + escapeHtml(diagnosticQuery) + '"></label><label>' + t("Severity") + ' <select data-diagnostic-filter data-diagnostic-severity data-focus-key="diagnostic-severity">' + options(["all", "error", "warning", "info"], diagnosticSeverity) + '</select></label><label>' + t("Category") + ' <select data-diagnostic-filter data-diagnostic-category data-focus-key="diagnostic-category">' + options(["all"].concat(categories), diagnosticCategory) + '</select></label><label>' + t("Code") + ' <select data-diagnostic-filter data-diagnostic-code data-focus-key="diagnostic-code">' + options(["all"].concat(codes), diagnosticCode) + '</select></label>' + pageScope + '</div><ul>' + (filtered.map((diagnostic, index) =>
    '<li data-severity="' + escapeHtml(diagnostic.severity) + '"><details data-detail-key="' + escapeHtml(diagnostic.fingerprint || "legacy-" + index) + '"><summary><b>' + escapeHtml(diagnostic.code) + '</b> ' + escapeHtml(diagnostic.message) + location(diagnostic) + '</summary><dl><dt>' + t("Fingerprint") + '</dt><dd><code>' + escapeHtml(diagnostic.fingerprint || "legacy") + '</code></dd><dt>' + t("Subject") + '</dt><dd>' + escapeHtml(diagnostic.subject.kind + (diagnostic.subject.value ? ": " + diagnostic.subject.value : "")) + '</dd>' + detail("Cause", diagnostic.cause) + detail("Details", diagnostic.details) + detail(diagnostic.fix ? "Fix ({kind})" : "Fix", diagnostic.fix?.description, diagnostic.fix?.kind) + '</dl></details></li>'
  ).join("") || "<li>" + t("No matching diagnostic findings.") + "</li>") + '</ul>';
}

function options(values, selected) {
  return values.map((value) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + '>' + escapeHtml(t(value)) + '</option>').join("");
}

function detail(label, value, kind) {
  return value ? '<dt>' + escapeHtml(t(label, { kind })) + '</dt><dd>' + escapeHtml(value) + '</dd>' : "";
}

function apiLifecycleReport(apiLifecycle, diagnostics) {
  if (!apiLifecycle) return '<p class="status" aria-live="polite">' + t("API lifecycle metadata is unavailable.") + '</p>';
  const entries = Array.isArray(apiLifecycle.entries) ? apiLifecycle.entries : [];
  const issues = Array.isArray(apiLifecycle.issues) ? apiLifecycle.issues : [];
  const deprecated = entries.filter((entry) => entry.status === "deprecated");
  const apiDiagnostics = diagnostics.filter((diagnostic) => diagnostic.category === "api");
  const used = new Set(apiDiagnostics.filter((diagnostic) => diagnostic.severity === "warning").map((diagnostic) => diagnostic.subject.value).filter(Boolean));
  const issueList = issues.length > 0
    ? '<h3>' + t("Registry issues") + '</h3><ul>' + issues.map((issue) => '<li><b>' + escapeHtml(issue.apiId || "api-lifecycle") + '</b> <code>' + escapeHtml(issue.code) + '</code> ' + escapeHtml(issue.message) + '</li>').join("") + '</ul>'
    : '<p class="more">' + t("No API lifecycle issues.") + '</p>';
  const entryList = entries.length > 0
    ? '<ul>' + entries.map((entry) => {
      const diagnostic = apiDiagnostics.find((candidate) => candidate.subject.value === entry.id);
      return '<li><details data-detail-key="' + escapeHtml("api-" + entry.id) + '"><summary><b>' + escapeHtml(entry.id) + '</b> <small>' + escapeHtml(t(entry.status)) + '</small></summary><dl>' +
        detail("Status", entry.status) +
        detail("Kind", entry.kind) +
        detail("Package", entry.package || entry.id.split("#")[0]) +
        detail("Deprecated since", entry.deprecatedSince) +
        detail("Replacement", entry.replacement) +
        detail("Removal", entry.removalVersion || (entry.status === "deprecated" ? t("not confirmed") : undefined)) +
        detail("Migration guide", entry.migrationGuide) +
        detail("Reason", entry.reason) +
        detail("Summary", entry.summary) +
        (entry.status === "deprecated" ? detail("Usage", used.has(entry.id) ? "detected" : "not detected") : "") +
        detail(
          "Location",
          diagnostic?.location?.file
            ? diagnostic.location.file +
                (diagnostic.location.line ? ":" + diagnostic.location.line : "")
            : undefined,
        ) +
        '</dl></details></li>';
    }).join("") + '</ul>'
    : '<p class="more">' + t("No lifecycle-managed APIs are registered.") + '</p>';
  return '<dl>' +
    '<dt>' + t("Managed APIs") + '</dt><dd>' + entries.length + '</dd>' +
    '<dt>' + t("Deprecated APIs") + '</dt><dd>' + deprecated.length + '</dd>' +
    '<dt>' + t("Registry issues") + '</dt><dd>' + issues.length + '</dd>' +
    '</dl>' +
    issueList +
    '<h3>' + t("API lifecycle") + '</h3>' +
    entryList +
    '<p class="partial">' + t("API lifecycle metadata is read-only.") + '</p>';
}

function graphReport(graph) {
  if (!graph) return '<p class="status" aria-live="polite">' + t("Loading dependency graph…") + '</p>';
  if (graph.status !== "available") return unavailable("Dependency graph", graph.reason);
  const kinds = [...new Set([].concat(
    ["content", "redirect", "plugin-page", "generated"],
    graph.summary.kinds.map((kind) => kind.kind)
  ))].sort();
  const nodes = graph.nodes.slice();
  const selected = graph.selected;
  const labels = new Map(nodes.map((node) => [node.id, node.label]));
  if (selected) labels.set(selected.id, selected.label);
  const edges = graph.edges.map((edge) =>
    '<li><code>' + escapeHtml(labels.get(edge.from) || edge.from) + '</code> <small>' + (edge.kind === "produces" ? t("produces →") : t("depends on →")) + '</small> <code>' + escapeHtml(labels.get(edge.to) || edge.to) + '</code></li>'
  ).join("");
  return '<dl>' +
    '<dt>' + t("Outputs") + '</dt><dd>' + graph.summary.outputCount + '</dd>' +
    '<dt>' + t("Content nodes") + '</dt><dd>' + graph.summary.contentCount + '</dd>' +
    '<dt>' + t("Dependencies") + '</dt><dd>' + graph.summary.dependencyCount + '</dd>' +
    '<dt>' + t("Affected") + '</dt><dd>' + graph.summary.affectedOutputCount + '</dd>' +
    '<dt>' + t("Unchanged") + '</dt><dd>' + graph.summary.unchangedOutputCount + '</dd>' +
    '<dt>' + t("Removed") + '</dt><dd>' + graph.summary.removedOutputCount + '</dd>' +
    '</dl>' +
    '<p class="partial">' + t("Build output dependencies are shown. WikiLink content links are a different graph and are not used here.") + '</p>' +
    '<div class="filters"><label>' + t("Search node or path") + ' <input data-graph-filter data-graph-query data-focus-key="graph-query" value="' + escapeHtml(graphQuery) + '"></label><label>' + t("Node kind") + ' <select data-graph-filter data-graph-kind data-focus-key="graph-kind">' + options(["all"].concat(kinds), graphKind) + '</select></label><label>' + t("Direction") + ' <select data-graph-filter data-graph-direction data-focus-key="graph-direction">' + options(["both", "in", "out"], graphDirection) + '</select></label></div>' +
    (selected ? '<div class="selected"><h3>' + t("Selected node") + '</h3><p><code>' + escapeHtml(selected.id) + '</code> <small>' + escapeHtml(t(selected.type) + " · " + t(selected.kind) + (selected.status ? " · " + t(selected.status) : "")) + '</small></p>' + (selected.detail ? '<p class="reason">' + escapeHtml(selected.detail) + '</p>' : "") + (selected.reason ? '<p class="reason">' + t("Regeneration: {reason}", { reason: escapeHtml(selected.reason) }) + '</p>' : "") + (selected.type === "output" ? '<p class="actions"><button type="button" data-graph-output="' + escapeHtml(selected.label) + '" data-focus-key="graph-open-output">' + t("Open in Output Explorer") + '</button></p>' : selected.type === "content" ? '<p class="actions"><button type="button" data-graph-content="' + escapeHtml(selected.label) + '" data-focus-key="graph-open-content">' + t("Show affected outputs") + '</button></p>' : "") + '<p class="actions"><button type="button" data-graph-clear data-focus-key="graph-clear">' + t("Clear selection") + '</button></p></div>' : '<p class="partial">' + t("Select an output to expand its dependencies, or select a content node to find its outputs. Only the selected neighborhood is loaded.") + '</p>') +
    '<h3>' + (graph.search ? t("Search results") : selected ? t("Dependencies and dependents") : t("Outputs")) + '</h3>' +
    (nodes.length === 0 ? '<p class="more">' + t("No matching nodes.") + '</p>' : '<ul class="graph">' + nodes.map((node) =>
      '<li data-status="' + escapeHtml(node.status || "") + '"><button type="button" class="graph-node" data-graph-selected="' + escapeHtml(node.id) + '" data-focus-key="graph-node-' + escapeHtml(node.id) + '" aria-pressed="' + (selected?.id === node.id) + '"><span class="node-label">' + escapeHtml(node.label) + '</span> <small>' + escapeHtml(t(node.type) + " · " + t(node.kind) + (node.status ? " · " + t(node.status) : "")) + '</small></button>' + (node.detail ? '<div class="reason">' + escapeHtml(node.detail) + '</div>' : "") + (node.reason ? '<div class="reason">' + t("Regeneration: {reason}", { reason: escapeHtml(node.reason) }) + '</div>' : "") + '</li>'
    ).join("") + '</ul>') +
    (edges ? '<h3>' + t("Visible edges") + '</h3><ul class="edges">' + edges + '</ul>' : "") +
    (graph.total > graph.nodes.length || graph.page > 0 ? '<p class="more">' + t("Showing {shown} of {total} nodes.", { shown: graph.nodes.length, total: graph.total }) + '</p>' : "") +
    '<p class="actions"><button type="button" data-graph-page="-1" data-focus-key="graph-previous"' + (graph.page === 0 ? " disabled" : "") + '>' + t("Previous") + '</button><span>' + t("Page {page}", { page: graph.page + 1 }) + '</span><button type="button" data-graph-page="1" data-focus-key="graph-next"' + (graph.hidden === 0 ? " disabled" : "") + '>' + t("Next") + '</button></p>';
}

function pluginExecutionReport(execution) {
  if (!execution) return '<p class="status" aria-live="polite">' + t("Loading plugin execution…") + '</p>';
  if (execution.status !== "available") return unavailable("Plugin execution", execution.reason);
  const plugins = execution.plugins.slice().sort((left, right) =>
    pluginSort === "name" ? left.name.localeCompare(right.name) : right.cumulativeDurationMs - left.cumulativeDurationMs || left.name.localeCompare(right.name)
  );
  const trace = execution.trace.status === "available"
    ? '<dl><dt>' + t("Trace spans") + '</dt><dd>' + execution.trace.spanCount + '</dd><dt>' + t("Trace events") + '</dt><dd>' + execution.trace.eventCount + '</dd><dt>' + t("Content build wall clock") + '</dt><dd>' + (execution.trace.wallClockMs === null ? t("not measured") : execution.trace.wallClockMs.toFixed(2) + " ms") + '</dd><dt>' + t("Trace window") + '</dt><dd>' + (execution.trace.windowMs === null ? t("not measured") : execution.trace.windowMs.toFixed(2) + " ms") + '</dd></dl><p class="partial">' + t("Plugin times are cumulative span durations and can overlap when hooks run concurrently. They are not wall-clock time.") + '</p>'
    : '<p class="partial">' + t("Trace not measured: {reason}. Durations are shown as not measured.", { reason: escapeHtml(execution.trace.reason) }) + '</p>';
  const cacheLabel = (cache) => cache.status === "not-observed" ? t("not observed") : t("hit {hit} · miss {miss} · bypass {bypass}", { hit: cache.hit, miss: cache.miss, bypass: cache.bypass });
  return trace +
    '<div class="filters"><label>' + t("Search plugin or hook") + ' <input data-plugin-filter data-plugin-query data-focus-key="plugin-query" value="' + escapeHtml(pluginQuery) + '"></label><label>' + t("Plugin") + ' <select data-plugin-filter data-plugin-select data-focus-key="plugin-select">' + options(["all"].concat(execution.plugins.map((plugin) => plugin.name)), pluginFilter) + '</select></label><label>' + t("Sort hooks") + ' <select data-plugin-filter data-plugin-sort data-focus-key="plugin-sort">' + options(["duration", "name"], pluginSort) + '</select></label></div>' +
    '<h3>' + t("Resolution order") + '</h3><ul class="plugins">' + (plugins.map((plugin) =>
      '<li><details data-detail-key="plugin-' + escapeHtml(plugin.name) + '"><summary><code>#' + plugin.order + '</code> <b>' + escapeHtml(plugin.name) + '</b> <small>' + (plugin.enabled ? t("enabled") : t("disabled")) + ' · ' + (execution.trace.status !== "available" ? t("not measured") : plugin.hookCount === 0 ? t("not executed") : t("{count} hook runs · {duration} ms cumulative", { count: plugin.hookCount, duration: plugin.cumulativeDurationMs.toFixed(2) })) + '</small>' + (plugin.failedHookCount ? ' <span class="failure">' + t("{count} failed", { count: plugin.failedHookCount }) + '</span>' : "") + '</summary><dl>' +
      '<dt>' + t("Capabilities") + '</dt><dd>' + escapeHtml(plugin.provides.join(", ") || t("none")) + '</dd>' +
      '<dt>' + t("Requires") + '</dt><dd>' + escapeHtml(plugin.requires.join(", ") || t("none")) + '</dd>' +
      '<dt>' + t("Optional") + '</dt><dd>' + escapeHtml(plugin.optional.join(", ") || t("none")) + '</dd>' +
      '<dt>' + t("Cumulative time") + '</dt><dd>' + (execution.trace.status !== "available" ? t("not measured") : plugin.cumulativeDurationMs.toFixed(2) + " ms") + '</dd>' +
      '<dt>' + t("Hook runs") + '</dt><dd>' + plugin.hookCount + '</dd>' +
      '<dt>' + t("Plugin diagnostics") + '</dt><dd>' + plugin.diagnostics + '</dd>' +
      '<dt>' + t("Cache") + '</dt><dd>' + escapeHtml(cacheLabel(plugin.cache)) + '</dd>' +
      '</dl></details></li>'
    ).join("") || "<li>" + t("No plugins resolved for this build.") + "</li>") + '</ul>' +
    '<h3>' + t("Hook execution") + '</h3>' +
    (execution.hooks.length === 0 ? '<p class="more">' + t("No matching hook spans.") + '</p>' : '<ul class="hooks">' + execution.hooks.map((hook) =>
      '<li data-status="' + escapeHtml(hook.status) + '"><code>' + escapeHtml(hook.plugin) + '</code> <b>' + escapeHtml(hook.hook) + '</b> <small>' + t(hook.count === 1 ? "{count} run" : "{count} runs", { count: hook.count }) + ' · ' + t("{duration} ms total · {maximum} ms max · {status}", { duration: hook.durationMs.toFixed(2), maximum: hook.maximumDurationMs.toFixed(2), status: escapeHtml(hook.status) }) + '</small></li>'
    ).join("") + '</ul>') +
    (execution.hiddenHookCount > 0 ? '<p class="more">' + t("{count} more hooks not shown.", { count: execution.hiddenHookCount }) + '</p>' : "") +
    '<p class="actions"><button type="button" data-plugin-page="-1" data-focus-key="plugin-previous"' + (execution.page === 0 ? " disabled" : "") + '>' + t("Previous") + '</button><span>' + t("Page {page}", { page: execution.page + 1 }) + '</span><button type="button" data-plugin-page="1" data-focus-key="plugin-next"' + (execution.hiddenHookCount === 0 ? " disabled" : "") + '>' + t("Next") + '</button></p>';
}

function assetsReport(data) {
  if (!data) return '<p class="status" aria-live="polite">' + t("Loading asset inspection…") + '</p>';
  if (data.status !== "available") return unavailable("Assets", data.reason);
  const report = data.inspection;
  const unused = report.assets.filter((asset) => asset.usage === "unused");
  const possiblyUnused = report.assets.filter((asset) => asset.usage === "possibly-unused");
  const assetList = (assets, empty) => assets.length === 0
    ? '<p class="more">' + escapeHtml(empty) + '</p>'
    : '<ul>' + assets.map((asset) => '<li><code>' + escapeHtml(asset.path) + '</code> <small>' + escapeHtml(assetBytes(asset.size) + " · " + t(asset.usage)) + '</small>' + (asset.reasons.length ? '<div class="reason">' + escapeHtml(asset.reasons.join("; ")) + '</div>' : "") + '</li>').join("") + '</ul>';
  return '<dl>' +
    '<dt>' + t("Assets") + '</dt><dd>' + report.totals.assets + '</dd>' +
    '<dt>' + t("Total size") + '</dt><dd>' + escapeHtml(assetBytes(report.totals.bytes)) + '</dd>' +
    '<dt>' + t("Used") + '</dt><dd>' + report.totals.used + '</dd>' +
    '<dt>' + t("Possibly unused") + '</dt><dd>' + report.totals.possiblyUnused + '</dd>' +
    '<dt>' + t("Unused") + '</dt><dd>' + report.totals.unused + ' · ' + escapeHtml(assetBytes(report.totals.unusedBytes)) + '</dd>' +
    '<dt>' + t("Duplicate groups") + '</dt><dd>' + report.totals.duplicates + ' · ' + t("{size} redundant", { size: escapeHtml(assetBytes(report.totals.duplicateBytes)) }) + '</dd>' +
    '</dl>' +
    '<p class="partial">' + t("This report is read-only. Duplicate detection uses SHA-256 and never deletes files.") + '</p>' +
    '<h3>' + t("Formats") + '</h3><ul>' + report.formats.map((format) => '<li><code>' + escapeHtml(format.kind + "/" + format.extension) + '</code> <small>' + format.count + ' · ' + escapeHtml(assetBytes(format.bytes)) + '</small></li>').join("") + '</ul>' +
    '<h3>' + t("Unused assets") + '</h3>' + assetList(unused, t("No unused assets.")) +
    '<h3>' + t("Possibly unused assets") + '</h3>' + assetList(possiblyUnused, t("No possibly unused assets.")) +
    '<h3>' + t("Duplicates") + '</h3>' + (report.duplicates.length === 0 ? '<p class="more">' + t("No duplicate assets.") + '</p>' : '<ul>' + report.duplicates.map((group) => '<li><small>' + t("{size} each · SHA-256 {hash}", { size: escapeHtml(assetBytes(group.size)), hash: group.hash.slice(0, 12) }) + '</small><ul>' + group.paths.map((assetPath) => '<li><code>' + escapeHtml(assetPath) + '</code></li>').join("") + '</ul></li>').join("") + '</ul>') +
    '<h3>' + t("Optimization candidates") + '</h3>' + (report.optimizations.length === 0 ? '<p class="more">' + t("No optimization candidates.") + '</p>' : '<ul>' + report.optimizations.map((entry) => '<li><code>' + escapeHtml(entry.path) + '</code> <small>' + escapeHtml(assetBytes(entry.size) + " · " + entry.kind) + '</small><div class="reason">' + escapeHtml(entry.recommendation) + '</div></li>').join("") + '</ul>');
}

function assetBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KiB";
  return (bytes / 1048576).toFixed(1) + " MiB";
}

function themeReport(config) {
  if (!config) return unavailable("Theme configuration", "the development report did not include theme settings");
  const scan = collectThemeTokens(config);
  const tokens = scan.tokens.filter((token) =>
    (themeKind === "all" || token.status === themeKind || (themeKind === "rb" && token.name.startsWith("--rb-")) || (themeKind === "rr" && token.name.startsWith("--rr-"))) &&
    (!themeQuery || (token.name + " " + token.declared + " " + token.computed).toLowerCase().includes(themeQuery.toLowerCase()))
  );
  const appliedMode = document.documentElement.getAttribute("data-rb-mode") || t("not set");
  const systemMode = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const values = Object.entries(config.settings.values);
  const attributes = Object.entries(config.settings.attributes);
  return '<dl>' +
    '<dt>' + t("Theme") + '</dt><dd>' + escapeHtml(config.name) + '</dd>' +
    '<dt>' + t("Configured mode") + '</dt><dd>' + escapeHtml(config.colorMode) + '</dd>' +
    '<dt>' + t("Applied mode") + '</dt><dd>' + escapeHtml(appliedMode) + '</dd>' +
    '<dt>' + t("System preference") + '</dt><dd>' + escapeHtml(systemMode) + '</dd>' +
    '<dt>data-rb-theme</dt><dd>' + escapeHtml(document.documentElement.getAttribute("data-rb-theme") || t("not set")) + '</dd>' +
    '<dt>' + t("Layout") + '</dt><dd>' + escapeHtml(config.layout) + '</dd>' +
    '</dl>' +
    '<h3>' + t("Resolved settings") + '</h3>' + (values.length === 0 ? '<p class="more">' + t("No theme setting values.") + '</p>' : '<dl>' + values.map(([name, value]) => '<dt>' + escapeHtml(name) + '</dt><dd>' + escapeHtml(value) + '</dd>').join("") + '</dl>') +
    (attributes.length === 0 ? "" : '<h3>' + t("Applied attributes") + '</h3><dl>' + attributes.map(([name, value]) => '<dt><code>' + escapeHtml(name) + '</code></dt><dd>' + escapeHtml(value) + '</dd>').join("") + '</dl>') +
    (config.settings.style ? '<h3>' + t("Setting style declarations") + '</h3><pre>' + escapeHtml(config.settings.style) + '</pre>' : "") +
    '<h3>' + t("CSS tokens") + '</h3><p class="partial">' + t("Values are read from {sheets} stylesheet(s) and computed on <html>.", { sheets: scan.sheets }) + ' ' + (scan.inaccessible ? t("{count} cross-origin stylesheet(s) could not be read.", { count: scan.inaccessible }) + ' ' : '') + t("Ownership is shown only when the declaring stylesheet is readable.") + '</p>' +
    '<div class="filters"><label>' + t("Search token") + ' <input data-theme-filter data-theme-query data-focus-key="theme-query" value="' + escapeHtml(themeQuery) + '"></label><label>' + t("Filter") + ' <select data-theme-filter data-theme-kind data-focus-key="theme-kind">' + options(["all", "rb", "rr", "declared", "undefined", "mismatch"], themeKind) + '</select></label></div>' +
    '<p class="more">' + t("{count} token(s) shown · {undefined} undefined · {mismatch} differ from configured value(s).", { count: tokens.length, undefined: scan.tokens.filter((token) => token.status === "undefined").length, mismatch: scan.tokens.filter((token) => token.status === "mismatch").length }) + '</p>' +
    (tokens.length === 0 ? '<p class="more">' + t("No matching CSS tokens.") + '</p>' : '<table class="tokens"><thead><tr><th>' + t("Token") + '</th><th>' + t("Computed") + '</th><th>' + t("Configured") + '</th><th>' + t("Source") + '</th></tr></thead><tbody>' + tokens.map((token) =>
      '<tr data-status="' + escapeHtml(token.status) + '"><td><code>' + escapeHtml(token.name) + '</code></td><td>' + escapeHtml(token.computed || t("undefined")) + '</td><td>' + escapeHtml(token.expected === undefined ? "" : token.expected) + '</td><td>' + escapeHtml(token.declared) + '</td></tr>'
    ).join("") + '</tbody></table>');
}

function collectThemeTokens(config) {
  const declared = new Map();
  const sheets = Array.from(document.styleSheets);
  let inaccessible = 0;
  for (const sheet of sheets) {
    const source = sheet.href || (sheet.ownerNode && sheet.ownerNode.tagName === "STYLE" ? "inline stylesheet" : "stylesheet");
    try {
      collectTokenRules(sheet.cssRules, source, declared);
    } catch {
      inaccessible += 1;
    }
  }
  for (const name of Array.from(document.documentElement.style)) {
    if (/^--(rb|rr)-/.test(name)) declared.set(name, "documentElement style attribute");
  }
  const expected = expectedThemeTokens(config);
  const rootStyle = getComputedStyle(document.documentElement);
  const names = [...new Set([...declared.keys(), ...expected.keys()])].sort();
  return {
    sheets: sheets.length,
    inaccessible,
    tokens: names.map((name) => {
      const computed = rootStyle.getPropertyValue(name).trim();
      const expectedValue = expected.get(name);
      return {
        name,
        declared: declared.get(name) || "not declared in a readable stylesheet",
        computed,
        expected: expectedValue,
        status: computed === "" ? "undefined" : expectedValue !== undefined && expectedValue !== computed ? "mismatch" : "declared",
      };
    }),
  };
}

function collectTokenRules(rules, source, declared) {
  for (const rule of Array.from(rules || [])) {
    if (rule.style) {
      for (const name of Array.from(rule.style)) {
        if (/^--(rb|rr)-/.test(name)) declared.set(name, source);
      }
    }
    if (rule.cssRules) collectTokenRules(rule.cssRules, source, declared);
  }
}

function expectedThemeTokens(config) {
  const expected = new Map();
  const style = String(config.settings.style || "");
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    const name = declaration.slice(0, separator).trim();
    if (/^--(rb|rr)-/.test(name)) expected.set(name, declaration.slice(separator + 1).trim());
  }
  for (const name of Object.keys(config.settings.attributes || {})) {
    if (name.startsWith("data-rb-setting-")) expected.set("--rb-setting-" + name.slice("data-rb-setting-".length), config.settings.attributes[name]);
  }
  return expected;
}

function provenanceReport(data) {
  if (!data) return '<p class="status" aria-live="polite">' + t("Loading build provenance…") + '</p>';
  if (data.status !== "available") return unavailable("Build provenance", data.reason);
  const provenance = data.provenance;
  const query = provenanceQuery.trim().toLowerCase();
  const sources = provenance.sources.filter((source) =>
    provenanceKind === "all" || provenanceKind === "source"
      ? !query || [source.path, source.contentId, source.visibility].join(" ").toLowerCase().includes(query)
      : false
  );
  const outputs = provenance.outputs.filter((output) =>
    provenanceKind === "all" || provenanceKind === "output"
      ? !query || [output.path, output.producer, output.status].join(" ").toLowerCase().includes(query)
      : false
  );
  const hooks = provenance.transforms.filter((transform) =>
    (provenanceKind === "all" || provenanceKind === "hook") &&
    transform.type === "plugin-hook" &&
    (!query || [transform.producer, transform.hook || "", transform.status].join(" ").toLowerCase().includes(query))
  );
  const artifacts = (provenance.artifacts || []).filter((artifact) =>
    (provenanceKind === "all" || provenanceKind === "artifact") &&
    (!query || [artifact.path, artifact.cache, artifact.descriptor].join(" ").toLowerCase().includes(query))
  );
  const outputSources = (output) => output.dependencies.filter((dependency) => dependency.type === "content").map((dependency) => dependency.slug).join(", ") || t("not measured");
  return '<dl><dt>' + t("Build") + '</dt><dd><code>' + escapeHtml(provenance.buildId) + '</code></dd><dt>' + t("Sources") + '</dt><dd>' + provenance.sources.length + '</dd><dt>' + t("Outputs") + '</dt><dd>' + provenance.outputs.length + '</dd><dt>' + t("Final artifacts") + '</dt><dd>' + (provenance.artifacts || []).length + '</dd></dl>' +
    '<p class="partial">' + t("Dependencies and output reasons are deterministic build data. Hook effects are opaque unless an input/output relation was recorded by Core.") + '</p>' +
    '<div class="filters"><label>' + t("Search") + ' <input data-provenance-filter data-provenance-query data-focus-key="provenance-query" value="' + escapeHtml(provenanceQuery) + '"></label><label>' + t("Show") + ' <select data-provenance-filter data-provenance-kind data-focus-key="provenance-kind">' + options(["all", "source", "output", "hook", "artifact"], provenanceKind) + '</select></label></div>' +
    '<h3>' + t("Sources") + '</h3><ul>' + (sources.map((source) => '<li><code>' + escapeHtml(source.path) + '</code> <small>' + escapeHtml(source.visibility + " · " + source.evidence) + '</small></li>').join("") || '<li>' + t("No matching sources.") + '</li>') + '</ul>' +
    '<h3>' + t("Outputs") + '</h3><ul>' + (outputs.map((output) => '<li><details data-detail-key="provenance-output-' + escapeHtml(output.path) + '"><summary><code>' + escapeHtml(output.path) + '</code> <small>' + escapeHtml(t(output.status) + " · " + t(output.kind)) + '</small></summary><dl><dt>' + t("Producer") + '</dt><dd>' + escapeHtml(output.producer) + '</dd><dt>' + t("Content dependencies") + '</dt><dd>' + escapeHtml(outputSources(output)) + '</dd><dt>' + t("Reason") + '</dt><dd>' + escapeHtml(output.recomputeReason?.type || t("not measured")) + '</dd></dl></details></li>').join("") || '<li>' + t("No matching outputs.") + '</li>') + '</ul>' +
    '<h3>' + t("Plugin hook execution") + '</h3><ul>' + (hooks.map((hook) => '<li><code>#' + hook.sequence + '</code> ' + escapeHtml(hook.producer) + ' <b>' + escapeHtml(hook.hook || t("unknown")) + '</b> <small>' + escapeHtml(t(hook.status) + " · " + t("opaque") + " · " + hook.evidence) + (hook.durationMs === undefined ? " · " + t("duration not measured") : " · " + hook.durationMs.toFixed(2) + " ms") + '</small></li>').join("") || '<li>' + t("No matching executed hooks.") + '</li>') + '</ul>' +
    '<h3>' + t("Final artifacts") + '</h3><ul>' + (artifacts.map((artifact) => '<li><details data-detail-key="provenance-artifact-' + escapeHtml(artifact.path) + '"><summary><code>' + escapeHtml(artifact.path) + '</code> <small>' + escapeHtml(artifact.cache + " · " + artifact.descriptor) + '</small></summary><dl><dt>' + t("Byte fingerprint") + '</dt><dd><code>' + escapeHtml(artifact.fingerprint) + '</code></dd><dt>' + t("Evidence") + '</dt><dd>' + escapeHtml(artifact.evidence) + '</dd></dl></details></li>').join("") || '<li>' + t("Final artifacts were not measured for this build.") + '</li>') + '</ul>';
}

function outputReport(output) {
  if (!output) return '<p class="status" aria-live="polite">' + t("Loading output plan…") + '</p>';
  if (output.status !== "available") return unavailable("Output", output.reason);
  return '<dl>' +
    '<dt>' + t("Candidate") + '</dt><dd>' + output.candidateOutputCount + '</dd>' +
    '<dt>' + t("Affected") + '</dt><dd>' + output.affectedOutputCount + '</dd>' +
    '<dt>' + t("Unchanged") + '</dt><dd>' + output.unchangedOutputCount + '</dd>' +
    '<dt>' + t("Removed") + '</dt><dd>' + output.removedOutputCount + '</dd>' +
    '<dt>' + t("Full regeneration") + '</dt><dd>' + (output.fullRegenerationRequired ? t("required") : t("not required")) + '</dd>' +
    '<dt>' + t("Owner conflicts") + '</dt><dd>' + output.conflicts.length + '</dd>' +
    '</dl>' +
    '<div class="filters"><label>' + t("Search") + ' <input data-output-filter data-output-query data-focus-key="output-query" value="' + escapeHtml(outputQuery) + '"></label><label>' + t("Kind") + ' <select data-output-filter data-output-kind data-focus-key="output-kind">' + options(["all", "content", "redirect", "plugin-page", "generated"], outputKind) + '</select></label><label>' + t("Status") + ' <select data-output-filter data-output-status data-focus-key="output-status">' + options(["all", "affected", "unchanged", "removed"], outputStatus) + '</select></label><label>' + t("Changed content") + ' <input data-output-filter data-output-changed data-focus-key="output-changed" value="' + escapeHtml(outputChanged) + '"></label></div>' +
    '<div class="filters"><label>' + t("Output path") + ' <input data-output-lookup data-focus-key="output-lookup" value="' + escapeHtml(outputLookup) + '"></label><button type="button" data-output-lookup-submit data-focus-key="output-lookup-submit">' + t("Inspect path") + '</button></div>' +
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
      html += '<p class="partial">' + t("Output not found: {target}.", { target: escapeHtml(lookups.output.target) }) + '</p>';
    } else {
      html += '<h3>' + t("Output details") + '</h3><p><code>' + escapeHtml(lookups.output.output.path) + '</code> <small>' + escapeHtml(t(lookups.output.output.kind)) + ' · ' + escapeHtml(lookups.output.output.producer) + '</small></p><p class="reason"><b>' + t("Dependencies") + '</b> ' + escapeHtml(lookups.output.dependencies.join(", ") || t("none")) + '</p>' +
        listedOutputs("Related outputs", lookups.output.relatedOutputs, lookups.output.hiddenRelatedCount, "output");
    }
  }
  if (lookups.changed) {
    html += '<h3>' + t("Changed content: {target}", { target: escapeHtml(lookups.changed.target) }) + '</h3><p>' + t("{count} affected outputs.", { count: lookups.changed.outputCount }) + '</p>' +
      listedOutputs("Direct regeneration targets", lookups.changed.outputs, lookups.changed.hiddenOutputCount, "output");
  }
  return html;
}

function listedOutputs(title, outputs, hiddenCount, pageKind) {
  if (outputs.length === 0) return "";
  return '<h3>' + escapeHtml(t(title)) + '</h3><ul>' + outputs.map((output) =>
    '<li><code>' + escapeHtml(output.path) + '</code> <small>' + escapeHtml(t(output.kind)) + ' · ' + escapeHtml(output.producer) + '</small>' + (output.reason ? '<div class="reason">' + escapeHtml(output.reason) + '</div>' : '') + (pageKind === "output" ? ' <button type="button" data-output-graph="' + escapeHtml(output.path) + '" data-focus-key="output-graph-' + escapeHtml(output.path) + '">' + t("Graph") + '</button>' : '') + '</li>'
  ).join("") + '</ul>' + (hiddenCount > 0 ? '<p class="more">' + t("{count} more not shown.", { count: hiddenCount }) + '</p>' : "") + pagination(pageKind, hiddenCount);
}

function pagination(kind, hiddenCount) {
  if (kind !== "output" && kind !== "dependency") return "";
  const page = kind === "output" ? outputPage : dependencyPage;
  if (page === 0 && hiddenCount === 0) return "";
  return '<p class="actions"><button type="button" data-' + kind + '-page="-1" data-focus-key="' + kind + '-previous"' + (page === 0 ? " disabled" : "") + '>' + t("Previous") + '</button><span>' + t("Page {page}", { page: page + 1 }) + '</span><button type="button" data-' + kind + '-page="1" data-focus-key="' + kind + '-next"' + (hiddenCount === 0 ? " disabled" : "") + '>' + t("Next") + '</button></p>';
}

function conflictList(conflicts) {
  if (conflicts.length === 0) return "";
  return '<h3>' + t("Owner conflicts") + '</h3><ul>' + conflicts.map((conflict) =>
    '<li><code>' + escapeHtml(conflict.path) + '</code> <small>' + escapeHtml(conflict.owners.join(", ")) + '</small></li>'
  ).join("") + '</ul>';
}

function dependencyReport(dependencies) {
  if (!dependencies) return '<p class="status" aria-live="polite">' + t("Loading dependencies…") + '</p>';
  if (dependencies.status !== "available") return unavailable("Dependencies", dependencies.reason);
  return '<dl>' +
    '<dt>' + t("Outputs") + '</dt><dd>' + dependencies.outputCount + '</dd>' +
    '<dt>' + t("With dependencies") + '</dt><dd>' + dependencies.dependentOutputCount + '</dd>' +
    '<dt>' + t("Dependencies") + '</dt><dd>' + dependencies.dependencyCount + '</dd>' +
    '<dt>' + t("Unknown outputs") + '</dt><dd>' + dependencies.unknownOutputCount + '</dd>' +
    '</dl>' +
    (dependencies.kinds.length === 0 ? "<p>" + t("No output dependencies.") + "</p>" :
      '<h3>' + t("Kinds") + '</h3><ul>' + dependencies.kinds.map((kind) =>
        '<li>' + escapeHtml(t(kind.kind)) + ' <small>' + kind.count + '</small></li>'
      ).join("") + '</ul>') +
    '<div class="filters"><label>' + t("Search") + ' <input data-output-filter data-dependency-query data-focus-key="dependency-query" value="' + escapeHtml(dependencyQuery) + '"></label><label>' + t("Dependency kind") + ' <select data-output-filter data-dependency-kind data-focus-key="dependency-kind">' + options(["all"].concat(dependencies.kinds.map((kind) => kind.kind)), dependencyKind) + '</select></label></div>' +
    (dependencies.outputs.length === 0 ? '<p class="more">' + t("No matching outputs.") + '</p>' :
      '<h3>' + t("Outputs") + '</h3><ul>' + dependencies.outputs.map((output) =>
        '<li><code>' + escapeHtml(output.path) + '</code><br><small>' + escapeHtml(output.dependencies.join(", ")) + '</small></li>'
      ).join("") + '</ul>') +
    (dependencies.hiddenOutputCount > 0 ? '<p class="more">' + t("{count} more outputs not shown.", { count: dependencies.hiddenOutputCount }) + '</p>' : "") +
    pagination("dependency", dependencies.hiddenOutputCount);
}

function regenerationReport(regeneration) {
  if (!regeneration) return "";
  if (regeneration.status !== "available") return unavailable("Full regeneration reasons", regeneration.reason);
  const required = regeneration.required ? '<p class="partial">' + t("Full regeneration is required.") + '</p>' : '<p>' + t("No full regeneration reason was reported.") + '</p>';
  const reasons = regeneration.reasons.length === 0 ? "" : '<ul>' + regeneration.reasons.map((reason) =>
    '<li><b>' + escapeHtml(reason.kind) + '</b> <small>' + escapeHtml(reason.source) + '</small>' + (reason.detail ? '<div class="reason">' + escapeHtml(reason.detail) + '</div>' : "") + '</li>'
  ).join("") + '</ul>';
  const unknown = regeneration.unknown.length === 0 ? "" : '<p class="partial">' + t("Cause unavailable: {causes}.", { causes: escapeHtml(regeneration.unknown.join(", ")) }) + '</p>';
  return '<h3>' + t("Full regeneration reasons") + '</h3>' + required + reasons + unknown;
}

function dependencyDescription(dependency) {
  let text = dependency.type + ":" + (dependency.id || "*");
  if (dependency.property) text += "." + dependency.property;
  else if (dependency.properties && dependency.properties.length) text += "[" + dependency.properties.join(",") + "]";
  if (dependency.type === "view" && dependency.fingerprint) text += "@" + dependency.fingerprint;
  return text;
}

function derivedReport(views) {
  const all = Array.isArray(views) ? views : [];
  if (all.length === 0) return '<p>' + t("No derived views are registered. Plugins register them through derivedViews.") + '</p>';
  const query = derivedQuery.trim().toLowerCase();
  const filtered = all.filter((view) => {
    if (derivedStatus !== "all") {
      const state = view.error ? "error" : view.cache;
      if (state !== derivedStatus) return false;
    }
    if (!query) return true;
    return [view.id, view.version, view.recomputeReason || "", view.cache, view.dependencies.map(dependencyDescription).join(" "), view.outputPaths.join(" ")].join(" ").toLowerCase().includes(query);
  });
  return '<div class="filters"><label>' + t("Search") + ' <input data-derived-filter data-derived-query data-focus-key="derived-query" value="' + escapeHtml(derivedQuery) + '"></label><label>' + t("Status") + ' <select data-derived-filter data-derived-status data-focus-key="derived-status">' + options(["all", "hit", "miss", "bypass", "not-run", "error"], derivedStatus) + '</select></label></div>' +
    '<p>' + t("{count} of {total} derived views.", { count: filtered.length, total: all.length }) + '</p>' +
    (filtered.length === 0 ? '<p class="more">' + t("No matching derived views.") + '</p>' :
      '<ul>' + filtered.map((view, index) => derivedView(view, index)).join("") + '</ul>');
}

function derivedView(view, index) {
  const state = view.error === "cancelled" ? t("cancelled") : view.error ? t("failed") : t("completed");
  const execution = view.cache === "not-run" ? t("not executed") : t("executed");
  const dependencies = view.dependencies.length === 0 ? '<p>' + t("No tracked dependencies.") + '</p>' :
    '<details data-detail-key="derived-dependencies-' + index + '"><summary>' + t("Dependencies ({count})", { count: view.dependencies.length }) + '</summary><ul>' + view.dependencies.map((dependency) =>
      '<li><code>' + escapeHtml(dependencyDescription(dependency)) + '</code></li>'
    ).join("") + '</ul></details>';
  const outputs = view.outputPaths.length === 0 ? '<p>' + t("No generated outputs.") + '</p>' :
    '<details data-detail-key="derived-outputs-' + index + '"><summary>' + t("Generated outputs ({count})", { count: view.outputPaths.length }) + '</summary><ul>' + view.outputPaths.map((outputPath) =>
      '<li><code>' + escapeHtml(outputPath) + '</code></li>'
    ).join("") + '</ul></details>';
  return '<li><b>' + escapeHtml(view.id) + '</b> <small>' + t("version {version}", { version: escapeHtml(view.version) }) + '</small><dl>' +
    '<dt>' + t("Execution") + '</dt><dd>' + execution + '</dd>' +
    '<dt>' + t("State") + '</dt><dd>' + state + '</dd>' +
    '<dt>' + t("Cache") + '</dt><dd>' + escapeHtml(view.cache) + '</dd>' +
    (view.recomputeReason ? '<dt>' + t("Recompute reason") + '</dt><dd>' + escapeHtml(view.recomputeReason) + '</dd>' : '') +
    '<dt>' + t("Duration") + '</dt><dd>' + view.durationMs + ' ms</dd>' +
    '</dl>' + dependencies + outputs + '</li>';
}

function unavailable(subject, capability) {
  return '<p class="partial">' + t("{subject} unavailable: {capability}.", { subject: escapeHtml(t(subject)), capability: escapeHtml(t(capability)) }) + '</p>';
}

function renderFailure(root, message) {
   root.innerHTML = '<style>' + styles + extraStyles + '</style><section role="dialog" aria-modal="false" aria-labelledby="rb-failure-title"><header><strong id="rb-failure-title">Riebeckite Inspector</strong><button type="button" data-close aria-label="' + t("Close inspector") + '">' + t("Close") + '</button></header><p class="failure" aria-live="polite">' + escapeHtml(t(message)) + '</p></section>';
}

function location(diagnostic) {
  const location = diagnostic.location;
  return location?.file ? ' <small>(' + escapeHtml(location.file) + (location.line ? ':' + location.line : '') + ')</small>' : '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function pluginTabValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return '<code>' + escapeHtml(JSON.stringify(value)) + '</code>';
  return escapeHtml(String(value));
}

function renderPluginTabData(data) {
  if (!data) return '<p class="status">' + t("This tab has no data.") + '</p>';
  if (data.kind === "error") return '<p class="failure">' + escapeHtml(data.message) + '</p>';
  if (data.kind === "key-value") {
    return '<dl>' + (data.items ?? []).map((item) => '<dt>' + escapeHtml(localizedText(item.key)) + '</dt><dd>' + pluginTabValue(item.value) + '</dd>').join("") + '</dl>';
  }
  if (data.kind === "table") {
    const columns = data.columns ?? [];
    return '<table><thead><tr>' + columns.map((column) => '<th>' + escapeHtml(localizedText(column)) + '</th>').join("") + '</tr></thead><tbody>' + (data.rows ?? []).map((row) => '<tr>' + (Array.isArray(row) ? row : []).map((cell) => '<td>' + pluginTabValue(cell) + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
  }
  return '<pre>' + escapeHtml(JSON.stringify(data.kind === "json" ? data.value : data, null, 2)) + '</pre>';
}

`;
