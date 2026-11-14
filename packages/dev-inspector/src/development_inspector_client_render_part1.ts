export const inspectorClientRenderPart1 = `function readDerivedFilters(root) {
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
    return [entry.title, entry.slug, entry.permalink, entry.id, entry.idSource]
      .concat(entry.aliases || [], (entry.redirects || []).flatMap((redirect) => [redirect.from, redirect.to]))
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const listed = filtered.slice(0, 200);
  const rows = listed.map((entry) => {
    const aliases = (entry.aliases || []).map(escapeHtml).join("<br>");
    const redirects = (entry.redirects || []).map((redirect) => escapeHtml(redirect.from) + " → " + escapeHtml(redirect.to)).join("<br>");
    const id = entry.id ? '<br><small>' + escapeHtml(entry.id) + (entry.idSource ? ' (' + escapeHtml(entry.idSource) + ')' : '') + '</small>' : '';
    return '<tr><td><strong>' + escapeHtml(entry.title) + '</strong><br><small>' + escapeHtml(entry.slug) + '</small></td><td><code>' + escapeHtml(entry.permalink) + '</code>' + id + (entry.language ? '<br><small>' + escapeHtml(entry.language) + '</small>' : '') + '</td><td>' + escapeHtml(t(entry.visibility)) + (entry.routable ? '' : '<br><small>' + t("not routable") + '</small>') + '</td><td>' + entry.incomingLinks + '</td><td>' + entry.unresolvedLinks.length + '</td><td>' + aliases + '</td><td>' + redirects + '</td></tr>';
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
    '<div class="filters"><label>' + t("Search") + ' <input data-content-filter data-content-query data-focus-key="content-query" value="' + escapeHtml(contentQuery) + '" placeholder="' + escapeHtml(t("Title, path, ID, alias, or redirect")) + '"></label><label>' + t("Visibility") + ' <select data-content-filter data-content-visibility data-focus-key="content-visibility">' + options(["all", "public", "unlisted", "draft", "scheduled"], contentVisibility) + '</select></label><label>' + t("Status") + ' <select data-content-filter data-content-status data-focus-key="content-status">' + options(["all", "routable", "discoverable", "orphan"], contentStatus) + '</select></label></div>' +
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
  ).join("") || "<li>" + t("No matching diagnostic findings.") + "</li>") + '</ul>';`;
