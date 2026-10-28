type ClientContext = { root?: ParentNode };

export function initSidebarNavigation(context: ClientContext = {}) {
  const root = context.root ?? document;
  const cleanups = Array.from(
    root.querySelectorAll<HTMLElement>("[data-sidebar-navigation]"),
  ).map(init);
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function init(navigation: HTMLElement): () => void {
  const filter = navigation.querySelector<HTMLInputElement>(
    "[data-sidebar-filter]",
  );
  const toggles = Array.from(
    navigation.querySelectorAll<HTMLButtonElement>("[data-sidebar-toggle]"),
  );
  const onToggle = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const item = button.closest<HTMLElement>("[data-sidebar-item]");
    if (!item) return;
    const expanded = item.dataset.sidebarExpanded !== "true";
    item.dataset.sidebarExpanded = String(expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute(
      "aria-label",
      `${expanded ? "Collapse" : "Expand"} ${item.dataset.sidebarLabel ?? "section"}`,
    );
  };
  for (const toggle of toggles) toggle.addEventListener("click", onToggle);

  const initial = new Map<HTMLElement, string | undefined>();
  const items = Array.from(
    navigation.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
  );
  const onFilter = () => {
    const query = filter?.value.trim().toLocaleLowerCase() ?? "";
    for (const item of items) {
      if (!initial.has(item)) initial.set(item, item.dataset.sidebarExpanded);
      const own = item.dataset.sidebarLabel?.includes(query) ?? false;
      const descendant = Array.from(
        item.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
      ).some((child) => child.dataset.sidebarLabel?.includes(query));
      item.hidden = query !== "" && !own && !descendant;
      if (query !== "" && descendant) item.dataset.sidebarExpanded = "true";
      if (query === "") {
        const expanded = initial.get(item);
        if (expanded === undefined) delete item.dataset.sidebarExpanded;
        else item.dataset.sidebarExpanded = expanded;
      }
    }
  };
  filter?.addEventListener("input", onFilter);
  return () => {
    for (const toggle of toggles) toggle.removeEventListener("click", onToggle);
    filter?.removeEventListener("input", onFilter);
  };
}
