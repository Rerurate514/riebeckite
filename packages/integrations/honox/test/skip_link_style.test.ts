import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const styleUrl = new URL("../style.css", import.meta.url);

test("framework styles ship a focusable, theme-aware skip link", async () => {
  const style = await readFile(styleUrl, "utf8");

  assert.match(style, /\.rb-skip-link \{/);
  assert.match(style, /\.rb-skip-link \{[\s\S]*?position: absolute/);
  assert.match(
    style,
    /\.rb-skip-link \{[\s\S]*?transform: translateY\(-200%\)/,
  );
  assert.match(
    style,
    /\.rb-skip-link:focus \{[\s\S]*?transform: translateY\(0\)/,
  );
  assert.doesNotMatch(style, /\.rb-skip-link[^{]*\{[^}]*display: none/);
  assert.doesNotMatch(style, /\.rb-skip-link[^{]*\{[^}]*visibility: hidden/);
  assert.match(style, /\.rb-skip-link \{[\s\S]*?--rb-color-surface/);
  assert.match(style, /\.rb-skip-link \{[\s\S]*?--rb-color-ink/);
});
