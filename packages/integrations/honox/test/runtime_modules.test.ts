import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { resolveHonoxConfig } from "../runtime.js";
import {
  isRiebeckiteRuntimeModuleId,
  riebeckiteConfigModuleId,
  riebeckiteContentModuleId,
  riebeckiteContentRenderersModuleId,
  riebeckiteRuntimeModules,
} from "../src/runtime_modules.js";

const application = {
  config: {} as ResolvedRiebeckiteConfig,
  configRoot: path.resolve("/site"),
  configFile: path.resolve("/site/riebeckite.config.ts"),
  appRoot: path.resolve("/site"),
  contentRoot: path.resolve("/site/content"),
};

function asHook<A, R>(hook: unknown): (arg: A) => R {
  return hook as (arg: A) => R;
}

describe("riebeckiteRuntimeModules", () => {
  it("resolves and loads the config module from the raw config file", () => {
    const plugin = riebeckiteRuntimeModules(() => application);
    const resolveId = asHook<string, string | null>(plugin.resolveId);
    const load = asHook<string, string | null>(plugin.load);

    assert.equal(
      resolveId(riebeckiteConfigModuleId),
      `\0${riebeckiteConfigModuleId}`,
    );

    const code = load(`\0${riebeckiteConfigModuleId}`);
    assert.ok(code);
    assert.match(code, /resolveConfigModule/);
    assert.match(code, /@riebeckite\/honox\/runtime/);
    assert.match(code, /\/site\/riebeckite\.config\.ts/);
  });

  it("resolves and loads the content module", () => {
    const plugin = riebeckiteRuntimeModules(() => application);
    const resolveId = asHook<string, string | null>(plugin.resolveId);
    const load = asHook<string, string | null>(plugin.load);

    assert.equal(
      resolveId(riebeckiteContentModuleId),
      `\0${riebeckiteContentModuleId}`,
    );

    const code = load(`\0${riebeckiteContentModuleId}`);
    assert.ok(code);
    assert.match(code, /new ContentManager/);
    assert.match(code, /virtual:riebeckite\/config/);
    assert.match(code, /isDevelopment: import\.meta\.env\.DEV/);
  });

  it("marks the content module as development during Vite serve", () => {
    const plugin = riebeckiteRuntimeModules(() => application);
    const configResolved = asHook<{ command: string }, void>(
      plugin.configResolved,
    );
    const load = asHook<string, string | null>(plugin.load);

    configResolved({ command: "serve" });

    const code = load(`\0${riebeckiteContentModuleId}`);
    assert.ok(code);
    assert.match(code, /isDevelopment: true/);
  });

  it("builds static content renderer imports", () => {
    const plugin = riebeckiteRuntimeModules(() => ({
      ...application,
      config: {
        ...application.config,
        plugins: [
          {
            name: "mdx",
            contentFormats: [
              {
                extension: ".mdx",
                rendererModule: "virtual:riebeckite/mdx-renderer",
              },
            ],
          },
        ],
      },
    }));
    const load = asHook<string, string | null>(plugin.load);

    const code = load(`\0${riebeckiteContentRenderersModuleId}`);
    assert.ok(code);
    assert.match(
      code,
      /import renderer0 from "virtual:riebeckite\/mdx-renderer"/,
    );
    assert.match(code, /renderContent/);
  });

  it("registers plugin components with MDX content renderers", () => {
    const plugin = riebeckiteRuntimeModules(() => ({
      ...application,
      config: {
        ...application.config,
        plugins: [
          {
            name: "components",
            components: [
              {
                name: "Notice",
                render: () => "<p>Notice</p>",
                client: { moduleSpecifier: "notice-client" },
              },
            ],
            contentFormats: [
              {
                extension: ".mdx",
                rendererModule: "virtual:riebeckite/mdx-renderer",
              },
            ],
          },
        ],
      },
    }));
    const load = asHook<string, string | null>(plugin.load);

    const code = load(`\0${riebeckiteContentRenderersModuleId}`);
    assert.ok(code);
    assert.match(code, /preparePluginComponent/);
    assert.match(code, /plugin\.components/);
    assert.match(code, /registeredComponents/);
    assert.match(code, /components: \{ \.\.\.registeredComponents/);
  });

  it("ignores unrelated ids", () => {
    const plugin = riebeckiteRuntimeModules(() => application);
    const resolveId = asHook<string, string | null>(plugin.resolveId);

    assert.equal(resolveId("/site/app/routes/index.tsx"), null);
    assert.equal(resolveId("node:path"), null);
  });

  it("normalizes Windows config paths in the generated import", () => {
    const plugin = riebeckiteRuntimeModules(() => ({
      ...application,
      configFile: "C:\\site\\riebeckite.config.ts",
    }));
    const load = asHook<string, string | null>(plugin.load);

    const code = load(`\0${riebeckiteConfigModuleId}`);
    assert.ok(code);
    assert.match(code, /C:\/site\/riebeckite\.config\.ts/);
  });

  it("recognizes runtime module ids with and without the null prefix", () => {
    assert.equal(isRiebeckiteRuntimeModuleId(riebeckiteConfigModuleId), true);
    assert.equal(
      isRiebeckiteRuntimeModuleId(`\0${riebeckiteContentModuleId}`),
      true,
    );
    assert.equal(isRiebeckiteRuntimeModuleId("/site/app/server.ts"), false);
    assert.equal(isRiebeckiteRuntimeModuleId(null), false);
    assert.equal(isRiebeckiteRuntimeModuleId(undefined), false);
  });
});

describe("resolveHonoxConfig via @riebeckite/honox/runtime", () => {
  it("resolves build, output and content directories against appRoot", () => {
    const appRoot = path.resolve("/site");
    const resolved = resolveHonoxConfig(
      {
        content: { directory: "content" },
      } as ResolvedRiebeckiteConfig,
      appRoot,
    );

    assert.equal(resolved.buildDirectory, path.join(appRoot, ".riebeckite"));
    assert.equal(resolved.outputDirectory, path.join(appRoot, "dist"));
    assert.equal(resolved.content.directory, path.join(appRoot, "content"));
  });
});
