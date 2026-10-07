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
      assert.match(
        renderer,
        preset === "empty"
          ? /rel="icon" href="\/favicon\.ico"/
          : /<RiebeckiteHead/,
      );
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
        assert.match(slugRoute, /contentRouteSsgParams/);
        assert.match(slugRoute, /resolveRiebeckiteContentRequest/);
        assert.doesNotMatch(slugRoute, /publicEntries/);
      }
      if (preset === "showcase") {
        assert.match(config, /navigation\(\{/);
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
        assert.ok(config.includes("@riebeckite/plugin-breadcrumbs"));
        assert.ok(config.includes("@riebeckite/plugin-folder-pages"));
      }
      if (preset === "starter") {
        assert.match(config, /navigation\(\{/);
        assert.match(config, /label: "Notes"/);
        assert.ok(config.includes("@riebeckite/plugin-search"));
        assert.ok(config.includes("@riebeckite/plugin-breadcrumbs"));
        assert.ok(!config.includes("@riebeckite/plugin-folder-pages"));
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
      assert.match(header, /rb-site-header/);
      assert.match(header, /rb-nav__mobile/);
      assert.match(header, /rb-site-footer/);
      assert.match(header, /from "@riebeckite\/plugin-navigation"/);
      assert.match(header, /<SiteNav/);
      assert.match(header, /export function SiteHeader/);
      assert.match(header, /export function SiteFooter/);
      assert.doesNotMatch(header, /isActive/);
      assert.doesNotMatch(header, /NavigationItems/);
      assert.doesNotMatch(header, /rb-nav__link--active/);
      assert.doesNotMatch(header, /aria-current/);
      assert.match(
        renderer,
        /<SiteHeader\s+path=\{c\.req\.path\}\s+items=\{navigation\.primary\}\s+language=\{c\.get\("htmlLanguage"\)\}\s*\/>/,
      );
      assert.match(
        renderer,
        /<SiteFooter\s+path=\{c\.req\.path\}\s+items=\{navigation\.secondary\}\s+language=\{c\.get\("htmlLanguage"\)\}\s*\/>/,
      );
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

test("starter and showcase scaffolds compose the standard body slots", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const article = await fs.readFile(
        path.join(targetDirectory, "app/components/article.tsx"),
        "utf8",
      );
      assert.match(article, /bodySlots\?: ContentBodySlots/);
      assert.match(article, /<ArticleBody html=\{post\.html \?\? ""\} \/>/);
      assert.match(article, /<Article class="site-article">/);
      assert.doesNotMatch(article, /\?\.\["article\./);
      assert.doesNotMatch(article, /dangerouslySetInnerHTML/);
      assert.doesNotMatch(article, /class="rb-article-content"/);
      for (const slot of [
        "article.header",
        "article.metadata",
        "article.aside",
        "article.before-content",
        "article.after-content",
        "article.footer",
      ]) {
        assert.match(article, new RegExp(`name="${slot}"`));
      }
      for (const className of [
        'class="site-article__aside"',
        'class="site-article__footer"',
      ]) {
        assert.ok(
          article.includes(className),
          `article must render ${className}`,
        );
      }
      const slotOrder = [
        'name="article.aside"',
        'name="article.header"',
        'name="article.metadata"',
        'name="article.before-content"',
        '<ArticleBody html={post.html ?? ""} />',
        'name="article.after-content"',
        'name="article.footer"',
      ];
      for (let index = 1; index < slotOrder.length; index += 1) {
        assert.ok(
          article.indexOf(slotOrder[index - 1] ?? "") <
            article.indexOf(slotOrder[index] ?? ""),
          "article slot order must remain unchanged",
        );
      }
      for (const route of ["index.tsx", "[slug{.+}].tsx"]) {
        const source = await fs.readFile(
          path.join(targetDirectory, `app/routes/${route}`),
          "utf8",
        );
        assert.match(
          source,
          /bodySlots=\{(?:home\.entry|resolved\.entry)\.bodySlots\}/,
        );
        assert.doesNotMatch(source, /properties|article\./);
      }
    }
  });
});

test("starter and showcase scaffolds gate the footer region on slot or content", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const article = await fs.readFile(
        path.join(targetDirectory, "app/components/article.tsx"),
        "utf8",
      );
      assert.match(
        article,
        /hasSlot\(bodySlots, "article\.footer"\) \|\| footerContent/,
      );
      assert.match(article, /<ArticleFooter class="site-article__footer">/);
      assert.match(
        article,
        /<ContentSlot slots=\{bodySlots\} name="article\.footer" \/>/,
      );
    }
  });
});

test("minimal scaffold exposes a readable layout with the new primitives", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "minimal");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "minimal" });
    const article = await fs.readFile(
      path.join(targetDirectory, "app/components/article.tsx"),
      "utf8",
    );
    assert.match(article, /bodySlots\?: ContentBodySlots/);
    assert.match(article, /<ArticleBody html=\{post\.html \?\? ""\} \/>/);
    assert.match(article, /<Article class="site-article">/);
    assert.match(article, /<ContentSlot/);
    assert.match(article, /class="site-article__aside"/);
    assert.match(article, /class="site-article__footer"/);
    assert.doesNotMatch(article, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(article, /class="rb-article-content"/);
  });
});

test("starter scaffold renders article footer slots for plugin UI", async () => {
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
    assert.match(index, /bodySlots=\{home\.entry\.bodySlots\}/);
    assert.match(index, /<RecentPosts /);
    assert.match(slug, /<TableOfContents/);
    assert.match(slug, /bodySlots={resolved.entry.bodySlots}/);
  });
});

test("showcase scaffold renders article footer slots and daily-notes", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "showcase");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "showcase" });
    const read = (relative: string) =>
      fs.readFile(path.join(targetDirectory, relative), "utf8");
    const index = await read("app/routes/index.tsx");
    const slug = await read("app/routes/[slug{.+}].tsx");
    assert.match(index, /<DailyNotes /);
    assert.match(slug, /bodySlots={resolved.entry.bodySlots}/);
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

test("scaffolded app/style.css ships the shared shell layout and floating menu", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "starter");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "starter" });
    const style = await fs.readFile(
      path.join(targetDirectory, "app/style.css"),
      "utf8",
    );
    assert.match(style, /@import "\.\/\.riebeckite\/framework-styles\.css";/);
    assert.match(style, /@import "\.\/\.riebeckite\/plugin-styles\.css";/);
    assert.match(style, /@import "\.\/\.riebeckite\/theme-styles\.css";/);
    assert.match(
      style,
      /\*,\n\*::before,\n\*::after \{[\s\S]*?box-sizing: border-box/,
    );
    assert.match(style, /\.riebeckite-page \{[\s\S]*?display: flex/);
    assert.match(
      style,
      /\.riebeckite-page \{[\s\S]*?padding-block: var\(--rb-space-8, 4rem\)/,
    );
    assert.match(
      style,
      /\.site-header,\n\.rb-site-footer \{[\s\S]*?width: min\(100% - 2rem, var\(--rb-layout-article-max, 48rem\)\)/,
    );
    assert.match(style, /\.site-header__home \{[\s\S]*?margin-right: auto/);
    assert.match(style, /\.rb-nav__mobile \{[\s\S]*?position: relative/);
    assert.match(
      style,
      /\.rb-nav__mobile > \.rb-nav \{[\s\S]*?position: absolute/,
    );
    assert.match(style, /\.rb-nav__mobile > \.rb-nav \{[\s\S]*?box-shadow/);
    assert.match(
      style,
      /\.site-article \{[\s\S]*?var\(--rb-layout-article-max, 48rem\)/,
    );
    assert.match(
      style,
      /\.rb-article-body,\n\.site-article__footer \{[\s\S]*?min-width: 0/,
    );
    assert.match(
      style,
      /\.site-article__footer \{[\s\S]*?padding-inline: var\(--rb-space-2, 1rem\)/,
    );
    assert.doesNotMatch(style, /\.rb-article-layout \{/);
    assert.doesNotMatch(style, /\.rb-nav__item \{/);
    assert.doesNotMatch(style, /position: absolute;\n {2}top: 100%;/);
  });
});

test("scaffolded app/style.css only lays out presets that render a shell", async () => {
  await withTemporaryDirectory(async (directory) => {
    const minimalDirectory = path.join(directory, "minimal");
    await scaffoldRiebeckiteSite({
      targetDirectory: minimalDirectory,
      preset: "minimal",
    });
    const minimalStyle = await fs.readFile(
      path.join(minimalDirectory, "app/style.css"),
      "utf8",
    );
    assert.match(minimalStyle, /\.riebeckite-page \{/);
    assert.doesNotMatch(minimalStyle, /\.site-header \{/);

    const emptyDirectory = path.join(directory, "empty");
    await scaffoldRiebeckiteSite({
      targetDirectory: emptyDirectory,
      preset: "empty",
    });
    const emptyStyle = await fs.readFile(
      path.join(emptyDirectory, "app/style.css"),
      "utf8",
    );
    assert.doesNotMatch(emptyStyle, /\.riebeckite-page \{/);
    assert.match(emptyStyle, /\.riebeckite-empty \{/);
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
