import assert from "node:assert/strict";
import test from "node:test";
import { renderPendingDiagrams } from "../src/client.js";

class FakeFigure {
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  isConnected = true;
  readonly fallback = new FakeFallback();

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  querySelector(selector: string) {
    return selector === "[data-diagram-fallback]" ? this.fallback : null;
  }
}

class FakeFallback {
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

let requestedSelector = "";

async function withFigures<T>(
  figures: FakeFigure[],
  run: () => Promise<T>,
): Promise<T> {
  requestedSelector = "";
  const root = {
    querySelectorAll(selector: string) {
      requestedSelector = selector;
      return figures;
    },
  };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    value: root,
    configurable: true,
  });
  try {
    return await run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "document", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
}

test("renderPendingDiagrams accepts a selector and tracks lifecycle state", async () => {
  const figure = new FakeFigure();
  let cleaned = false;

  const cleanup = await withFigures([figure], () =>
    renderPendingDiagrams(
      "graphviz",
      () => () => {
        cleaned = true;
      },
      { selector: '[data-graphviz="pending"]' },
    ),
  );
  const selector = requestedSelector;

  assert.equal(selector, '[data-graphviz="pending"]');
  assert.equal(figure.dataset.diagramStatus, "rendered");
  assert.equal(figure.attributes.has("aria-busy"), false);

  cleanup();
  assert.equal(cleaned, true);
});

test("renderPendingDiagrams marks failures and opens the fallback", async () => {
  const figure = new FakeFigure();

  await withFigures([figure], () =>
    renderPendingDiagrams(
      "graphviz",
      () => {
        throw new Error("renderer failed");
      },
      { selector: '[data-graphviz="pending"]' },
    ),
  );

  assert.equal(figure.dataset.diagramStatus, "error");
  assert.equal(figure.attributes.has("aria-busy"), false);
  assert.equal(figure.fallback.attributes.get("open"), "");
});
