import { initPluginPreviews } from "./preview-client";

export function initPlayground(): void {
  initPluginPreviews();
  const picker = document.querySelector("[data-playground-picker]");
  const select = document.querySelector("[data-playground-plugin]");
  if (
    !(picker instanceof HTMLFormElement) ||
    !(select instanceof HTMLSelectElement)
  ) {
    return;
  }
  select.addEventListener("change", () => picker.requestSubmit());
}
