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
  assert.equal(result.stylesheetReferenceCount, 1);
  assert.equal(result.scriptReferenceCount, 1);
});

test("checks every public HTML file, including README-derived pages", async (t) => {
  const site = await createSite(t, {
    html: '<link rel="stylesheet" href="/static/style.css"><script src="/static/client.js"></script>',
    assets: {
      "static/style.css": "body {}",
      "static/client.js": "ready",
    },
    page: "README.html",
  });
  await writePage(
    site,
    "guide/index.html",
    '<link rel="stylesheet" href="/static/style.css"><script src="/static/client.js"></script>',
  );

  const result = await checkProductionAssetIntegrity({ siteRoot: site });
  assert.equal(result.htmlFileCount, 2);
  assert.equal(result.stylesheetReferenceCount, 2);
  assert.equal(result.scriptReferenceCount, 2);
});

test("rejects one stylesheet-less page among otherwise valid public pages", async (t) => {
  const site = await createSite(t, {
    html: '<link rel="stylesheet" href="/static/style.css"><script src="/static/client.js"></script>',
    assets: {
      "static/style.css": "body {}",
      "static/client.js": "ready",
    },
  });
  await writePage(
    site,
    "README.html",
    '<script src="/static/client.js"></script>',
  );

  await assert.rejects(
    checkProductionAssetIntegrity({ siteRoot: site }),
    /README\.html has no local stylesheet/u,
  );
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
  await writePage(site, page, options.html);
  for (const [assetPath, content] of Object.entries(options.assets)) {
    const target = path.join(site, "published", assetPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return site;
}

async function writePage(site, page, html) {
  const pagePath = path.join(site, "published", page);
  await mkdir(path.dirname(pagePath), { recursive: true });
  await writeFile(
    pagePath,
    `<!doctype html><html><head>${html}</head></html>`,
    "utf8",
  );
}
