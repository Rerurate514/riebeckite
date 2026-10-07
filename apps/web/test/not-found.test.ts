import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const notFound = read("../app/routes/_404.tsx");
const errorPage = read("../app/routes/_error.tsx");
const shellCss = read("../app/styles/shell.css");

test("the canonical 404 surface owns its presentation and keeps status 404", () => {
  assert.match(notFound, /import type \{ NotFoundHandler \} from "hono"/);
  assert.match(notFound, /c\.status\(404\)/);
  assert.match(notFound, /c\.render\(/);
  assert.match(notFound, /class="not-found"/);
  assert.doesNotMatch(notFound, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(notFound, /Default404/);
});

test("the canonical 404 surface is styled by site CSS", () => {
  assert.match(shellCss, /\.not-found \{/);
  assert.match(shellCss, /\.not-found__status \{/);
});

test("the canonical error surface logs and returns a plain 500", () => {
  assert.match(errorPage, /import type \{ ErrorHandler \} from "hono"/);
  assert.match(errorPage, /c\.status\(500\)/);
  assert.match(errorPage, /console\.error\(e\)/);
  assert.doesNotMatch(errorPage, /dangerouslySetInnerHTML/);
});
