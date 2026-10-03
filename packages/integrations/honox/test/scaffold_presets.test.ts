import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  isScaffoldPresetName,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_PRESET_NAMES,
  scaffoldPresets,
} from "../src/scaffold/presets.js";

test("the public scaffold presets have the documented order and default", () => {
  assert.deepEqual(SCAFFOLD_PRESET_NAMES, [
    "starter",
    "minimal",
    "showcase",
    "empty",
  ]);
  assert.equal(SCAFFOLD_DEFAULT_PRESET, "starter");
  assert.deepEqual(Object.keys(scaffoldPresets), SCAFFOLD_PRESET_NAMES);
  for (const removedName of ["rich", "full", "max", "ultra"]) {
    assert.equal(isScaffoldPresetName(removedName), false);
  }
});

test("each preset generates its intended self-contained composition", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const config = await fs.readFile(
        path.join(targetDirectory, "riebeckite.config.ts"),
        "utf8",
      );
      assert.ok(await exists(path.join(targetDirectory, "README.md")));
      assert.ok(await exists(path.join(targetDirectory, "public/favicon.ico")));
      assert.ok(
        await exists(path.join(targetDirectory, "public/riebeckite-logo.png")),
      );
      const renderer = await fs.readFile(
        path.join(targetDirectory, "app/routes/_renderer.tsx"),
        "utf8",
      );
      assert.match(renderer, /rel="icon" href="\/favicon\.ico"/);
      assert.match(renderer, /export const __importing_islands = true/);
      if (preset === "empty") {
        assert.ok(!config.includes("@riebeckite/plugin-"));
      } else {
        assert.ok(config.includes("@riebeckite/plugin-obsidian-markdown"));
        const headerPath = path.join(
          targetDirectory,
          "app/components/site-header.tsx",
        );
        if (await exists(headerPath)) {
          const header = await fs.readFile(headerPath, "utf8");
          assert.match(header, /\/riebeckite-logo\.png/);
        }
        const slugRoute = await fs.readFile(
          path.join(targetDirectory, "app/routes/[slug{.+}].tsx"),
          "utf8",
        );
        assert.match(slugRoute, /resolveRiebeckiteRoute/);
        assert.match(slugRoute, /pluginPageSsgParams/);
      }
      if (preset === "showcase") {
        assert.match(config, /navigation: \{/);
        assert.match(config, /label: "Framework"/);
        assert.ok(
          await exists(path.join(targetDirectory, "content/examples.md")),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/drawings/site.canvas"),
          ),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/reference/plugins.md"),
          ),
        );
        assert.ok(
          await exists(path.join(targetDirectory, "content/images/demo.svg")),
        );
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/attachments/project-brief.pdf"),
          ),
        );
        assert.ok(config.includes("@riebeckite/plugin-mermaid"));
      }
      if (preset === "starter") {
        assert.match(config, /navigation: \{/);
        assert.match(config, /label: "Notes"/);
        assert.ok(config.includes("@riebeckite/plugin-search"));
        assert.ok(
          await exists(path.join(targetDirectory, "content/notes/planning.md")),
        );
        assert.ok(!config.includes("@riebeckite/plugin-mermaid"));
        for (const page of ["index.md", "guide.md", "examples.md"]) {
          assert.ok(
            await exists(path.join(targetDirectory, `content/${page}`)),
          );
        }
        const index = await fs.readFile(
          path.join(targetDirectory, "content/index.md"),
          "utf8",
        );
        assert.match(index, /content\/index\.md/);
        const guide = await fs.readFile(
          path.join(targetDirectory, "content/guide.md"),
          "utf8",
        );
        assert.match(guide, /npm exec riebeckite dev/);
        assert.match(guide, /content\/hello\.md/);
      }
    }
  });
});

test("starter and showcase scaffolds render authored navigation in the site shell", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const header = await fs.readFile(
        path.join(targetDirectory, "app/components/site-header.tsx"),
        "utf8",
      );
      const renderer = await fs.readFile(
        path.join(targetDirectory, "app/routes/_renderer.tsx"),
        "utf8",
      );
      assert.match(header, /site-navigation__mobile/);
      assert.match(header, /rb-site-header/);
      assert.match(header, /rb-nav__link--active/);
      assert.match(header, /rb-site-footer/);
      assert.match(header, /aria-current/);
      assert.match(header, /target=\{item.external/);
      assert.match(header, /isChildList/);
      assert.match(renderer, /<SiteHeader path=\{c.req.path\} \/>/);
      assert.match(renderer, /<SiteFooter path=\{c.req.path\} \/>/);
      assert.match(renderer, /class="riebeckite-page rb-site"/);
      assert.match(
        await fs.readFile(
          path.join(targetDirectory, "riebeckite.config.ts"),
          "utf8",
        ),
        preset === "starter"
          ? /label: "Notes", href: "\/notes\/planning"/
          : /label: "Framework", href: "\/framework\/plugins"/,
      );
    }
  });
});

test("starter and showcase scaffolds render the standard body slots", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const article = await fs.readFile(
        path.join(targetDirectory, "app/components/article.tsx"),
        "utf8",
      );
      for (const prop of [
        "propertiesHtml?: string",
        "afterHeaderHtml?: string",
        "afterMetaHtml?: string",
        "beforeContentHtml?: string",
        "afterContentHtml?: string",
        "asideHtml?: string",
        "footerHtml?: string",
      ]) {
        assert.ok(article.includes(prop), `article must accept ${prop}`);
      }
      for (const className of [
        'class="article-properties"',
        'class="site-article__after-header"',
        'class="site-article__after-meta"',
        'class="site-article__before-content"',
        'class="site-article__after-content"',
        'class="site-article__aside"',
        'class="site-article__footer"',
      ]) {
        assert.ok(
          article.includes(className),
          `article must render ${className}`,
        );
      }
      for (const route of ["index.tsx", "[slug{.+}].tsx"]) {
        const source = await fs.readFile(
          path.join(targetDirectory, `app/routes/${route}`),
          "utf8",
        );
        for (const slot of [
          "properties",
          "article.after-header",
          "article.after-meta",
          "article.before-content",
          "article.after-content",
          "article.aside",
          "article.footer",
        ]) {
          assert.ok(
            source.includes(slot),
            `${preset} ${route} must pass the ${slot} slot`,
          );
        }
      }
    }
  });
});

test("starter scaffold renders the plugin UI enabled by its preset", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "starter");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "starter" });
    const read = (relative: string) =>
      fs.readFile(path.join(targetDirectory, relative), "utf8");
    const renderer = await read("app/routes/_renderer.tsx");
    const index = await read("app/routes/index.tsx");
    const slug = await read("app/routes/[slug{.+}].tsx");
    assert.match(renderer, /<SearchBar \/>/);
    assert.match(index, /<TableOfContents/);
    assert.match(index, /<Backlinks /);
    assert.match(index, /<RecentPosts /);
    assert.match(slug, /<TableOfContents/);
    assert.match(slug, /<Backlinks /);
  });
});

test("showcase scaffold renders local-graph and daily-notes", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "showcase");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "showcase" });
    const read = (relative: string) =>
      fs.readFile(path.join(targetDirectory, relative), "utf8");
    const index = await read("app/routes/index.tsx");
    const slug = await read("app/routes/[slug{.+}].tsx");
    assert.match(index, /<DailyNotes /);
    assert.match(slug, /<LocalGraph /);
  });
});

test("generated scaffold code contains no un-interpolated template variables", async () => {
  await withTemporaryDirectory(async (directory) => {
    const leaked = [
      "importLines",
      "dataLines",
      "propLines",
      "afterChildren",
      "footerChildren",
      "titleHelper",
      "dataBlock",
      "hasScaffoldPlugin",
      "articleTitleHelper",
      "needsConfig",
      "needsTitle",
      "needsManifest",
    ];
    for (const preset of ["starter", "showcase", "minimal"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      for (const relative of [
        "app/components/article.tsx",
        "app/routes/index.tsx",
        "app/routes/[slug{.+}].tsx",
        "app/routes/_renderer.tsx",
      ]) {
        const source = await fs.readFile(
          path.join(targetDirectory, relative),
          "utf8",
        );
        for (const identifier of leaked) {
          assert.ok(
            !source.includes(identifier),
            `${preset} ${relative} must not leak template variable ${identifier}`,
          );
        }
      }
    }
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-"));
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
