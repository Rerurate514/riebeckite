import { initLightbox } from "@riebeckite/plugin-lightbox";
import { createClient } from "honox/client";
import { initSearch } from "./components/search-bar/search-bar.client";
import { initTableOfContents } from "./components/table-of-contents/table-of-contents.client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initLightbox();
  initSearch();
  initTableOfContents();
}
