import assert from "node:assert/strict";
import { test } from "node:test";
import { element, text } from "../src/hast.ts";
import { rehypeCodeEnhance } from "../src/rehype.ts";
import type { ElementNode } from "../src/types.ts";

test("enhances fallback diagram source like a regular code block", async () => {
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

  const figure = details.children?.[1] as ElementNode;
  assert.equal(figure.tagName, "figure");
  assert.match(String(figure.properties?.className), /rr-code/);
  const header = figure.children?.[0] as ElementNode;
  const actions = header.children?.[1] as ElementNode;
  assert.ok(
    actions.children?.some((action) => {
      if (action.type !== "element") return false;
      const properties = action.properties as
        | Record<string, unknown>
        | undefined;
      return properties?.dataCodeCopy === "true";
    }),
  );
  assert.ok(
    actions.children?.some((action) => {
      if (action.type !== "element") return false;
      const properties = action.properties as
        | Record<string, unknown>
        | undefined;
      return properties?.dataCodeWrapToggle === "true";
    }),
  );
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
