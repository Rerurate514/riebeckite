import { contentPageFiles } from "./content-pages.js";
import {
  defaultLanguageForLocale,
  SCAFFOLD_LANGUAGES,
  type ScaffoldLanguage,
  type ScaffoldPreset,
} from "./presets.js";
import { readme } from "./readme.js";
import { pluginExpression } from "./template_options.js";
import type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";
import { copyTemplateTree, readTemplate } from "./template-loader.js";
import {
  SCAFFOLD_DEFAULT_UTILITIES,
  utilityTemplateFiles,
} from "./utilities.js";
import { RIEBECKITE_VERSION } from "./version.js";
import { WRANGLER_VERSION } from "./wrangler-defaults.js";

export type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";
export function siteTemplateFiles(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions = {},
): readonly SiteTemplateFile[] {
  const sharedLayout = readTemplate("shared/reader-layout.css")
    .toString()
    .trimEnd();
  const presetFiles = copyTemplateTree(
    `presets/${preset.name}`,
    { "{{reader-layout}}": sharedLayout },
    (filePath) => !filePath.startsWith("content/"),
  );
  const files: readonly SiteTemplateFile[] = [
    { path: "package.json", content: packageJson(preset, variables, options) },
    { path: "pnpm-workspace.yaml", content: pnpmWorkspace() },
    {
      path: "riebeckite.config.ts",
      content: riebeckiteConfig(preset, variables, options),
    },
    ...copyTemplateTree("base"),
    ...utilityTemplateFiles(options.utilities ?? SCAFFOLD_DEFAULT_UTILITIES),
    ...presetFiles,
    ...notFoundPageFiles(presetFiles),
    ...(options.contentDirectory === undefined &&
    variables.externalContent !== true
      ? [
          ...presetContentFiles(preset, variables),
          ...contentPageFiles(variables, preset),
        ]
      : []),
    { path: "README.md", content: readme(preset, variables) },
  ];
  return variables.externalContent === true
    ? ignoreContentDirectory(files)
    : files;
}

function notFoundPageFiles(
  files: readonly SiteTemplateFile[],
): readonly SiteTemplateFile[] {
  if (!files.some((file) => file.path === "app/routes/_404.tsx")) return [];
  return [
    {
      path: "app/routes/404.tsx",
      content: 'export { default } from "./_404";\n',
    },
  ];
}

function ignoreContentDirectory(
  files: readonly SiteTemplateFile[],
): readonly SiteTemplateFile[] {
  const hasGitignore = files.some((file) => file.path === ".gitignore");
  const updated = files.map((file) => {
    if (file.path !== ".gitignore") return file;
    const content =
      typeof file.content === "string"
        ? file.content
        : new TextDecoder().decode(file.content);
    const separator = content.endsWith("\n") ? "" : "\n";
    return {
      path: file.path,
      content: `${content}${separator}content/\n`,
    };
  });
  return hasGitignore
    ? updated
    : [{ path: ".gitignore", content: "content/\n" }, ...updated];
}

const CONTENT_LANGUAGE_PATTERN =
  /^(.*)\.([a-z]{2}(?:-[A-Z]{2})?)\.(md|canvas)$/;

function presetContentFiles(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): readonly SiteTemplateFile[] {
  const defaultLanguage = defaultLanguageForLocale(variables.locale);
  const files = copyTemplateTree(`presets/${preset.name}/content`);

  if (preset.languages.length <= 1) {
    const selected = new Map<
      string,
      { readonly file: SiteTemplateFile; readonly score: number }
    >();

    for (const file of files) {
      const match = CONTENT_LANGUAGE_PATTERN.exec(file.path);
      if (
        !match ||
        !SCAFFOLD_LANGUAGES.includes(match[2] as ScaffoldLanguage)
      ) {
        selected.set(file.path, { file, score: 0 });
        continue;
      }

      const [, base, language, extension] = match;
      const score =
        language === defaultLanguage ? 2 : language === "en" ? 1 : 0;
      const relativePath = `${base}.${extension}`;
      const current = selected.get(relativePath);
      if (!current || score > current.score) {
        selected.set(relativePath, { file, score });
      }
    }

    return [...selected.entries()].map(([relativePath, { file }]) => ({
      path: `content/${relativePath}`,
      content: replaceTitle(file.content, variables.title),
    }));
  }

  const localizedAssets = new Map<
    string,
    { readonly file: SiteTemplateFile; readonly score: number }
  >();
  for (const file of files) {
    const match = CONTENT_LANGUAGE_PATTERN.exec(file.path);
    if (!match || match[3] === "md") continue;

    const [, base, language, extension] = match;
    const score = language === defaultLanguage ? 2 : language === "en" ? 1 : 0;
    const relativePath = `${base}.${extension}`;
    const current = localizedAssets.get(relativePath);
    if (!current || score > current.score) {
      localizedAssets.set(relativePath, { file, score });
    }
  }

  return files.flatMap((file) => {
    const match = CONTENT_LANGUAGE_PATTERN.exec(file.path);
    let relativePath = file.path;

    if (match && SCAFFOLD_LANGUAGES.includes(match[2] as ScaffoldLanguage)) {
      const [, base, language, extension] = match;
      if (extension !== "md") {
        const selected = localizedAssets.get(`${base}.${extension}`);
        if (selected?.file !== file) return [];
        relativePath = `${base}.${extension}`;
      } else {
        relativePath =
          language === defaultLanguage
            ? `${base}.${extension}`
            : `${base}.${language}.${extension}`;
      }
    }

    return [
      {
        path: `content/${relativePath}`,
        content: replaceTitle(file.content, variables.title),
      },
    ];
  });
}

function replaceTitle(
  content: string | Uint8Array,
  title: string,
): string | Uint8Array {
  return typeof content === "string"
    ? content.split("{{title}}").join(title)
    : content;
}

function pnpmWorkspace(): string {
  const allowBuilds = ["esbuild", "puppeteer", "sharp"];
  return `allowBuilds:\n${allowBuilds
    .map((name) => `  ${name}: true`)
    .join("\n")}\n`;
}

function packageJson(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions,
): string {
  const utilities = options.utilities ?? SCAFFOLD_DEFAULT_UTILITIES;
  const dependencies: Record<string, string> = {
    "@riebeckite/core": RIEBECKITE_VERSION,
    "@riebeckite/honox": RIEBECKITE_VERSION,
    "@riebeckite/node": RIEBECKITE_VERSION,
    "@riebeckite/runtime": RIEBECKITE_VERSION,
    "@riebeckite/spa": RIEBECKITE_VERSION,
    "@riebeckite/ui": RIEBECKITE_VERSION,
    hono: "^4.12.25",
    honox: "0.1.62",
  };
  for (const plugin of preset.plugins) {
    dependencies[plugin.package] = RIEBECKITE_VERSION;
  }
  if (preset.theme) {
    dependencies[preset.theme.package] = RIEBECKITE_VERSION;
  }
  return `${JSON.stringify(
    {
      name: variables.name,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "riebeckite dev",
        build: "riebeckite build",
        check: "riebeckite check",
        doctor: "riebeckite doctor",
        inspect: "riebeckite inspect",
      },
      dependencies,
      devDependencies: {
        ...(utilities.includes("biome") ? { "@biomejs/biome": "^2.4.16" } : {}),
        "@hono/vite-build": "^1.11.1",
        "@hono/node-server": "^2.1.3",
        "@riebeckite/cli": RIEBECKITE_VERSION,
        "@types/node": "^24.5.2",
        typescript: "^5.0.0",
        vite: "^8.3.5",
        ...(options.cloudflareWorkers ? { wrangler: WRANGLER_VERSION } : {}),
      },
    },
    null,
    2,
  )}\n`;
}

function riebeckiteConfig(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions,
): string {
  const { title, description, baseUrl, locale } = variables;
  const lines: string[] = ['import { defineConfig } from "@riebeckite/core";'];
  for (const plugin of preset.plugins) {
    lines.push(`import { ${plugin.factory} } from "${plugin.package}";`);
  }
  if (preset.theme) {
    lines.push(
      `import { ${preset.theme.factory} } from "${preset.theme.package}";`,
    );
  }
  lines.push("");
  lines.push("export default defineConfig({");
  lines.push("  site: {");
  lines.push(`    title: ${JSON.stringify(title)},`);
  lines.push(`    description: ${JSON.stringify(description)},`);
  lines.push(`    baseUrl: ${JSON.stringify(baseUrl)},`);
  lines.push(`    locale: ${JSON.stringify(locale)},`);
  lines.push("  },");
  lines.push("  content: {");
  lines.push(
    `    directory: ${JSON.stringify(options.contentDirectory ?? "content")},`,
  );
  lines.push("  },");
  if (preset.theme) {
    const theme = preset.theme;
    lines.push(
      `  theme: ${theme.options ? `${theme.factory}(${theme.options})` : `${theme.factory}()`},`,
    );
  }
  lines.push("  plugins: [");
  for (const plugin of preset.plugins) {
    lines.push(`    ${pluginExpression(plugin, preset, variables)},`);
  }
  lines.push("  ],");
  lines.push("});");
  return `${lines.join("\n")}\n`;
}

/**
 * `starter` includes practical configuration and `showcase` renders the full
 * option surface. Lightweight presets deliberately keep depth 0.
 */
