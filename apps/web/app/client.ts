import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";
import { initHomeCodeCopy } from "./components/home/client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
  initHomeCodeCopy();
}
