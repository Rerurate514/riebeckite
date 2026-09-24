import { initRiebeckitePlugins } from "virtual:riebeckite-plugin-client";
import { createClient } from "honox/client";
import { initSearch } from "./features/search-bar/search-bar.client";
import { initTableOfContents } from "./features/table-of-contents/table-of-contents.client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckitePlugins();
  initSearch();
  initTableOfContents();
}
