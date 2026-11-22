import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, resolveConfig } from "@riebeckite/core";
import { codeTabs, remarkCodeMeta, type CodeTabsOptions } from "../index.js";

const PANEL_TAG = /<div class="rr-code-tabs__panel"[^>]*>/g;
const PROPS_ATTRIBUTE = /data-code-tabs-props="([^"]*)"/;
const ENTITY = /&(?:quot|#39|lt|gt|amp);/g;

test("copies non-empty code fence metadata onto the rendered properties", () => {
  const tree: {
    type: string;
    children: Array<{
      type: string;
      meta?: string;
      data?: { hProperties?: Record<string, unknown> };
    }>;
  } = {
    type: "root",
    children: [
      {
        type: "code",
        meta: "title=index.ts",
        data: { hProperties: { className: ["language-ts"] } },
      },
      { type: "code", meta: "  " },
    ],
  };

  remarkCodeMeta()(tree);

  const [withMeta, withoutMeta] = tree.children;
  assert.ok(withMeta);
  assert.ok(withoutMeta);
  assert.deepEqual(withMeta.data, {
    hProperties: {
      className: ["language-ts"],
      "data-meta": "title=index.ts",
    },
  });
  assert.equal(withoutMeta.data, undefined);
});

test("renders grouped code tabs through the HAST transform", async () => {
  const html = await renderTabs();

  assert.match(html, /class="rr-code-tabs"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-code-tabs-label="TypeScript"/);
  assert.match(html, /data-code-tabs-label="JavaScript"/);
  const panels = html.split('role="tabpanel"');
  assert.equal(panels.length - 1, 2);
  assert.match(panels[1] ?? "", /const value = 1;/);
  assert.match(panels[2] ?? "", /const value = 2;/);
});

test("renders the first panel visible without JavaScript", async () => {
  const html = await renderTabs();
  const panels = [...html.matchAll(PANEL_TAG)].map((match) => match[0]);

  assert.equal(panels.length, 2);
  assert.match(panels[0] ?? "", /data-active="true"/);
  assert.doesNotMatch(panels[0] ?? "", /hidden/);
  assert.match(panels[1] ?? "", /data-active="false"/);
  assert.match(panels[1] ?? "", /hidden=""/);
});

test("serializes the hydration props onto the grouped markup", async () => {
  const serialized = (await renderTabs()).match(PROPS_ATTRIBUTE)?.[1];
  assert.ok(serialized);
  const decoded = decodeAttribute(serialized);

  const props = JSON.parse(decoded) as {
    groupId: string;
    sync: boolean;
    labels: string[];
  };

  assert.equal(props.groupId, "rr-code-tabs-1");
  assert.equal(props.sync, false);
  assert.deepEqual(props.labels, ["TypeScript", "JavaScript"]);
  assert.doesNotMatch(decoded, /const value/);
});

test("marks synchronized groups in the markup and props", async () => {
  const html = await renderTabs({ syncTabs: true });

  assert.match(html, /data-code-tabs-sync="true"/);
  const serialized = html.match(PROPS_ATTRIBUTE)?.[1];
  assert.ok(serialized);
  const props = JSON.parse(decodeAttribute(serialized)) as { sync: boolean };
  assert.equal(props.sync, true);
});

async function renderTabs(options: CodeTabsOptions = {}): Promise<string> {
  const manager = new ContentManager(
    {
      async scan() {
        return [{ path: "posts/demo.md" }];
      },
      async read() {
        return `---
publish: true
title: Demo
---

\`\`\`ts tab=TypeScript
const value = 1;
\`\`\`

\`\`\`js tab=JavaScript
const value = 2;
\`\`\`
`;
      },
    },
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [codeTabs(options)],
      }),
    },
  );

  return (await manager.getManifest()).bySlug.get("posts/demo")?.html ?? "";
}

function decodeAttribute(value: string): string {
  const entities: Record<string, string> = {
    "&quot;": '"',
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
  };
  return value.replace(ENTITY, (match) => entities[match] ?? match);
}
