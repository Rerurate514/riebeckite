export function renderPageTypeModule(name: string, path: string): string {
  const identifier = toIdentifier(name);
  return `import { escapeHtml, escapeHtmlAttribute, type PluginPageType } from "@riebeckite/core";

export const ${identifier}PageType: PluginPageType = {
  id: "${name}-index",
  paths: ["${path}"],
  outputDependencies: [{ type: "global" }],
  resolve: ({ manifest, pathname }) => {
    if (pathname !== "${path}") return null;
    const items = manifest.discoverableEntries
      .map((entry) => \`<li><a href="\${escapeHtmlAttribute(entry.permalink)}">\${escapeHtml(entry.title)}</a></li>\`)
      .join("");
    return {
      type: "${name}-index",
      pathname,
      title: "${toTitle(name)}",
      body: \`<section class="rr-${name}"><h1>${toTitle(name)}</h1><ul class="rr-${name}__list">\${items}</ul></section>\`,
    };
  },
};
`;
}

export function renderPageTypeTest(name: string, path: string): string {
  const identifier = toIdentifier(name);
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import { ${identifier}PageType } from "../page_types/${name}.js";

test("resolves the ${name} page from discoverable entries", () => {
  const page = ${identifier}PageType.resolve({
    pathname: "${path}",
    manifest: { discoverableEntries: [{ title: "Public note", permalink: "/notes/public/" }] },
  } as never);
  assert.ok(page);
  assert.match(page.body, /Public note/);
});
`;
}

function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return `${identifier.slice(0, 1).toUpperCase()}${identifier.slice(1)}`;
}

function toTitle(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
