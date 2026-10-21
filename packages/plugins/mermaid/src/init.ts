import type { MermaidClientOptions, MermaidTheme } from "./types.js";

const DEFAULT_THEME = { light: "default", dark: "dark" };
const DEFAULT_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

type ClientContext = {
  root?: ParentNode;
  signal?: AbortSignal;
  config?: MermaidClientOptions;
};

export async function initMermaidDiagrams(context: ClientContext = {}) {
  const options = context.config ?? {};
  const root = context.root ?? document;
  const mermaid = options.mermaid ?? (await loadMermaid(options.scriptUrl));
  if (!mermaid) return;
  if (context.signal?.aborted) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: selectTheme(options.theme ?? DEFAULT_THEME),
  });

  const diagrams = root.querySelectorAll<HTMLElement>(
    '.rr-mermaid[data-mermaid="pending"]',
  );

  for (const [index, diagram] of Array.from(diagrams).entries()) {
    if (context.signal?.aborted || !diagram.isConnected) return;
    await renderDiagram(mermaid, diagram, index, context.signal);
  }
}

async function renderDiagram(
  mermaid: NonNullable<MermaidClientOptions["mermaid"]>,
  diagram: HTMLElement,
  index: number,
  signal?: AbortSignal,
) {
  const source = diagram.dataset.mermaidSource;
  const canvas = diagram.querySelector<HTMLElement>(".rr-mermaid__canvas");
  if (!source || !canvas) return;

  try {
    const { svg } = await mermaid.render(`rr-mermaid-client-${index}`, source);
    if (signal?.aborted || !diagram.isConnected) return;
    canvas.innerHTML = svg;
    diagram.removeAttribute("data-mermaid");
  } catch {
    diagram.dataset.mermaid = "error";
  }
}

async function loadMermaid(scriptUrl = DEFAULT_SCRIPT_URL) {
  const value = (globalThis as { mermaid?: MermaidClientOptions["mermaid"] })
    .mermaid;
  if (value) return value;
  await loadScript(scriptUrl);
  return (
    (globalThis as { mermaid?: MermaidClientOptions["mermaid"] }).mermaid ??
    null
  );
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-rr-mermaid-script="true"]`,
  );
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.rrMermaidScript = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Mermaid")),
      {
        once: true,
      },
    );
    document.head.appendChild(script);
  });
}

function selectTheme(theme: MermaidTheme): string {
  if (typeof theme === "string") return theme;
  return prefersDark() ? theme.dark : theme.light;
}

function prefersDark(): boolean {
  return document.documentElement.dataset.theme === "dark"
    ? true
    : document.documentElement.dataset.theme === "light"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
}
