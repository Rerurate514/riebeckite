import { JSDOM } from "jsdom";

function installDomGlobals(window) {
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;
  globalThis.Node = window.Node;
  globalThis.SVGElement = window.SVGElement;
  globalThis.SVGSVGElement = window.SVGSVGElement;
  globalThis.DOMParser = window.DOMParser;
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);

  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
  });
}

function installSvgPolyfills(window) {
  const createBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  if (
    window.SVGElement &&
    typeof window.SVGElement.prototype.getBBox !== "function"
  ) {
    window.SVGElement.prototype.getBBox = createBBox;
  }
}

async function readRequest() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const input = Buffer.concat(chunks).toString("utf8").trim();

  if (!input) {
    throw new Error("No renderer input received");
  }

  return JSON.parse(input);
}

async function render(request) {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
      pretendToBeVisual: true,
      url: "http://localhost/",
    },
  );

  try {
    installDomGlobals(dom.window);
    installSvgPolyfills(dom.window);

    // Mermaid must be evaluated only after the DOM environment exists.
    const { default: mermaid } = await import("mermaid");

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: request.theme,
    });

    const { svg } = await mermaid.render(
      request.id,
      request.source,
    );

    return svg;
  } finally {
    dom.window.close();
  }
}

async function main() {
  try {
    const request = await readRequest();
    const svg = await render(request);

    process.stdout.write(
      JSON.stringify({
        svg,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.stack ?? error.message
        : String(error);

    process.stdout.write(
      JSON.stringify({
        error: message,
      }),
    );

    process.exitCode = 1;
  }
}

await main();
