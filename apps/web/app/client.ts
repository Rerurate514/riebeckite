import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";

let themeShowcaseRoot: globalThis.HTMLElement | null = null;
let themeShowcaseModule:
  | Promise<typeof import("./theme-showcase-client")>
  | undefined;

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
  mountThemeShowcase();
  new MutationObserver(mountThemeShowcase).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function mountThemeShowcase(): void {
  const root = document.querySelector<globalThis.HTMLElement>(
    "[data-theme-showcase]",
  );
  if (!root || root === themeShowcaseRoot) return;
  themeShowcaseRoot = root;
  themeShowcaseModule ??= import("./theme-showcase-client");
  void themeShowcaseModule.then(({ initThemeShowcase }) => {
    if (root.isConnected) initThemeShowcase();
  });
}
