import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";
import "./style.css";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
}
