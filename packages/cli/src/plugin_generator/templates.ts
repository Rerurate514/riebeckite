import type { PluginFeatureId } from "./registry.js";

const featureCode: Readonly<Record<PluginFeatureId, string>> = {
  transform: `processedContentCache: { version: "1", dependencyMode: "none" },
    extendHtmlPipeline(pipeline) {
      pipeline.use(() => (tree: { data?: Record<string, unknown> }) => {
        tree.data = { ...tree.data, plugin: "PLUGIN" };
        return tree;
      });
    },`,
  renderers: `renderers: [{
      name: "text-preview",
      render: ({ kind, embed, raw }) => kind === "attachment" && embed
        ? \`<pre class="rr-PLUGIN-text">\${escapeHtml(raw)}</pre>\`
        : null,
    }],`,
  "content-hooks": `onContentLoaded({ slug, markdown, diagnostics }) {
      const line = markdown.split(/\\r?\\n/).findIndex((value) => value.includes("TODO"));
      if (line >= 0) diagnostics.push({ code: "PLUGIN/todo", severity: "warning", message: "Remove TODO before publishing.", slug, line: line + 1 });
    },`,
  urls: `extendContentLocations({ entries, locations, diagnostics }) {
      for (const entry of entries) {
        const location = locations.get(entry.slug);
        const legacy = \`/notes/\${entry.slug}\`;
        const isTaken = [...locations.values()].some((candidate) => candidate.permalink === legacy || candidate.redirects?.some((redirect) => redirect.path === legacy));
        if (location && legacy !== location.permalink && !isTaken) {
          locations.set(entry.slug, { ...location, redirects: [...(location.redirects ?? []), { path: legacy, status: 301 }] });
        } else if (location && legacy !== location.permalink && isTaken) {
          diagnostics.push({ code: "PLUGIN/legacy-url-conflict", severity: "warning", message: \`Skipped conflicting legacy URL \${legacy}.\`, slug: entry.slug });
        }
      }
    },`,
  "content-graph": `extendContentGraph({ entries, contentIndex }) {
      for (const entry of entries) {
        const related = entry.frontmatter.related;
        if (!Array.isArray(related)) continue;
        for (const raw of related) {
          if (typeof raw !== "string") continue;
          const slug = contentIndex.get(raw.trim().toLowerCase().replace(/\\.md$/, ""));
          if (slug && slug !== entry.slug && !entry.links.some((link) => link.slug === slug)) entry.links.push({ raw, slug, kind: "note", embed: false });
        }
      }
    },`,
  pages: `pageTypes: [{
      id: "PLUGIN-index",
      paths: ["__PAGE_PATH__"],
      outputDependencies: [{ type: "global" }],
      resolve: ({ manifest, pathname }) => pathname === "__PAGE_PATH__" ? {
        type: "PLUGIN-index", pathname, title: "Plugin index",
        body: \`<ul>\${manifest.discoverableEntries.map((entry) => \`<li><a href="\${escapeHtmlAttribute(entry.permalink)}">\${escapeHtml(entry.title)}</a></li>\`).join("")}</ul>\`,
      } : null,
    }],`,
  components: ``,
  "assets-and-client-entries": `assets: [createStyleAsset("PLUGIN", "/extensions/PLUGIN/style.css")],
    clientEntries: [createClientEntry("PLUGIN", "/extensions/PLUGIN/client.ts", "initPlugin", { label: "Plugin" })],`,
  endpoints: `endpoints: [defineEndpoint("/PLUGIN.json", ({ manifest }) => ({
      json: manifest.discoverableEntries.map(({ title, permalink, tags }) => ({ title, permalink, tags })),
    }), { cacheControl: "public, max-age=300" })],`,
  seo: `onManifestCreated({ manifest }) {
      for (const entry of manifest.publicEntries) {
        entry.headTags = [...(entry.headTags ?? []), { tag: "meta", attrs: { name: "PLUGIN", content: "enabled" } }];
      }
    },`,
  "generated-files": `planGeneratedOutputs: ({ manifest }) => [{
      path: "PLUGIN.txt",
      content: manifest.discoverableEntries.map((entry) => \`\${entry.title} <\${entry.permalink}>\`).join("\\n"),
      dependencies: [{ type: "global" }],
    }],`,
  diagnostics: `inspectGeneratedHtml(page) {
      return page.html.includes("TODO") ? [{ code: "PLUGIN/todo-in-html", severity: "warning", message: "Remove TODO before publishing.", target: page.path }] : [];
    },`,
  cache: `cacheVersion: "1",`,
  "dependencies-and-options": `options,
    provides: ["PLUGIN.feature"],
    optional: ["content.query"],
    order: 0,
    validateOptions(value) {
      return value?.path !== undefined && !value.path.startsWith("/")
        ? [{ path: "path", message: "Use an absolute URL path." }]
        : [];
    },`,
  "logging-and-tracing": ``,
};

export function renderPluginIndex(
  pluginName: string,
  features: readonly PluginFeatureId[],
  pagePath = `/${pluginName}/`,
): string {
  const needsEscape = features.some((feature) =>
    ["renderers", "pages"].includes(feature),
  );
  const needsAssets = features.includes("assets-and-client-entries");
  const needsEndpoint = features.includes("endpoints");
  const imports = ["definePlugin"];
  if (needsEscape) imports.push("escapeHtml", "escapeHtmlAttribute");
  if (needsAssets) imports.push("createClientEntry", "createStyleAsset");
  if (needsEndpoint) imports.push("defineEndpoint");
  const options = features.includes("dependencies-and-options")
    ? `export type ${toIdentifier(pluginName)}Options = { readonly path?: string };\n\n`
    : "";
  const factoryOptions = features.includes("dependencies-and-options")
    ? `options: ${toIdentifier(pluginName)}Options = {}`
    : "";
  const properties = features
    .map((feature) =>
      featureCode[feature]
        .replaceAll("PLUGIN", pluginName)
        .replaceAll("__PAGE_PATH__", pagePath),
    )
    .filter(Boolean)
    .join("\n    ");
  const buildStart = renderBuildStart(pluginName, features);
  return `import { ${imports.join(", ")} } from "@riebeckite/core";\n\n${options}export function ${toIdentifier(pluginName)}Plugin(${factoryOptions}) {\n  return definePlugin({\n    name: "${pluginName}",\n    ${properties}${buildStart}\n  });\n}\n`;
}

function renderBuildStart(
  pluginName: string,
  features: readonly PluginFeatureId[],
): string {
  if (!features.includes("cache") && !features.includes("logging-and-tracing"))
    return "";
  const cache = features.includes("cache")
    ? `\n      const key = "${pluginName}:initialized";\n      if ((await cache.get<boolean>(key)) !== true) await cache.set(key, true);`
    : "";
  const tracing = features.includes("logging-and-tracing")
    ? `\n      await tracer.span("${pluginName}.prepare", { plugin: "${pluginName}" }, async () => log.debug("Preparing plugin"));`
    : "";
  return `\n    buildStart: async ({ cache, logger, tracer }) => {\n      const log = logger.child({ plugin: "${pluginName}" });${cache}${tracing}\n    },`;
}

export function renderPluginFiles(
  pluginName: string,
  features: readonly PluginFeatureId[],
  tests: boolean,
  documentation: boolean,
  pagePath?: string,
): ReadonlyMap<string, string> {
  const files = new Map<string, string>([
    ["index.ts", renderPluginIndex(pluginName, features, pagePath)],
  ]);
  if (features.includes("assets-and-client-entries")) {
    files.set("style.css", `.rr-${pluginName} { display: block; }\n`);
    files.set("client.ts", `export function initPlugin(): void {}\n`);
  }
  if (features.includes("components")) {
    files.set(
      "component.tsx",
      `import type { PluginComponent } from "@riebeckite/core";\n\nexport type ${toIdentifier(pluginName)}Props = { readonly label: string };\n\nexport const ${toIdentifier(pluginName)}Component: PluginComponent<${toIdentifier(pluginName)}Props> = ({ label }) => label;\n`,
    );
  }
  if (tests)
    files.set(
      "test/plugin.test.ts",
      `import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { ${toIdentifier(pluginName)}Plugin } from "../index.js";\n\ntest("creates the plugin", () => {\n  assert.equal(${toIdentifier(pluginName)}Plugin().name, "${pluginName}");\n});\n`,
    );
  if (documentation)
    files.set(
      "README.md",
      `# ${pluginName}\n\nGenerated from: ${features.join(", ")}.\n\nRegister \`${toIdentifier(pluginName)}Plugin()\` in \`riebeckite.config.ts\`.\n`,
    );
  return files;
}

function toIdentifier(value: string): string {
  const identifier = value
    .replace(/[^A-Za-z0-9]+(.)/g, (_, letter: string) => letter.toUpperCase())
    .replace(/^[^A-Za-z_$]+/, "Plugin");
  return identifier.length === 0 ? "plugin" : identifier;
}
