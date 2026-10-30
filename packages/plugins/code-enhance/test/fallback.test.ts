import assert from "node:assert/strict";
import { test } from "node:test";
import { element, text } from "../src/hast.ts";
import { rehypeCodeEnhance } from "../src/rehype.ts";
import type { ElementNode } from "../src/types.ts";

test("keeps fallback diagram source as a plain pre", async () => {
  const pre = element("pre", {}, [
    element("code", {}, [text("@startuml\nA -> B\n@enduml")]),
  ]);
  const details = element(
    "details",
    { className: "rb-plantuml__fallback rb-source-fallback" },
    [element("summary", {}, [text("Diagram source")]), pre],
  );
  const tree = element("div", {}, [details]);

  await rehypeCodeEnhance()(tree, {});

  assert.equal(details.children?.[1], pre);
  assert.equal(pre.tagName, "pre");
  assert.equal(pre.properties?.className, undefined);
});

test("still enhances regular code blocks", async () => {
  const pre = element("pre", {}, [
    element("code", { className: "language-ts" }, [text("const value = 1;")]),
  ]);
  const tree = element("div", {}, [pre]);

  await rehypeCodeEnhance()(tree, {});

  const figure = tree.children?.[0] as ElementNode;
  assert.equal(figure.tagName, "figure");
  assert.match(String(figure.properties?.className), /rr-code/);
});
