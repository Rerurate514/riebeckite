export const inspectorClientRenderPart2 = `}

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
}`;
