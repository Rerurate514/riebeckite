import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const notFound = read("../app/routes/_404.tsx");
const errorPage = read("../app/routes/_error.tsx");
const searchCss = read("../../../packages/plugins/search/style.css");

test("the canonical 404 route delegates its surface to the search plugin", () => {
  assert.match(
    notFound,
    /import \{ SmartNotFound \} from "@riebeckite\/plugin-search"/,
  );
  assert.match(notFound, /import type \{ Context \} from "hono"/);
  assert.match(notFound, /const handler = async \(c: Context\) => \{/);
  assert.match(notFound, /c\.status\(404\)/);
  assert.match(notFound, /c\.render\(/);
  assert.match(notFound, /<SmartNotFound path=\{c\.req\.path\} \/>/);
  assert.doesNotMatch(notFound, /dangerouslySetInnerHTML/);
});

test("the search plugin owns smart 404 styling", () => {
  assert.match(searchCss, /\.rr-search-not-found \{/);
  assert.match(searchCss, /\.rr-search-not-found__status \{/);
});

test("the canonical error surface logs and returns a plain 500", () => {
  assert.match(errorPage, /import type \{ ErrorHandler \} from "hono"/);
  assert.match(errorPage, /c\.status\(500\)/);
  assert.match(errorPage, /console\.error\(e\)/);
  assert.doesNotMatch(errorPage, /dangerouslySetInnerHTML/);
});
