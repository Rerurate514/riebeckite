const HEAD_OWNER_ATTRIBUTE = "data-riebeckite-head";

export function reconcileDocument(page: Document): void {
  document.title = page.title;
  reconcilePageHead(page);
  copyDocumentAttribute(page, "lang");
  copyDocumentAttribute(page, "dir");
}

function reconcilePageHead(page: Document): void {
  for (const node of Array.from(document.head.children)) {
    if (isPageHeadNode(node)) node.remove();
  }
  for (const node of Array.from(page.head.children)) {
    if (isPageHeadNode(node)) document.head.append(node.cloneNode(true));
  }
}

function copyDocumentAttribute(page: Document, name: string): void {
  const value = page.documentElement.getAttribute(name);
  if (value) document.documentElement.setAttribute(name, value);
  else document.documentElement.removeAttribute(name);
}

function isPageHeadNode(node: Element): boolean {
  // Replacing an executable script would run it again, so only data scripts
  // participate in page ownership.
  if (node.matches("script") && !isDataScript(node)) return false;
  const owner = node.getAttribute(HEAD_OWNER_ATTRIBUTE);
  if (owner === "page") return true;
  if (owner === "global" || owner === "runtime") return false;
  return isLegacyPageHeadNode(node);
}

function isDataScript(node: Element): boolean {
  const type = node.getAttribute("type")?.trim().toLowerCase();
  return type === "application/ld+json" || type === "application/json";
}

function isLegacyPageHeadNode(node: Element): boolean {
  if (node.matches('link[rel="canonical"], link[hreflang]')) return true;
  if (node.matches('script[type="application/ld+json"]')) return true;
  if (!node.matches("meta")) return false;
  const name = node.getAttribute("name");
  if (name && ["description", "author", "robots"].includes(name)) return true;
  if (name?.startsWith("twitter:")) return true;
  const property = node.getAttribute("property");
  return (
    property?.startsWith("og:") === true ||
    property?.startsWith("article:") === true
  );
}

export function focusPage(root: HTMLElement, url: URL): void {
  if (url.hash) return;
  if (!root.hasAttribute("tabindex")) root.tabIndex = -1;
  root.focus({ preventScroll: true });
}

export function focusHashTarget(url: URL): void {
  const target = hashTarget(url);
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function hashTarget(url: URL): HTMLElement | null {
  if (!url.hash) return null;
  let id = url.hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return document.getElementById(id);
}

export function announceNavigation(): void {
  let announcer = document.getElementById("riebeckite-navigation-announcer");
  if (!announcer) {
    announcer = document.createElement("div");
    announcer.id = "riebeckite-navigation-announcer";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "riebeckite-visually-hidden";
    document.body.append(announcer);
  }
  announcer.textContent = document.title;
}
