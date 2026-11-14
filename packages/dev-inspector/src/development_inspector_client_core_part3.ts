export const inspectorClientCorePart3 = `      const response = await inspectorFetch(assetsEndpoint, { cache: "no-store", signal: assetsController.signal });
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
  const cleanupPluginTab = () => {
    pluginMount += 1;
    if (typeof pluginCleanup === "function") {
      try {
        pluginCleanup();
      } catch {}
    }
    pluginCleanup = null;
  };
  const loadPluginTab = async (tab, current) => {
    if (!report || !panel?.isConnected || pluginTabData[tab.pluginId]) return;
    pluginTabData[tab.pluginId] = { loading: true };
    const pluginController = new AbortController();
    pluginTabControllers[tab.pluginId]?.abort();
    pluginTabControllers[tab.pluginId] = pluginController;
    try {
      const response = await inspectorFetch(tabsEndpoint + "/" + encodeURIComponent(tab.pluginId), { cache: "no-store", signal: pluginController.signal });
      if (!response.ok) throw new Error(t("Inspector tab is unavailable."));
      const next = await response.json();
      if (current !== generation || !panel?.isConnected) return;
      pluginTabData[tab.pluginId] = next.tab;
      render();
    } catch (error) {
      if (error.name === "AbortError" || current !== generation) return;
      pluginTabData[tab.pluginId] = { error: error instanceof Error ? error.message : String(error) };
      render();
    }
  };
  const loadActiveTab = (current) => {
    const tab = allTabs().find((candidate) => candidate.id === activeTab);
    if (tab?.load) tab.load(current);
    else if (tab?.pluginId) void loadPluginTab(tab, current);
  };
  const mountPluginTab = (tab) => {
    if (!tab?.pluginId || tab.error) return;
    const state = pluginTabData[tab.pluginId];
    if (!state?.clientUrl || state.error || state.clientError) return;
    const root = panel.shadowRoot.querySelector("[data-plugin-tab-root]");
    if (!root) return;
    const current = generation;
    const mount = ++pluginMount;
    void import(/* @vite-ignore */ state.clientUrl).then((module) => {
      if (mount !== pluginMount || current !== generation || !panel?.isConnected || activeTab !== tab.id) return;
      const target = panel.shadowRoot.querySelector("[data-plugin-tab-root]");
      if (!target) return;
      if (typeof module.mount !== "function") throw new Error(t("Plugin tab does not export mount()."));
      const cleanup = module.mount(target, { data: state.data, locale: inspectorLanguage });
      pluginCleanup = typeof cleanup === "function" ? cleanup : null;
    }).catch((error) => {
      if (mount !== pluginMount || current !== generation || !panel?.isConnected || activeTab !== tab.id) return;
      root.innerHTML = '<p class="failure">' + escapeHtml(error instanceof Error ? error.message : String(error)) + '</p>';
    });
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
    for (const pluginController of Object.values(pluginTabControllers)) pluginController.abort();
    pluginTabControllers = Object.create(null);
    cleanupPluginTab();
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
    if (!panel?.isConnected || activeTab !== "theme") return;
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
      const maximum = Math.min(window.innerWidth, 900);`;
