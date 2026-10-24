import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  createSite,
  distPath,
  incrementalBuild,
  notePath,
  workParent,
} from "./support/ssg_site.js";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" aria-labelledby="t d">
  <title id="t">Diagram</title>
  <desc id="d">A gradient diagram.</desc>
  <!-- editor comment -->
  <defs>
    <linearGradient id="paint"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="mask"><rect width="100" height="100" fill="white"/></mask>
    <clipPath id="clip"><circle cx="50" cy="50" r="40"/></clipPath>
  </defs>
  <g mask="url(#mask)" clip-path="url(#clip)"><path fill="url(#paint)" d="M 0 0 L 10 10"/></g>
</svg>`;

test("HonoX SSG emits optimized SVG assets at their public URLs", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "svg-optimizer-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "SVG",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    svgOptimizer: true,
  });
  await writeFile(
    notePath(site, 0),
    "---\ntitle: SVG\nvisibility: public\n---\n![diagram](diagram.svg)\n",
    "utf8",
  );
  await writeFile(
    path.join(site, "vault", "secret.md"),
    "---\ntitle: Secret\nvisibility: draft\n---\n![secret](secret.svg)\n",
    "utf8",
  );
  await writeFile(
    path.join(site, "vault", "notes", "diagram.svg"),
    SVG,
    "utf8",
  );
  await writeFile(path.join(site, "vault", "notes", "secret.svg"), SVG, "utf8");

  const cold = await buildSite(site, "cold");
  assert.equal(cold.fullRegenerationRequired, true);

  const svgPath = path.join(distPath(site), "notes", "diagram.svg");
  const optimized = await readFile(svgPath, "utf8");
  assert.ok(optimized.length < SVG.length);
  assert.match(optimized, /viewBox="0 0 100 100"/);
  assert.match(optimized, /<title id="t">Diagram<\/title>/);
  assert.match(optimized, /<desc id="d">A gradient diagram\.<\/desc>/);
  assert.match(optimized, /aria-labelledby="t d"/);
  assert.match(optimized, /url\(#paint\)/);
  assert.match(optimized, /url\(#mask\)/);
  assert.match(optimized, /url\(#clip\)/);
  assert.doesNotMatch(optimized, /editor comment/);

  const html = await readFile(
    path.join(distPath(site), "notes", "note-0.html"),
    "utf8",
  );
  assert.match(html, /src="\/notes\/diagram\.svg"/);
  await assert.rejects(stat(path.join(distPath(site), "notes", "secret.svg")));

  const warm = await incrementalBuild(site, "warm");
  assert.equal(warm.fullRegenerationRequired, false);
  assert.equal(await readFile(svgPath, "utf8"), optimized);
});
