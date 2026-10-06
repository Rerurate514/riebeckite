export function initPluginDemo(): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.querySelector<HTMLElement>("[data-plugin-demo]");
  if (!root) {
    return;
  }
  const input = root.querySelector<HTMLInputElement>(
    "[data-plugin-demo-filter]",
  );
  if (!input) {
    return;
  }
  const items = root.querySelectorAll<HTMLElement>("[data-plugin-demo-item]");
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    for (const item of items) {
      const title = item.dataset.pluginDemoTitle ?? "";
      item.hidden = query.length > 0 && !title.includes(query);
    }
  });
}
