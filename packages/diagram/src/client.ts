export type DiagramClientContext = {
  root?: ParentNode;
  signal?: AbortSignal;
  selector?: string;
};
export type DiagramClientRenderer = (
  figure: HTMLElement,
  context: DiagramClientContext,
) => Promise<undefined | (() => void)> | undefined | (() => void);

const UNSAFE_SVG_ELEMENTS =
  "script,iframe,object,embed,animate,animateMotion,animateTransform,set,form,button,input,select,textarea,video,audio,canvas,base,link,meta";
const UNSAFE_STYLE =
  /@import|expression\s*\(|behavior\s*:|url\(\s*['"]?\s*(?!#)/i;

export function setDiagramSvg(canvas: HTMLElement, source: string): boolean {
  const parsed = new DOMParser().parseFromString(source, "text/html");
  const svg = parsed.body.firstElementChild;
  if (svg?.localName !== "svg") return false;

  for (const element of svg.querySelectorAll(UNSAFE_SVG_ELEMENTS)) {
    element.remove();
  }
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (
        name.startsWith("on") ||
        name === "src" ||
        ((name === "href" || name === "xlink:href") &&
          !attribute.value.trim().startsWith("#")) ||
        (name === "style" && UNSAFE_STYLE.test(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  for (const style of svg.querySelectorAll("style")) {
    if (UNSAFE_STYLE.test(style.textContent ?? "")) style.remove();
  }

  canvas.replaceChildren(svg);
  return true;
}

export async function renderPendingDiagrams(
  kind: string,
  renderer: DiagramClientRenderer,
  context: DiagramClientContext = {},
): Promise<() => void> {
  const root = context.root ?? document;
  const selector =
    context.selector ??
    `[data-diagram="${CSS.escape(kind)}"][data-diagram-status="pending"]`;
  const cleanups: (() => void)[] = [];
  for (const figure of Array.from(
    root.querySelectorAll<HTMLElement>(selector),
  )) {
    if (context.signal?.aborted || !figure.isConnected) break;
    figure.setAttribute("aria-busy", "true");
    try {
      const cleanup = await renderer(figure, context);
      if (cleanup) cleanups.push(cleanup);
      if (!context.signal?.aborted && figure.isConnected) {
        figure.dataset.diagramStatus = "rendered";
        figure.removeAttribute("aria-busy");
      }
    } catch {
      if (!context.signal?.aborted && figure.isConnected) {
        figure.dataset.diagramStatus = "error";
        figure.removeAttribute("aria-busy");
        figure
          .querySelector<HTMLDetailsElement>("[data-diagram-fallback]")
          ?.setAttribute("open", "");
      }
    }
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

export function detectDiagramTheme(): "light" | "dark" {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" ||
    (theme !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";
}
