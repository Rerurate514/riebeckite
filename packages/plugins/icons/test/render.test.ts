import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { IconRenderer } from "../src/render.js";
import type { IconPacks, LoadedIconsSettings } from "../src/settings.js";

async function rendererWithSvg(svg: string): Promise<IconRenderer> {
  const root = await mkdtemp(path.join(os.tmpdir(), "riebeckite-icons-svg-"));
  const filePath = path.join(root, "icon.svg");
  await writeFile(filePath, svg);
  const packs: IconPacks = new Map([
    [
      "test",
      new Map([
        [
          "icon",
          {
            name: "Icon.svg",
            filePath,
            size: svg.length,
            modified: 0,
          },
        ],
      ]),
    ],
  ]);
  const settings: LoadedIconsSettings = {
    iconPacks: packs,
    vaultPrefix: "",
    fingerprint: "test",
    diagnostics: [],
  };
  return new IconRenderer(settings);
}

test("renders Lucide icons on demand with currentColor defaults", () => {
  const settings: LoadedIconsSettings = {
    iconPacks: new Map(),
    vaultPrefix: "",
    fingerprint: "test",
    diagnostics: [],
  };
  const icon = new IconRenderer(settings).render("lucide:rocket", {
    source: "iconize",
    target: "note.md",
  });
  assert.ok(icon);
  assert.equal(icon.kind, "svg");
  assert.match(icon.html, /<svg/);
  assert.match(icon.html, /aria-hidden="true"/);
  assert.match(icon.html, /rr-icon--svg/);
});

test("renders emoji and optional colors", () => {
  const settings: LoadedIconsSettings = {
    iconPacks: new Map(),
    vaultPrefix: "",
    fingerprint: "test",
    diagnostics: [],
  };
  const icon = new IconRenderer(settings).render("emoji:smile", {
    source: "iconize",
    target: "inline:smile",
    color: "var(--rr-icon-red)",
  });
  assert.equal(icon?.kind, "emoji");
  assert.match(icon?.html ?? "", /style="color:var\(--rr-icon-red\)"/);
  assert.match(icon?.html ?? "", /😄/);
});

test("sanitizes scripts, event handlers, styles, and external references", async () => {
  const renderer = await rendererWithSvg(
    `<svg viewBox="0 0 24 24" onload="alert(1)">
      <script>alert(1)</script>
      <style>body{background:url(https://evil.test/x)}</style>
      <a href="javascript:alert(1)"><path d="M0 0h1v1z" /></a>
      <image href="https://evil.test/x.png" />
      <foreignObject><div>bad</div></foreignObject>
      <path d="M0 0h2v2z" fill="currentColor" />
    </svg>`,
  );
  const icon = renderer.render("pack:test:icon", {
    source: "iconize",
    target: "note.md",
  });
  assert.ok(icon);
  const html = icon.html;
  assert.doesNotMatch(
    html,
    /script|onload|javascript:|href=|url\(|foreignObject|style/i,
  );
  assert.match(html, /<path d="M0 0h2v2z"/);
});

test("rejects files that are not SVG documents", async () => {
  const renderer = await rendererWithSvg("not an svg");
  assert.equal(
    renderer.render("pack:test:icon", {
      source: "iconize",
      target: "note.md",
    }),
    undefined,
  );
});

test("unknown Lucide and pack names return undefined", () => {
  const settings: LoadedIconsSettings = {
    iconPacks: new Map(),
    vaultPrefix: "",
    fingerprint: "test",
    diagnostics: [],
  };
  const renderer = new IconRenderer(settings);
  assert.equal(
    renderer.render("lucide:definitely-not-an-icon", {
      source: "iconize",
      target: "note.md",
    }),
    undefined,
  );
  assert.equal(
    renderer.render("pack:missing:icon", {
      source: "iconize",
      target: "note.md",
    }),
    undefined,
  );
});
