import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizePageTypePath,
  renderPageTypeModule,
  renderPageTypeTest,
} from "../page_type_generator/templates.js";
import type {
  CreatePageTypeOptions,
  CreatePageTypeResult,
} from "./create_page_type_part1.js";

export async function addPageTypeToPlugin(
  options: CreatePageTypeOptions,
): Promise<CreatePageTypeResult> {
  const pluginRoot = path.resolve(
    process.cwd(),
    "extensions",
    options.plugin ?? "",
  );
  const indexPath = path.join(pluginRoot, "index.ts");
  const pagePath = path.join(pluginRoot, "page_types", `${options.name}.ts`);
  const testPath = path.join(pluginRoot, "test", `${options.name}.test.ts`);
  await assertAbsent(pagePath);
  if (options.tests) await assertAbsent(testPath);
  const source = await fs.readFile(indexPath, "utf8").catch(() => {
    throw new Error(
      `Could not find Plugin entry point: ${indexPath}. Create the Plugin first with \`riebeckite create plugin\`.`,
    );
  });
  const normalizedPagePath = normalizePageTypePath(options.path);
  if (
    source.includes(`"${options.path}"`) ||
    source.includes(`"${normalizedPagePath}"`) ||
    (await pluginUsesPath(pluginRoot, options.path)) ||
    (await pluginUsesPath(pluginRoot, normalizedPagePath))
  )
    throw new Error(
      `PageType path already exists in this Plugin: ${options.path}`,
    );
  const identifier = toIdentifier(options.name);
  const updated = addPageTypeToIndex(source, identifier, options.name);
  if (!updated)
    throw new Error(
      "Could not safely add the PageType. Add the exported PageType to pageTypes in the Plugin manually.",
    );
  await fs.mkdir(path.dirname(pagePath), { recursive: true });
  const temporaryPage = `${pagePath}.tmp-${process.pid}`;
  const temporaryIndex = `${indexPath}.tmp-${process.pid}`;
  const temporaryTest = `${testPath}.tmp-${process.pid}`;
  let pageCreated = false;
  let testCreated = false;
  try {
    await fs.writeFile(
      temporaryPage,
      renderPageTypeModule(options.name, options.path),
      "utf8",
    );
    await fs.writeFile(temporaryIndex, updated, "utf8");
    if (options.tests) {
      await fs.mkdir(path.dirname(testPath), { recursive: true });
      await fs.writeFile(
        temporaryTest,
        renderPageTypeTest(options.name, options.path),
        "utf8",
      );
    }
    await fs.rename(temporaryPage, pagePath);
    pageCreated = true;
    if (options.tests) {
      await fs.rename(temporaryTest, testPath);
      testCreated = true;
    }
    await fs.rename(temporaryIndex, indexPath);
  } catch (error) {
    await fs.rm(temporaryPage, { force: true });
    await fs.rm(temporaryIndex, { force: true });
    await fs.rm(temporaryTest, { force: true });
    if (pageCreated) await fs.rm(pagePath, { force: true });
    if (testCreated) await fs.rm(testPath, { force: true });
    throw error;
  }
  return {
    kind: "addition",
    plugin: options.plugin ?? "",
    registered: options.register
      ? await registerPlugin(options.plugin ?? "")
      : false,
  };
}

export function pageTypeResultMessage(result: CreatePageTypeResult): string {
  return result.kind === "plugin"
    ? `Created PageType Plugin in ${result.directory}`
    : `Added PageType to extensions/${result.plugin}`;
}

export function addPageTypeToIndex(
  source: string,
  identifier: string,
  name: string,
): string | null {
  if (
    source.includes(`id: "${name}-index"`) ||
    source.includes(`${identifier}PageType`)
  )
    return null;
  const array = /pageTypes:\s*\[/.exec(source);
  if (array?.index === undefined) return null;
  const importLine = `import { ${identifier}PageType } from "./page_types/${name}.js";\n`;
  const insertion = `${array[0]}\n      ${identifier}PageType,`;
  return `${importLine}${source.replace(array[0], insertion)}`;
}

export async function writeDirectoryAtomically(
  root: string,
  files: ReadonlyMap<string, string>,
): Promise<void> {
  const temporary = `${root}.tmp-${process.pid}`;
  let created = false;
  try {
    await fs.mkdir(path.dirname(temporary), { recursive: true });
    await fs.mkdir(temporary);
    created = true;
    for (const [relative, content] of files) {
      const target = path.join(temporary, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }
    await fs.rename(temporary, root);
  } catch (error) {
    if (created) await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function assertAbsent(target: string): Promise<void> {
  try {
    await fs.access(target);
    throw new Error(`Refusing to overwrite existing file: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function registerPlugin(name: string): Promise<boolean> {
  const configPath = path.resolve(process.cwd(), "riebeckite.config.ts");
  const source = await fs.readFile(configPath, "utf8").catch(() => null);
  if (!source) return false;
  const identifier = toPluginIdentifier(name);
  if (source.includes(`name: "${name}"`) || source.includes(`${identifier}(`))
    return false;
  const array = /plugins:\s*\[([\s\S]*?)\n(\s*)\]/.exec(source);
  if (!array?.[2]) return false;
  const updated = source.replace(
    array[0],
    `plugins: [${array[1]}\n${array[2]}  ${identifier}(),\n${array[2]}]`,
  );
  await fs.writeFile(
    configPath,
    `import { ${identifier} } from "./extensions/${name}/index";\n${updated}`,
    "utf8",
  );
  return true;
}

export function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return `${identifier.slice(0, 1).toUpperCase()}${identifier.slice(1)}`;
}

export function toPluginIdentifier(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

export async function pluginUsesPath(
  pluginRoot: string,
  pagePath: string,
): Promise<boolean> {
  const pageTypes = path.join(pluginRoot, "page_types");
  const entries = await fs
    .readdir(pageTypes, { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const source = await fs.readFile(path.join(pageTypes, entry.name), "utf8");
    if (source.includes(`"${pagePath}"`)) return true;
  }
  return false;
}
