import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";
import { initPlayground } from "./playground-client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
  initPlayground();
}
