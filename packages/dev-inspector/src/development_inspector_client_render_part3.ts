export const inspectorClientRenderPart3 = `
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
    lookupReport(output.lookups) +`;
