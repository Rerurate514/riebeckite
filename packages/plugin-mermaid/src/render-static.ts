type MermaidApi = {
  initialize(options: Record<string, unknown>): void;
  parse(
    source: string,
    options: { suppressErrors: false },
  ): Promise<unknown> | unknown;
  render(
    id: string,
    source: string,
  ): Promise<{ svg: string }> | { svg: string };
};

type MermaidModule = {
  default: MermaidApi;
};

const MERMAID_PACKAGE_NAME = "mermaid";

let mermaidPromise: Promise<MermaidApi> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();

export async function renderMermaidStaticSvg(
  id: string,
  source: string,
  theme: string,
): Promise<string> {
  return await enqueueMermaidRender(async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
    });
    await mermaid.parse(source, { suppressErrors: false });
    const rendered = await mermaid.render(id, source);
    return sanitizeSvg(rendered.svg);
  });
}

async function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import(MERMAID_PACKAGE_NAME).then(
    (module) => (module as MermaidModule).default,
  );
  return mermaidPromise;
}

async function enqueueMermaidRender<T>(render: () => Promise<T>): Promise<T> {
  const current = renderQueue.then(render, render);
  renderQueue = current.catch(() => undefined);
  return current;
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+=("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(
      /\s(?:href|xlink:href)=("javascript:[^"]*"|'javascript:[^']*')/gi,
      "",
    );
}
