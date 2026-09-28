import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type Diagnostic,
  normalizeGeneratedOutputPath,
  type PluginManifestContext,
} from "@riebeckite/core";
import {
  deployPlugin,
  type DeployOutput,
  planDeployOutputs,
  type PublicRedirect,
  renderRedirectLines,
  renderRedirectStub,
  renderVercelConfig,
} from "../index.js";

const sampleRedirects: readonly PublicRedirect[] = [
  { from: "/old-b", to: "/b", status: 302 },
  { from: "/old-a", to: "/a", status: 301 },
  { from: "/old-a", to: "/a", status: 301 },
];

function pathOf(outputs: readonly DeployOutput[], path: string): DeployOutput {
  const found = outputs.find((output) => output.path === path);
  assert.ok(found, `expected an output at "${path}"`);
  return found;
}

test("github-pages emits an empty .nojekyll", () => {
  const outputs = planDeployOutputs({
    provider: "github-pages",
    redirects: [],
  });
  assert.equal(pathOf(outputs, ".nojekyll").content, "");
  assert.ok(pathOf(outputs, "404.html").content.includes('href="/"'));
});

test("github-pages redirect stubs use meta refresh and canonical", () => {
  const outputs = planDeployOutputs({
    provider: "github-pages",
    redirects: [{ from: "/old", to: "/new", status: 301 }],
  });
  const stub = pathOf(outputs, "old/index.html");
  assert.match(
    stub.content,
    /<meta http-equiv="refresh" content="0; url=\/new">/,
  );
  assert.match(stub.content, /<link rel="canonical" href="\/new">/);
});

test("github-pages skips the root redirect", () => {
  const outputs = planDeployOutputs({
    provider: "github-pages",
    redirects: [{ from: "/", to: "/home", status: 301 }],
  });
  assert.equal(
    outputs.some((output) => output.path === "index.html"),
    false,
  );
  assert.equal(
    outputs.some((output) => output.path === "home/index.html"),
    false,
  );
});

test("github-pages stubs resolve baseUrl to an absolute canonical", () => {
  const outputs = planDeployOutputs({
    provider: "github-pages",
    redirects: [{ from: "/old", to: "/new", status: 301 }],
    options: { provider: "github-pages", baseUrl: "https://example.com" },
  });
  const stub = pathOf(outputs, "old/index.html");
  assert.match(
    stub.content,
    /<link rel="canonical" href="https:\/\/example\.com\/new">/,
  );
});

test("_redirects is sorted, deduped, and newline terminated", () => {
  for (const provider of ["netlify", "cloudflare-pages"] as const) {
    const outputs = planDeployOutputs({ provider, redirects: sampleRedirects });
    assert.equal(
      pathOf(outputs, "_redirects").content,
      "/old-a /a 301\n/old-b /b 302\n",
    );
  }
  assert.equal(
    renderRedirectLines(sampleRedirects),
    "/old-a /a 301\n/old-b /b 302\n",
  );
  assert.equal(renderRedirectLines([]), "");
});

test("_headers is only written when headers are configured", () => {
  const withoutHeaders = planDeployOutputs({
    provider: "netlify",
    redirects: sampleRedirects,
  });
  assert.equal(
    withoutHeaders.some((output) => output.path === "_headers"),
    false,
  );

  const withHeaders = planDeployOutputs({
    provider: "netlify",
    redirects: sampleRedirects,
    options: { provider: "netlify", headers: { "X-B": "2", "X-A": "1" } },
  });
  assert.equal(
    pathOf(withHeaders, "_headers").content,
    "/*\n  X-A: 1\n  X-B: 2\n",
  );
});

test("vercel.json is valid JSON with the expected redirects", () => {
  const content = renderVercelConfig({
    redirects: sampleRedirects,
    options: { provider: "vercel", trailingSlash: "never" },
  });
  assert.ok(content.endsWith("\n"));
  const parsed = JSON.parse(content) as {
    redirects: Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;
    cleanUrls: boolean;
    trailingSlash: boolean;
  };
  assert.deepEqual(parsed.redirects, [
    { source: "/old-a", destination: "/a", permanent: true },
    { source: "/old-b", destination: "/b", permanent: false },
  ]);
  assert.equal(parsed.cleanUrls, true);
  assert.equal(parsed.trailingSlash, false);

  const outputs = planDeployOutputs({
    provider: "vercel",
    redirects: sampleRedirects,
  });
  assert.ok(pathOf(outputs, "vercel.json").content.endsWith("\n"));
});

test("provider outputs do not leak into other providers", () => {
  const netlify = planDeployOutputs({
    provider: "netlify",
    redirects: sampleRedirects,
  });
  assert.equal(
    netlify.some((output) => output.path === "vercel.json"),
    false,
  );
  assert.equal(
    netlify.some((output) => output.path === ".nojekyll"),
    false,
  );

  const vercel = planDeployOutputs({
    provider: "vercel",
    redirects: sampleRedirects,
  });
  assert.equal(
    vercel.some((output) => output.path === "_redirects"),
    false,
  );
  assert.equal(
    vercel.some((output) => output.path === ".nojekyll"),
    false,
  );

  const githubPages = planDeployOutputs({
    provider: "github-pages",
    redirects: sampleRedirects,
    options: { provider: "github-pages", cname: "example.com" },
  });
  assert.equal(
    githubPages.some(
      (output) => output.path === "_redirects" || output.path === "vercel.json",
    ),
    false,
  );
  assert.equal(pathOf(githubPages, "CNAME").content, "example.com\n");
});

test("redirect paths with traversal are sanitized into safe paths", () => {
  const outputs = planDeployOutputs({
    provider: "github-pages",
    redirects: [
      { from: "/../../etc/passwd", to: "/safe", status: 301 },
      { from: "/a/../b", to: "/b", status: 301 },
    ],
  });
  assert.equal(
    pathOf(outputs, "etc/passwd/index.html").content.length > 0,
    true,
  );
  assert.equal(pathOf(outputs, "b/index.html").content.length > 0, true);
  for (const output of outputs) {
    assert.doesNotThrow(() => normalizeGeneratedOutputPath(output.path));
  }
});

test("conflicting paths within a provider throw", () => {
  assert.throws(
    () =>
      planDeployOutputs({
        provider: "github-pages",
        redirects: [
          { from: "/a/../b", to: "/x", status: 301 },
          { from: "/b", to: "/y", status: 301 },
        ],
      }),
    /conflicting content/,
  );
});

test("planning is deterministic across repeated calls", () => {
  const plan = () =>
    planDeployOutputs({
      provider: "github-pages",
      redirects: sampleRedirects,
      options: { provider: "github-pages", cname: "example.com" },
    });
  assert.deepEqual(plan(), plan());
});

test("renderRedirectStub is self-contained and newline terminated", () => {
  const stub = renderRedirectStub({ from: "/old", to: "/new", status: 301 });
  assert.ok(stub.endsWith("\n"));
  assert.match(stub, /url=\/new/);
  assert.match(stub, /rel="canonical"/);
});

test("deployPlugin plans a single provider through the output sink", async () => {
  const { outputs } = await runPlugin(
    { provider: "netlify" },
    sampleManifest(),
  );
  const redirects = pathOf(outputs, "_redirects");
  assert.equal(redirects.content, "/old /new 301\n");
  assert.equal(
    outputs.some((output) => output.path === "vercel.json"),
    false,
  );
});

test("deployPlugin unions multiple providers and dedupes shared files", async () => {
  const { outputs } = await runPlugin(
    { provider: ["netlify", "cloudflare-pages", "vercel"] },
    sampleManifest(),
  );
  assert.equal(
    outputs.filter((output) => output.path === "_redirects").length,
    1,
  );
  assert.ok(outputs.some((output) => output.path === "vercel.json"));
});

test("an unresolved redirect target is skipped and diagnosed", async () => {
  const { outputs, diagnostics } = await runPlugin(
    { provider: "github-pages" },
    sampleManifest(),
  );
  assert.ok(outputs.some((output) => output.path === "old/index.html"));
  assert.equal(
    outputs.some((output) => output.path === "missing/index.html"),
    false,
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "deploy-unresolved-redirect");
  assert.equal(diagnostics[0]?.severity, "warning");
});

function sampleManifest(): ContentManifest {
  return {
    publicRedirects: new Map([
      ["/old", { path: "/old", status: 301 as const, slug: "new" }],
      ["/missing", { path: "/missing", status: 301 as const, slug: "gone" }],
    ]),
    bySlug: new Map([["new", { slug: "new", permalink: "/new" }]]),
  } as unknown as ContentManifest;
}

async function runPlugin(
  options: Parameters<typeof deployPlugin>[0],
  manifest: ContentManifest,
): Promise<{ outputs: DeployOutput[]; diagnostics: Diagnostic[] }> {
  const outputs: DeployOutput[] = [];
  const diagnostics: Diagnostic[] = [];
  const plugin = deployPlugin(options);
  await plugin.onBuildEnd?.({
    manifest,
    output: { emit: (output) => outputs.push(output) },
    diagnostics,
  } as unknown as PluginManifestContext);
  return { outputs, diagnostics };
}
