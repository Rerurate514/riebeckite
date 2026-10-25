import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
  if (document.querySelector("[data-theme-showcase]")) {
    void import("./theme-showcase-client").then(({ initThemeShowcase }) =>
      initThemeShowcase(),
    );
  }
}
