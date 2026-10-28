type ClientContext = { root?: ParentNode };

const expandedState = new Map<string, Map<string, boolean>>();

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
  const stateKey = navigation.dataset.sidebarStateKey;
  const savedState = stateKey ? expandedState.get(stateKey) : undefined;
  const details = Array.from(
    navigation.querySelectorAll<HTMLDetailsElement>(
      ".rb-sidebar-navigation__details",
    ),
  );
  const items = Array.from(
    navigation.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
  );
  const setExpanded = (item: HTMLElement, expanded: boolean) => {
    item.dataset.sidebarExpanded = String(expanded);
    const button = item.querySelector<HTMLButtonElement>(
      ":scope > .rb-sidebar-navigation__row [data-sidebar-toggle]",
    );
    button?.setAttribute("aria-expanded", String(expanded));
    if (button) {
      button.setAttribute(
        "aria-label",
        `${expanded ? "Collapse" : "Expand"} ${item.dataset.sidebarLabel ?? "section"}`,
      );
    }
    const detail = item.querySelector<HTMLDetailsElement>(
      ":scope > .rb-sidebar-navigation__details",
    );
    if (detail) detail.open = expanded;
  };
  const saveExpanded = (item: HTMLElement, expanded: boolean) => {
    const itemKey = item.dataset.sidebarKey;
    if (!stateKey || !itemKey) return;
    const states = expandedState.get(stateKey) ?? new Map<string, boolean>();
    states.set(itemKey, expanded);
    expandedState.set(stateKey, states);
  };
  if (savedState) {
    for (const item of items) {
      const itemKey = item.dataset.sidebarKey;
      const expanded = itemKey ? savedState.get(itemKey) : undefined;
      if (expanded !== undefined) setExpanded(item, expanded);
    }
  }
  const onToggle = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const item = button.closest<HTMLElement>("[data-sidebar-item]");
    if (!item) return;
    const expanded = item.dataset.sidebarExpanded !== "true";
    setExpanded(item, expanded);
    if (!filter?.value.trim()) saveExpanded(item, expanded);
  };
  for (const toggle of toggles) toggle.addEventListener("click", onToggle);

  const initial = new Map<HTMLElement, string | undefined>();
  const initialDetails = new Map<HTMLDetailsElement, boolean>();
  const onDetailsToggle = (event: Event) => {
    if (filter?.value.trim()) return;
    const detail = event.currentTarget as HTMLDetailsElement;
    const item = detail.closest<HTMLElement>("[data-sidebar-item]");
    if (!item) return;
    item.dataset.sidebarExpanded = String(detail.open);
    saveExpanded(item, detail.open);
  };
  for (const detail of details)
    detail.addEventListener("toggle", onDetailsToggle);
  const onFilter = () => {
    const query = filter?.value.trim().toLocaleLowerCase() ?? "";
    for (const detail of details) {
      if (!initialDetails.has(detail)) initialDetails.set(detail, detail.open);
    }
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
    for (const detail of details) {
      if (
        query !== "" &&
        detail.querySelector("[data-sidebar-item]:not([hidden])")
      ) {
        detail.open = true;
      }
      if (query === "") detail.open = initialDetails.get(detail) ?? detail.open;
    }
  };
  filter?.addEventListener("input", onFilter);
  return () => {
    for (const toggle of toggles) toggle.removeEventListener("click", onToggle);
    for (const detail of details)
      detail.removeEventListener("toggle", onDetailsToggle);
    filter?.removeEventListener("input", onFilter);
  };
}
