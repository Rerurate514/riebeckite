export const inspectorClientRenderPart4 = `    listedOutputs("Affected outputs", output.affected, output.hiddenAffectedCount, "output") +
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
