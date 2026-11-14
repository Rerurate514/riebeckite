export const inspectorClientCorePart4 = `      panel.style.setProperty("--rb-width", Math.round(Math.max(360, Math.min(maximum, width))) + "px");
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
    cleanupPluginTab();
    const root = panel.shadowRoot;
    const tabs = allTabs();
    if (!tabs.some((tab) => tab.id === activeTab)) activeTab = "overview";
    const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
    const active = root.activeElement;
    const focusKey = active?.dataset?.focusKey;
    const selection = active && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : undefined;
    const openDetails = new Set(Array.from(root.querySelectorAll("details[open][data-detail-key]")).map((details) => details.dataset.detailKey));
    root.innerHTML = '<style>' + styles + extraStyles + '</style>' + sectionStart('rb-title') + '<header><div><strong id="rb-title">Riebeckite Inspector</strong><p>' + t("Ctrl+Alt+R · drag the left edge to resize") + '</p></div><div class="actions"><select data-language data-focus-key="language" aria-label="' + t("Language") + '"><option value="en"' + (inspectorLanguage === "en" ? " selected" : "") + '>English</option><option value="ja"' + (inspectorLanguage === "ja" ? " selected" : "") + '>日本語</option></select><button type="button" data-close aria-label="' + t("Close inspector") + '">' + t("Close") + '</button></div></header><div class="summary">' + t("{count} errors", { count: '<b>' + report.summary.errors + '</b>' }) + ' ' + t("{count} warnings", { count: '<b>' + report.summary.warnings + '</b>' }) + ' ' + t("{count} info", { count: '<b>' + report.summary.info + '</b>' }) + '</div><div role="tablist" aria-label="' + t("Inspector sections") + '">' + tabs.map((tab, index) => '<button id="rb-tab-' + index + '" role="tab" aria-controls="rb-panel-' + index + '" aria-selected="' + (tab.id === activeTab) + '" tabindex="' + (tab.id === activeTab ? 0 : -1) + '" data-tab="' + escapeHtml(tab.id) + '">' + escapeHtml(tab.label) + '</button>').join("") + '</div><div id="rb-panel-' + activeIndex + '" role="tabpanel" aria-labelledby="rb-tab-' + activeIndex + '" tabindex="0">' + panelContent() + '</div><p class="status" aria-live="polite">' + (report.output ? t("Inspector report updated") : t("Inspector report updated · loading output plan…")) + '</p></section>';
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelector("[data-language]").addEventListener("change", (event) => {
      setInspectorLanguage(event.target.value);
      launcher.textContent = t("Inspector");
      launcher.setAttribute("aria-label", t("Open Riebeckite Development Inspector"));
      render();
    });
    setupResize(root);
    root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { activeTab = button.dataset.tab; render(); loadActiveTab(generation); }));
    root.querySelectorAll("[data-diagnostic-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readDiagnosticFilters(root); render(); }));
    root.querySelectorAll("[data-content-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readContentFilters(root); render(); }));
    root.querySelectorAll("[data-output-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readOutputFilters(root); outputPage = 0; render(); requestOutput(); }));
    root.querySelectorAll("[data-output-page]").forEach((button) => button.addEventListener("click", () => { outputPage = Math.max(0, outputPage + Number(button.dataset.outputPage)); render(); requestOutput(); }));
    root.querySelectorAll("[data-dependency-page]").forEach((button) => button.addEventListener("click", () => { dependencyPage = Math.max(0, dependencyPage + Number(button.dataset.dependencyPage)); render(); requestOutput(); }));
    root.querySelectorAll("[data-graph-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readGraphFilters(root); graphPage = 0; render(); requestGraph(); }));
    root.querySelectorAll("[data-graph-page]").forEach((button) => button.addEventListener("click", () => { graphPage = Math.max(0, graphPage + Number(button.dataset.graphPage)); render(); requestGraph(); }));
    root.querySelectorAll("[data-graph-selected]").forEach((button) => button.addEventListener("click", () => { graphSelected = button.dataset.graphSelected; graphPage = 0; render(); requestGraph(); }));
    root.querySelector("[data-graph-clear]")?.addEventListener("click", () => { graphSelected = ""; graphQuery = ""; graphKind = "all"; graphDirection = "both"; graphPage = 0; render(); requestGraph(); });
    root.querySelectorAll("[data-graph-output]").forEach((button) => button.addEventListener("click", () => { outputLookup = button.dataset.graphOutput; outputPage = 0; activeTab = "output"; render(); requestOutput(); }));
    root.querySelectorAll("[data-graph-content]").forEach((button) => button.addEventListener("click", () => { outputChanged = button.dataset.graphContent; outputPage = 0; activeTab = "output"; render(); requestOutput(); }));
    root.querySelectorAll("[data-plugin-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readPluginFilters(root); pluginPage = 0; render(); requestPlugins(); }));
    root.querySelectorAll("[data-plugin-page]").forEach((button) => button.addEventListener("click", () => { pluginPage = Math.max(0, pluginPage + Number(button.dataset.pluginPage)); render(); requestPlugins(); }));
    root.querySelectorAll("[data-theme-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readThemeFilters(root); render(); }));
    root.querySelectorAll("[data-derived-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readDerivedFilters(root); render(); }));
    root.querySelectorAll("[data-provenance-filter]").forEach((input) => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => { readProvenanceFilters(root); render(); }));
    root.querySelectorAll("[data-output-graph]").forEach((button) => button.addEventListener("click", () => { graphSelected = "output:" + button.dataset.outputGraph; graphQuery = ""; graphKind = "all"; graphDirection = "both"; graphPage = 0; graphData = undefined; activeTab = "dependencies"; render(); requestGraph(); }));
    const lookupInput = root.querySelector("[data-output-lookup]");
    const lookupSubmit = root.querySelector("[data-output-lookup-submit]");
    lookupSubmit?.addEventListener("click", () => { outputLookup = lookupInput?.value.trim() ?? ""; outputPage = 0; render(); requestOutput(); });
    lookupInput?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lookupSubmit?.click(); } });
    root.querySelector("[role=tablist]").addEventListener("keydown", (event) => {
      const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
      let nextIndex = currentIndex;
      if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
      else return;
      event.preventDefault(); activeTab = tabs[nextIndex].id; render(); root.querySelector('[data-tab="' + activeTab + '"]').focus();
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
    const currentTab = tabs.find((tab) => tab.id === activeTab);
    if (currentTab?.pluginId) {
      if (!pluginTabData[currentTab.pluginId]) void loadPluginTab(currentTab, generation);
      mountPluginTab(currentTab);
    }
  }
  function panelContent() {
    const tab = allTabs().find((candidate) => candidate.id === activeTab);
    if (!tab) return "";
    if (tab.pluginId) return pluginTabReport(tab);
    return typeof tab.render === "function" ? tab.render() : "";
  }
  function pluginTabReport(tab) {
    if (tab.error) return '<p class="failure">' + escapeHtml(tab.error) + '</p>';
    const state = pluginTabData[tab.pluginId];
    if (!state || state.loading) return '<p class="status">' + t("Loading plugin tab…") + '</p>';
    if (state.error) return '<p class="failure">' + escapeHtml(state.error) + '</p>';
    if (state.clientError) return '<p class="failure">' + escapeHtml(state.clientError) + '</p>';
    const description = tab.description ? '<p>' + escapeHtml(tab.description) + '</p>' : "";
    if (state.clientUrl) return description + '<div data-plugin-tab-root></div>';
    return description + renderPluginTabData(state.data);
  }
}

`;
