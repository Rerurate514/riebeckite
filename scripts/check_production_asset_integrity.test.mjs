import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkProductionAssetIntegrity } from "./check_production_asset_integrity.mjs";

test("accepts hashed and relative CSS and JavaScript assets", async (t) => {
  const site = await createSite(t, {
    html: '<link data-entry rel="stylesheet" href="../static/style-Udo4o2lm.css?version=1#top"><script type="module" src="../static/client-A1.js"></script>',
    assets: {
      "static/style-Udo4o2lm.css": "body { color: black; }",
      "static/client-A1.js": "console.log('ready');",
    },
    page: "guide/index.html",
  });

  const result = await checkProductionAssetIntegrity({ siteRoot: site });
  assert.equal(result.htmlFileCount, 1);
});

test("rejects HTML without a stylesheet", async (t) => {
  const site = await createSite(t, {
    html: '<script src="/static/client.js"></script>',
    assets: { "static/client.js": "ready" },
  });

  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: site }),
    /no local stylesheet/u,
  );
});

test("rejects missing and empty CSS assets", async (t) => {
  const missingSite = await createSite(t, {
    html: '<link rel="stylesheet" href="/static/missing.css"><script src="/static/client.js"></script>',
    assets: { "static/client.js": "ready" },
  });
  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: missingSite }),
    /missing CSS asset/u,
  );

  const emptySite = await createSite(t, {
    html: '<link rel="stylesheet" href="/static/style.css"><script src="/static/client.js"></script>',
    assets: { "static/style.css": "", "static/client.js": "ready" },
  });
  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: emptySite }),
    /empty CSS asset/u,
  );
});

test("rejects CSS outside Wrangler assets and missing JavaScript", async (t) => {
  const outsideSite = await createSite(t, {
    html: '<link rel="stylesheet" href="file:///outside.css"><script src="/static/client.js"></script>',
    assets: { "static/client.js": "ready" },
  });
  await writeFile(path.join(outsideSite, "outside.css"), "body {}", "utf8");
  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: outsideSite }),
    /no local stylesheet reference/u,
  );

  const scriptSite = await createSite(t, {
    html: '<link rel="stylesheet" href="/static/style.css"><script defer src="/static/missing.js"></script>',
    assets: { "static/style.css": "body {}" },
  });
  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: scriptSite }),
    /missing JavaScript asset/u,
  );
});

async function createSite(t, options) {
  const site = await mkdtemp(path.join(os.tmpdir(), "riebeckite-assets-"));
  t.after(() => rm(site, { recursive: true, force: true }));
  await writeFile(
    path.join(site, "wrangler.jsonc"),
    '{ "assets": { "directory": "./published" } }',
    "utf8",
  );
  const page = options.page ?? "index.html";
  const pagePath = path.join(site, "published", page);
  await mkdir(path.dirname(pagePath), { recursive: true });
  await writeFile(
    pagePath,
    `<!doctype html><html><head>${options.html}</head></html>`,
    "utf8",
  );
  for (const [assetPath, content] of Object.entries(options.assets)) {
    const target = path.join(site, "published", assetPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return site;
}
