export type DiagramClientContext = { root?: ParentNode; signal?: AbortSignal };
export type DiagramClientRenderer = (
  figure: HTMLElement,
  context: DiagramClientContext,
) => Promise<undefined | (() => void)> | undefined | (() => void);

export async function renderPendingDiagrams(
  kind: string,
  renderer: DiagramClientRenderer,
  context: DiagramClientContext = {},
): Promise<() => void> {
  const root = context.root ?? document;
  const selector = `[data-diagram="${CSS.escape(kind)}"][data-diagram-status="pending"]`;
  const cleanups: (() => void)[] = [];
  for (const figure of Array.from(
    root.querySelectorAll<HTMLElement>(selector),
  )) {
    if (context.signal?.aborted || !figure.isConnected) break;
    try {
      const cleanup = await renderer(figure, context);
      if (cleanup) cleanups.push(cleanup);
      if (!context.signal?.aborted && figure.isConnected)
        figure.dataset.diagramStatus = "rendered";
    } catch {
      if (!context.signal?.aborted && figure.isConnected) {
        figure.dataset.diagramStatus = "error";
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
