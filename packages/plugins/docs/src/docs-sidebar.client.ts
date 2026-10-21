const COLLAPSIBLE_PROPERTY = "--rb-docs-sidebar-collapsible";

type ClientContext = { root?: ParentNode };

export function initDocsSidebar(context: ClientContext = {}) {
  const root = context.root ?? document;
  const details = Array.from(
    root.querySelectorAll<HTMLDetailsElement>("[data-docs-sidebar-details]"),
  );
  const first = details[0];

  if (!first) return;

  let collapsible = isCollapsible(first);

  const apply = (value: boolean) => {
    for (const element of details) {
      element.open = !value;
    }
  };

  apply(collapsible);

  const sync = () => {
    const next = isCollapsible(first);

    if (next === collapsible) return;

    collapsible = next;
    apply(next);
  };

  window.addEventListener("resize", sync, { passive: true });
  return () => window.removeEventListener("resize", sync);
}

function isCollapsible(element: HTMLDetailsElement): boolean {
  return (
    getComputedStyle(element).getPropertyValue(COLLAPSIBLE_PROPERTY).trim() !==
    "0"
  );
}
