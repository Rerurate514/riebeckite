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

test("renderPendingDiagrams accepts a selector and tracks lifecycle state", async () => {
  const figure = new FakeFigure();
  let selector = "";
  const root = {
    querySelectorAll(value: string) {
      selector = value;
      return [figure];
    },
  } as unknown as ParentNode;
  let cleaned = false;

  const cleanup = await renderPendingDiagrams(
    "graphviz",
    () => () => {
      cleaned = true;
    },
    { root, selector: '[data-graphviz="pending"]' },
  );

  assert.equal(selector, '[data-graphviz="pending"]');
  assert.equal(figure.dataset.diagramStatus, "rendered");
  assert.equal(figure.attributes.has("aria-busy"), false);

  cleanup();
  assert.equal(cleaned, true);
});

test("renderPendingDiagrams marks failures and opens the fallback", async () => {
  const figure = new FakeFigure();
  const root = {
    querySelectorAll() {
      return [figure];
    },
  } as unknown as ParentNode;

  await renderPendingDiagrams(
    "graphviz",
    () => {
      throw new Error("renderer failed");
    },
    { root, selector: '[data-graphviz="pending"]' },
  );

  assert.equal(figure.dataset.diagramStatus, "error");
  assert.equal(figure.attributes.has("aria-busy"), false);
  assert.equal(figure.fallback.attributes.get("open"), "");
});
