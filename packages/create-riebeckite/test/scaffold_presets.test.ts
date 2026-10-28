import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import {
  composeScaffoldPreset,
  parseScaffoldFeatures,
  SCAFFOLD_FEATURE_NAMES,
} from "../src/scaffold/features.js";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import {
  isScaffoldPresetName,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_PRESET_NAMES,
  scaffoldPresets,
  validateScaffoldPreset,
} from "../src/scaffold/presets.js";
import { RIEBECKITE_VERSION } from "../src/scaffold/version.js";

test("the public scaffold presets have the documented order and default", () => {
  assert.deepEqual(SCAFFOLD_PRESET_NAMES, [
    "starter",
    "digital-garden",
    "blog",
    "docs",
    "portfolio",
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

test("feature packs add explicit config without duplicating preset plugins", () => {
  const features = parseScaffoldFeatures("diagrams,i18n");
  const preset = composeScaffoldPreset(scaffoldPresets.portfolio, features);
  assert.deepEqual(preset.languages, ["en", "ja"]);
  assert.ok(preset.plugins.some((plugin) => plugin.factory === "mermaidPele"));
  const withMedia = composeScaffoldPreset(scaffoldPresets.portfolio, ["media"]);
  assert.equal(
    withMedia.plugins.filter((plugin) => plugin.factory === "media").length,
    1,
  );
  assert.throws(() => parseScaffoldFeatures("diagrams,diagrams"), /repeated/);
});

test("every preset supports every feature pack", () => {
  for (const preset of Object.values(scaffoldPresets)) {
    const composed = composeScaffoldPreset(preset, SCAFFOLD_FEATURE_NAMES);
    assert.deepEqual(
      composed.plugins.map((plugin) => `${plugin.package}:${plugin.factory}`),
      [
        ...new Set(
          composed.plugins.map(
            (plugin) => `${plugin.package}:${plugin.factory}`,
          ),
        ),
      ],
    );
    assert.ok(composed.languages.includes("en"));
    assert.ok(composed.languages.includes("ja"));
  }
});

test("feature packs are written to generated configuration", async () => {
  await withTemporaryDirectory(async (directory) => {
    await scaffoldRiebeckiteSite({
      targetDirectory: directory,
      preset: "portfolio",
      features: ["diagrams", "i18n"],
    });
    const config = await fs.readFile(
      path.join(directory, "riebeckite.config.ts"),
      "utf8",
    );
    assert.match(config, /@riebeckite\/plugin-mermaid-pele/);
    assert.match(config, /defaultLang: "en"/);
  });
});

test("purpose presets select their purpose-built theme", async () => {
  const expectedThemes = {
    "digital-garden": ["@riebeckite/theme-garden", "gardenTheme"],
    blog: ["@riebeckite/theme-editorial", "editorialTheme"],
    docs: ["@riebeckite/theme-technical", "technicalTheme"],
    portfolio: ["@riebeckite/theme-folio", "folioTheme"],
  } as const;
  await withTemporaryDirectory(async (directory) => {
    for (const [preset, [packageName, factory]] of Object.entries(
      expectedThemes,
    )) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({
        targetDirectory,
        preset: preset as keyof typeof expectedThemes,
      });
      const config = await fs.readFile(
        path.join(targetDirectory, "riebeckite.config.ts"),
        "utf8",
      );
      const packageJson = JSON.parse(
        await fs.readFile(path.join(targetDirectory, "package.json"), "utf8"),
      ) as { dependencies?: Record<string, string> };
      assert.match(
        config,
        new RegExp(`import \\{ ${factory} \\} from "${packageName}"`),
      );
      assert.match(config, new RegExp(`theme: ${factory}\\(\\)`));
      assert.equal(packageJson.dependencies?.[packageName], RIEBECKITE_VERSION);
    }
  });
});

test("portfolio registers every plugin used by its article layout", async () => {
  await withTemporaryDirectory(async (directory) => {
    await scaffoldRiebeckiteSite({
      targetDirectory: directory,
      preset: "portfolio",
    });
    const config = await fs.readFile(
      path.join(directory, "riebeckite.config.ts"),
      "utf8",
    );
    for (const plugin of ["backlinks", "relatedPosts", "recentPosts"]) {
      assert.match(config, new RegExp(`\\b${plugin}\\(`));
    }
  });
});

test("preset declarations reject conflicting generated imports", () => {
  assert.throws(
    () =>
      validateScaffoldPreset({
        ...scaffoldPresets.minimal,
        plugins: [
          { package: "@example/one", factory: "plugin" },
          { package: "@example/two", factory: "plugin" },
        ],
      }),
    /imports "plugin" from both/,
  );
  assert.throws(
    () =>
      validateScaffoldPreset({
        ...scaffoldPresets.minimal,
        plugins: [
          { package: "@example/plugin", factory: "plugin" },
          { package: "@example/plugin", factory: "plugin" },
        ],
      }),
    /more than once/,
  );
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
      const packageJson = JSON.parse(
        await fs.readFile(path.join(targetDirectory, "package.json"), "utf8"),
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      await assertPluginImportsAreDependencies(
        path.join(targetDirectory, "app"),
        packageJson,
      );
      assert.equal(
        packageJson.devDependencies?.["@hono/node-server"],
        "^1.19.17",
      );
      assert.ok(await exists(path.join(targetDirectory, "README.md")));
      assert.ok(await exists(path.join(targetDirectory, "public/favicon.ico")));
      assert.ok(
        await exists(path.join(targetDirectory, "public/riebeckite-logo.png")),
      );
      const honoTypes = await fs.readFile(
        path.join(targetDirectory, "app/hono.d.ts"),
        "utf8",
      );
      assert.match(honoTypes, /import "hono"/);
      assert.match(honoTypes, /declare module "hono"/);
      const renderer = await fs.readFile(
        path.join(targetDirectory, "app/routes/_renderer.tsx"),
        "utf8",
      );
      assert.match(renderer, /<RiebeckiteHead/);
      assert.match(renderer, /export const __importing_islands = true/);
      if (preset === "empty") {
        assert.ok(!config.includes("@riebeckite/plugin-"));
        const contentDirectory = await fs.stat(
          path.join(targetDirectory, "content"),
        );
        assert.ok(
          contentDirectory.isDirectory(),
          "the empty preset must still create the configured content directory",
        );
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
        assert.match(slugRoute, /createContentRoute/);
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
        assert.ok(config.includes("@riebeckite/plugin-mermaid-pele"));
        assert.ok(config.includes("@riebeckite/plugin-breadcrumbs"));
        assert.ok(config.includes("@riebeckite/plugin-folder-pages"));
        assert.ok(config.includes("@riebeckite/plugin-daily-notes"));
        assert.ok(config.includes("@riebeckite/plugin-gallery"));
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/Daily/2026-10-02.md"),
          ),
        );
        assert.ok(
          !(await exists(
            path.join(targetDirectory, "content/notes/planning.md"),
          )),
        );
      }
      if (preset === "minimal") {
        assert.ok(config.includes("@riebeckite/plugin-obsidian-markdown"));
        assert.ok(!config.includes("@riebeckite/plugin-search"));
        assert.ok(!config.includes("@riebeckite/plugin-l10n"));
        assert.ok(await exists(path.join(targetDirectory, "content/index.md")));
        assert.ok(
          !(await exists(path.join(targetDirectory, "content/guide.md"))),
        );
      }
      if (preset === "starter") {
        assert.match(config, /navigation\(\)/);
        assert.doesNotMatch(config, /label: "Notes"/);
        assert.ok(config.includes("@riebeckite/plugin-search"));
        assert.ok(config.includes("@riebeckite/plugin-breadcrumbs"));
        assert.ok(config.includes("@riebeckite/plugin-folder-pages"));
        assert.ok(config.includes("@riebeckite/plugin-hover-preview"));
        assert.ok(!config.includes("@riebeckite/plugin-l10n"));
        assert.ok(!config.includes("@riebeckite/plugin-series"));
        assert.ok(!config.includes("@riebeckite/plugin-daily-notes"));
        assert.ok(
          !(await exists(path.join(targetDirectory, "content/reference"))),
        );
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
      if (preset === "digital-garden") {
        assert.ok(config.includes("@riebeckite/plugin-local-graph"));
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/notes/seed-idea.md"),
          ),
        );
        const index = await fs.readFile(
          path.join(targetDirectory, "content/index.md"),
          "utf8",
        );
        assert.match(index, /!\[\[notes\/how-this-garden-works\]\]/);
      }
      if (preset === "blog") {
        assert.ok(config.includes("@riebeckite/plugin-series"));
        assert.ok(config.includes("@riebeckite/plugin-share"));
        assert.match(config, /feeds: \{ rss: true, atom: true, json: true \}/);
        assert.ok(
          await exists(
            path.join(
              targetDirectory,
              "content/posts/writing-a-useful-post.md",
            ),
          ),
        );
      }
      if (preset === "docs") {
        assert.match(
          config,
          /docs\(\{ root: "docs", sidebar: \{ auto: true \}, prevNext: true \}\)/,
        );
        const article = await fs.readFile(
          path.join(targetDirectory, "app/components/article.tsx"),
          "utf8",
        );
        assert.match(article, /<DocsSidebar \/>/);
        assert.match(article, /<DocsPrevNext \/>/);
        assert.match(article, /<SiteShell variant="docs">/);
        assert.match(article, /<ShellDrawer label="Documentation"/);
        const packageJson = await fs.readFile(
          path.join(targetDirectory, "package.json"),
          "utf8",
        );
        assert.match(packageJson, /"@riebeckite\/shell-ui"/);
        assert.ok(await exists(path.join(targetDirectory, "app/client.ts")));
        assert.ok(
          await exists(
            path.join(targetDirectory, "content/docs/getting-started.md"),
          ),
        );
      }
    }
  });
});

test("each preset ships a site-owned 404 surface", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const notFound = await fs.readFile(
        path.join(targetDirectory, "app/routes/_404.tsx"),
        "utf8",
      );
      assert.match(notFound, /import type \{ Context \} from "hono"/);
      assert.match(notFound, /const handler = \(c: Context\) => \{/);
      assert.match(notFound, /c\.status\(404\)/);
      assert.match(notFound, /c\.render\(/);
      assert.match(notFound, /export default handler/);
      assert.doesNotMatch(notFound, /c\.set\(/);
      assert.doesNotMatch(notFound, /@riebeckite\/plugin-/);
      assert.doesNotMatch(notFound, /dangerouslySetInnerHTML/);
      assert.doesNotMatch(notFound, /<PageBody/);
      assert.doesNotMatch(notFound, /virtual:riebeckite\/(?:config|content)/);
      const style = await fs.readFile(
        path.join(targetDirectory, "app/style.css"),
        "utf8",
      );
      assert.match(style, /\.not-found \{/);
      assert.match(style, /\.not-found__status \{/);
      assert.equal(
        await exists(path.join(targetDirectory, "app/routes/_error.tsx")),
        false,
        `${preset} must not generate a runtime error page`,
      );
    }
  });
});

test("starter and showcase scaffolds render navigation in the site shell", async () => {
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
      assert.match(header, /site-header__mobile-navigation/);
      assert.match(header, /rb-site-footer/);
      assert.match(header, /from "@riebeckite\/plugin-navigation"/);
      assert.match(header, /<SiteNav/);
      assert.match(header, /<MobileSiteNav/);
      assert.match(header, /export function SiteHeader/);
      assert.match(header, /export function SiteFooter/);
      assert.doesNotMatch(header, /resolveSiteNavigation/);
      assert.doesNotMatch(header, /site\.manifest/);
      assert.doesNotMatch(header, /isActive/);
      assert.doesNotMatch(header, /NavigationItems/);
      assert.doesNotMatch(header, /rb-nav__link--active/);
      assert.doesNotMatch(header, /aria-current/);
      assert.match(renderer, /<SiteProvider/);
      assert.match(renderer, /view=\{createPublicContentView\(manifest\)\}/);
      assert.match(renderer, /path=\{c\.req\.path\}/);
      assert.match(renderer, /language=\{c\.get\("htmlLanguage"\)\}/);
      assert.match(renderer, /headTags=\{c\.get\("headTags"\)\}/);
      assert.match(renderer, /<SiteHeader\s*\/>/);
      assert.match(renderer, /<SiteFooter\s*\/>/);
      assert.doesNotMatch(renderer, /resolveSiteNavigation/);
      assert.match(header, /placement="primary"/);
      assert.match(header, /placement="secondary"/);
      assert.match(renderer, /class="riebeckite-page rb-site"/);
      assert.match(
        await fs.readFile(
          path.join(targetDirectory, "riebeckite.config.ts"),
          "utf8",
        ),
        preset === "starter"
          ? /navigation\(\)/
          : /label: "Framework", href: "\/framework\/plugins"/,
      );
    }
  });
});

test("starter and showcase scaffolds expose a single main landmark and skip link", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const renderer = await fs.readFile(
        path.join(targetDirectory, "app/routes/_renderer.tsx"),
        "utf8",
      );
      assert.match(
        renderer,
        /<a class="rb-skip-link" href="#main-content">Skip to main content<\/a>/,
      );
      assert.ok(
        renderer.indexOf('class="rb-skip-link"') <
          renderer.indexOf("<SiteHeader"),
        "the skip link must precede the repeated site header",
      );
      assert.equal(
        (renderer.match(/<main\b/g) ?? []).length,
        1,
        "the renderer must own exactly one main landmark",
      );
      assert.match(
        renderer,
        /<main id="main-content" tabindex=\{-1\} class="riebeckite-main">/,
      );
      assert.ok(
        renderer.indexOf("<main ") < renderer.indexOf("<SiteFooter"),
        "the main landmark must close before the footer",
      );

      const notFound = await fs.readFile(
        path.join(targetDirectory, "app/routes/_404.tsx"),
        "utf8",
      );
      assert.doesNotMatch(notFound, /<main\b/);
      assert.match(notFound, /<div class="not-found">/);

      const style = await fs.readFile(
        path.join(targetDirectory, "app/style.css"),
        "utf8",
      );
      assert.match(style, /\.riebeckite-main \{/);
      assert.match(style, /\.riebeckite-main:has\(> \.not-found\) \{/);
    }
  });
});

test("content scaffolds delegate route composition to the HonoX helpers", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["minimal", "starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const article = await fs.readFile(
        path.join(targetDirectory, "app/components/article.tsx"),
        "utf8",
      );
      assert.match(article, /<Article class="site-article">/);
      assert.doesNotMatch(
        article,
        /PostContent|PublicContentEntry|post=|entry=/,
      );
      assert.match(article, /<ArticleBody \/>/);
      assert.doesNotMatch(article, /article\./);
      assert.doesNotMatch(article, /dangerouslySetInnerHTML/);
      assert.doesNotMatch(article, /class="rb-article-content"/);
      if (preset !== "minimal") {
        assert.match(article, /<div class="site-article__layout">/);
        assert.match(article, /class="site-article__aside"/);
        assert.match(article, /class="site-article__footer"/);
        assert.match(article, /<Breadcrumbs \/>/);
        assert.match(article, /<Properties \/>/);
        assert.match(article, /<Backlinks \/>/);
        assert.match(article, /<RelatedPosts \/>/);
      }
      for (const route of ["index.tsx", "[slug{.+}].tsx"]) {
        const source = await fs.readFile(
          path.join(targetDirectory, `app/routes/${route}`),
          "utf8",
        );
        assert.match(
          source,
          route === "index.tsx" ? /createHomeRoute/ : /createContentRoute/,
        );
        assert.match(source, /render: \(\) => <SiteArticle \/>/);
        assert.doesNotMatch(source, /createPublicContentView/);
        assert.doesNotMatch(source, /<SiteProvider /);
        assert.doesNotMatch(source, /findRoutableBySlug/);
        assert.doesNotMatch(source, /post=|entry=/);
        assert.doesNotMatch(
          source,
          /<Breadcrumbs |<Properties |<Backlinks |<RelatedPosts /,
        );
        assert.doesNotMatch(source, /asideContent/);
      }
    }
  });
});

test("starter and showcase scaffolds render a contextual footer region", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const article = await fs.readFile(
        path.join(targetDirectory, "app/components/article.tsx"),
        "utf8",
      );
      assert.match(article, /<ArticleFooter class="site-article__footer">/);
      assert.match(article, /<Backlinks \/>/);
      assert.match(article, /<RelatedPosts \/>/);
      assert.doesNotMatch(article, /props\.footer \?/);
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
    assert.match(article, /<Article class="site-article">/);
    assert.match(article, /<ArticleBody \/>/);
    assert.doesNotMatch(article, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(article, /class="rb-article-content"/);
  });
});

test("starter scaffold renders contextual article components and Recent Posts once", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "starter");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "starter" });
    const read = (relative: string) =>
      fs.readFile(path.join(targetDirectory, relative), "utf8");
    const renderer = await read("app/routes/_renderer.tsx");
    const article = await read("app/components/article.tsx");
    const index = await read("app/routes/index.tsx");
    const slug = await read("app/routes/[slug{.+}].tsx");
    assert.match(renderer, /<SearchBar \/>/);
    assert.match(article, /<TableOfContents/);
    assert.match(article, /<Breadcrumbs \/>/);
    assert.match(article, /<Properties \/>/);
    assert.match(article, /<Backlinks \/>/);
    assert.match(article, /<RecentPosts \/>/);
    assert.equal((article.match(/<RecentPosts \/>/g) ?? []).length, 1);
    assert.match(index, /createHomeRoute/);
    assert.match(slug, /createContentRoute/);
    assert.doesNotMatch(index, /<RecentPosts /);
    assert.doesNotMatch(slug, /<RecentPosts /);
  });
});

test("showcase scaffold renders contextual article components, daily notes, and Recent Posts once", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "showcase");
    await scaffoldRiebeckiteSite({ targetDirectory, preset: "showcase" });
    const read = (relative: string) =>
      fs.readFile(path.join(targetDirectory, relative), "utf8");
    const article = await read("app/components/article.tsx");
    const index = await read("app/routes/index.tsx");
    const slug = await read("app/routes/[slug{.+}].tsx");
    assert.match(article, /<DailyNotes \/>/);
    assert.match(article, /<RecentPosts \/>/);
    assert.equal((article.match(/<RecentPosts \/>/g) ?? []).length, 1);
    assert.match(article, /<ShareControls \/>/);
    assert.match(index, /createHomeRoute/);
    assert.match(slug, /createContentRoute/);
    assert.doesNotMatch(slug, /<RecentPosts /);
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

test("scaffolded app/style.css keeps plugin internals out of site CSS", async () => {
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
    assert.match(style, /\.riebeckite-page \{[\s\S]*?display: flex/);
    assert.match(
      style,
      /\.riebeckite-page \{[\s\S]*?padding-block: var\(--rb-space-8, 4rem\)/,
    );
    assert.match(
      style,
      /\.site-header,\n\.site-footer \{[\s\S]*?width: min\(100% - 2rem, var\(--rb-layout-page-max, 80rem\)\)/,
    );
    assert.match(style, /\.site-header__home \{[\s\S]*?margin-right: auto/);
    assert.match(
      style,
      /\.site-header__mobile-navigation \{[\s\S]*?display: none/,
    );
    assert.match(
      style,
      /\.site-article \{[\s\S]*?var\(--rb-layout-article-max, 48rem\)/,
    );
    assert.match(style, /\.rb-article-body \{[\s\S]*?min-width: 0/);
    assert.match(
      style,
      /\.rb-article-body \{[\s\S]*?padding-inline: var\(--rb-space-2, 1rem\)/,
    );
    assert.match(style, /\.site-article__footer \{[\s\S]*?min-width: 0/);
    assert.doesNotMatch(style, /\.site-article__footer \{[^}]*padding/);
    assert.doesNotMatch(style, /\.rb-article-layout \{/);
    assertSitePluginOwnership(style);
    assert.match(
      style,
      /\.riebeckite-page \{[\s\S]*?--site-toc-sticky-top:\s*var\(--rb-space-3, 1\.5rem\)/,
    );
    assert.match(
      style,
      /\.site-article__aside > \.rr-table-of-contents--desktop \{/,
    );
    assert.match(
      style,
      /@media \(min-width: 80rem\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(0, var\(--rb-layout-article-max, 48rem\)\) minmax\(0, 1fr\)/,
    );
    assert.match(
      style,
      /\.site-article__layout > \.rb-article-body \{[\s\S]*?grid-column: 2/,
    );
  });
});

test("starter and showcase own desktop TOC sticky behavior", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of ["starter", "showcase"] as const) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      const style = await fs.readFile(
        path.join(targetDirectory, "app/style.css"),
        "utf8",
      );
      assert.match(
        style,
        /\.riebeckite-page \{[\s\S]*?--site-toc-sticky-top:\s*var\(--rb-space-3, 1\.5rem\)/,
      );
      assert.match(style, /position: sticky/);
      assert.match(style, /overflow-y: auto/);
      assert.match(
        style,
        /@media \(min-width: 80rem\) \{[\s\S]*?\.site-article__aside \{[\s\S]*?align-self: stretch/,
      );
    }
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

async function assertPluginImportsAreDependencies(
  directory: string,
  packageJson: { readonly dependencies?: Record<string, string> },
): Promise<void> {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertPluginImportsAreDependencies(entryPath, packageJson);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
    const source = await fs.readFile(entryPath, "utf8");
    for (const match of source.matchAll(
      /from "(@riebeckite\/plugin-[^"]+)"/g,
    )) {
      assert.ok(
        packageJson.dependencies?.[match[1]],
        `${entryPath} imports ${match[1]} but package.json does not depend on it`,
      );
    }
  }
}

function assertSitePluginOwnership(style: string): void {
  assertPluginRootPlacementAllowed(`
    .site-article__aside > .rr-table-of-contents--desktop {
      position: sticky;
      top: var(--site-toc-sticky-top);
      max-height: 20rem;
      overflow-y: auto;
      overscroll-behavior: contain;
      border-inline-start: 1px solid currentColor;
      padding-inline-start: 1rem;
    }
  `);
  assert.throws(() =>
    assertPluginRootPlacementAllowed(`
        .site-header .rb-nav__link {
          color: red;
        }
      `),
  );
  assertPluginRootPlacementAllowed(style);
}

function assertPluginRootPlacementAllowed(style: string): void {
  for (const rule of style.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim();
    if (!/\.(?:rb-nav|rr-table-of-contents)/.test(selector)) continue;
    assert.doesNotMatch(
      selector,
      /\.(?:rb-nav|rr-table-of-contents)__/,
      `Site CSS must not select plugin internals: ${selector}`,
    );
    assert.match(
      selector,
      /\.site-article__aside\s*>\s*\.rr-table-of-contents(?:--[\w-]+)?$/,
      `Site CSS may only place the ToC root: ${selector}`,
    );
    for (const property of rule[2].matchAll(/([\w-]+)\s*:/g)) {
      assert.match(
        property[1],
        /^(position|top|max-height|overflow-y|overscroll-behavior|border-inline-start|padding-inline-start)$/,
        `Site CSS must use only placement properties for the ToC root: ${property[1]}`,
      );
    }
  }
}
