import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";

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
  if (!document.querySelector("[data-plugin-preview]")) return;
  themeShowcaseModule ??= import("./theme-showcase-client");
  void themeShowcaseModule.then(({ initThemeShowcase }) => initThemeShowcase());
}
