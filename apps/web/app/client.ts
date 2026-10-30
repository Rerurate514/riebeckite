import { initRiebeckiteClient } from "virtual:riebeckite/client";
import "@riebeckite/ui/drawer/client";
import { createClient } from "honox/client";
import { crossesShellBoundary } from "./lib/shell-navigation";

let themeShowcaseModule:
  | Promise<typeof import("./theme-showcase-client")>
  | undefined;

createClient();
document.addEventListener("click", disableSpaAcrossShells, { capture: true });
document.addEventListener("pointerover", disableSpaAcrossShells, {
  capture: true,
});

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

function disableSpaAcrossShells(event: Event): void {
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
    "a[href]",
  );
  if (!anchor) return;

  const destination = new URL(anchor.href, window.location.href);
  if (
    destination.origin === window.location.origin &&
    crossesShellBoundary(window.location.pathname, destination.pathname)
  ) {
    anchor.dataset.spa = "false";
  }
}
