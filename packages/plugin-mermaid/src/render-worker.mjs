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
  globalThis.CSSStyleSheet = window.CSSStyleSheet;
  globalThis.screen = window.screen;

  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
  });
}

function installSvgPolyfills(window) {
  const parseAttr = (element, name) => {
    const value = Number.parseFloat(element.getAttribute(name));
    return Number.isFinite(value) ? value : 0;
  };

  const computedFontSize = (element) => {
    const raw = window.getComputedStyle(element).fontSize;
    const match = /^([\d.]+)px$/.exec(raw ?? "");
    return match ? Number.parseFloat(match[1]) : 16;
  };

  const collectLineText = (node, lines, buffer) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const segments = String(child.nodeValue ?? "").split(/\n/);
        buffer.push(segments[0]);
        for (let i = 1; i < segments.length; i++) {
          lines.push(buffer.join(""));
          buffer.length = 0;
          buffer.push(segments[i]);
        }
      } else if (child.nodeType === 1) {
        if (child.localName === "br") {
          lines.push(buffer.join(""));
          buffer.length = 0;
        } else {
          collectLineText(child, lines, buffer);
        }
      }
    }
  };

  const textSize = (element) => {
    const fontSize = computedFontSize(element);
    const charWidth = fontSize * 0.6;
    const lineHeight = fontSize * 1.2;
    const lines = [];
    const buffer = [];
    collectLineText(element, lines, buffer);
    if (buffer.length > 0) lines.push(buffer.join(""));

    const nonEmpty = lines
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const linesForSize = nonEmpty.length > 0 ? nonEmpty : [""];
    let width = 0;
    for (const line of linesForSize) {
      width = Math.max(width, line.length * charWidth);
    }
    width = Math.max(width, charWidth);
    return { width, height: linesForSize.length * lineHeight };
  };

  const measureNodeInto = (element, boxes) => {
    switch (element.localName) {
      case "text":
        boxes.push({ x: 0, y: 0, ...textSize(element) });
        return;
      case "foreignObject": {
        const size = textSize(element);
        const width = parseAttr(element, "width") || size.width;
        const height = parseAttr(element, "height") || size.height;
        boxes.push({ x: 0, y: 0, width, height });
        return;
      }
      case "rect":
        boxes.push({
          x: parseAttr(element, "x"),
          y: parseAttr(element, "y"),
          width: parseAttr(element, "width"),
          height: parseAttr(element, "height"),
        });
        return;
      case "circle": {
        const cx = parseAttr(element, "cx");
        const cy = parseAttr(element, "cy");
        const r = parseAttr(element, "r");
        boxes.push({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 });
        return;
      }
      case "ellipse": {
        const rx = parseAttr(element, "rx");
        const ry = parseAttr(element, "ry");
        boxes.push({
          x: parseAttr(element, "cx") - rx,
          y: parseAttr(element, "cy") - ry,
          width: rx * 2,
          height: ry * 2,
        });
        return;
      }
      case "polygon":
      case "polyline": {
        const points = String(element.getAttribute("points") ?? "")
          .trim()
          .split(/[\s,]+/)
          .map(Number)
          .filter(Number.isFinite);
        if (points.length >= 4) {
          const xs = [];
          const ys = [];
          for (let i = 0; i + 1 < points.length; i += 2) {
            xs.push(points[i]);
            ys.push(points[i + 1]);
          }
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          boxes.push({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          });
        }
        return;
      }
      case "path":
      case "image":
        return;
      default:
        for (const child of element.children) {
          measureNodeInto(child, boxes);
        }
    }
  };

  const estimateBBox = (element) => {
    const boxes = [];
    measureNodeInto(element, boxes);
    if (boxes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of boxes) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      top: minY,
      right: maxX,
      bottom: maxY,
      left: minX,
    };
  };

  if (
    window.SVGElement &&
    typeof window.SVGElement.prototype.getBBox !== "function"
  ) {
    window.SVGElement.prototype.getBBox = function () {
      return estimateBBox(this);
    };
  }

  if (
    window.SVGElement &&
    typeof window.SVGElement.prototype.getComputedTextLength !== "function"
  ) {
    window.SVGElement.prototype.getComputedTextLength = function () {
      const text = (this.textContent ?? "").replace(/\s+/g, " ").trim();
      return text.length * computedFontSize(this) * 0.6;
    };
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
