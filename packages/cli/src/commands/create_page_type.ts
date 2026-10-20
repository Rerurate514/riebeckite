import fs from "node:fs/promises";
import path from "node:path";
import {
  confirm,
  intro,
  log,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import {
  renderPageTypeModule,
  renderPageTypeTest,
} from "../page_type_generator/templates.js";
import { renderPluginFiles } from "../plugin_generator/templates.js";
import { resolvePrompt, validateInput } from "../prompt_helpers.js";

export type CreatePageTypeOptions = {
  readonly name: string;
  readonly plugin?: string;
  readonly path: string;
  readonly tests: boolean;
  readonly register: boolean;
};

type CreatePageTypeResult =
  | {
      readonly kind: "plugin";
      readonly directory: string;
      readonly registered: boolean;
    }
  | {
      readonly kind: "addition";
      readonly plugin: string;
      readonly registered: boolean;
    };

export async function runCreatePageType(
  options: CreatePageTypeOptions,
): Promise<void> {
  const result = await createPageType(options);
  if (options.register && !result.registered)
    console.log(
      result.kind === "plugin"
        ? "PageType Plugin was created. Register it manually in riebeckite.config.ts."
        : "PageType was added. Register its Plugin manually in riebeckite.config.ts.",
    );
  console.log(pageTypeResultMessage(result));
}

async function createPageType(
  options: CreatePageTypeOptions,
): Promise<CreatePageTypeResult> {
  assertPageTypeName(options.name);
  assertPagePath(options.path);
  if (options.plugin) {
    assertPageTypeName(options.plugin);
    return addPageTypeToPlugin(options);
  }
  return createPageTypePlugin(options);
}

export async function runInteractiveCreatePageType(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true)
    throw new Error(
      "Cannot prompt for PageType details in a non-interactive environment. Provide a name.",
    );
  intro("Create a Riebeckite PageType");
  const name = await resolvePrompt(
    text({
      message: "PageType name",
      placeholder: "glossary",
      validate: validateInput(assertPageTypeName),
    }),
  );
  if (name === null) return;
  const pageTypeName = name.trim();
  const destination = await resolvePrompt(
    select<"new" | "existing">({
      message: "Where should the PageType live?",
      initialValue: "new",
      options: [
        {
          value: "new",
          label: "New Plugin",
          hint: "Create a Plugin that owns this PageType",
        },
        {
          value: "existing",
          label: "Existing Plugin",
          hint: "Add the PageType to an installed Plugin",
        },
      ],
    }),
  );
  if (destination === null) return;
  let plugin: string | undefined;
  if (destination === "existing") {
    const pluginName = await resolvePrompt(
      text({
        message: "Plugin name",
        placeholder: "my-plugin",
        validate: validateInput(assertPageTypeName),
      }),
    );
    if (pluginName === null) return;
    plugin = pluginName.trim();
  }
  const pathValue = await resolvePrompt(
    text({
      message: "PageType path",
      placeholder: `/${pageTypeName}/`,
      defaultValue: `/${pageTypeName}/`,
      validate: validateInput((value) =>
        assertPagePath(value || `/${pageTypeName}/`),
      ),
    }),
  );
  if (pathValue === null) return;
  const tests = await resolvePrompt(
    confirm({ message: "Generate tests?", initialValue: false }),
  );
  if (tests === null) return;
  const register = await resolvePrompt(
    confirm({
      message: "Register in riebeckite.config.ts?",
      initialValue: false,
    }),
  );
  if (register === null) return;

  const progress = spinner();
  progress.start("Creating PageType");
  let result: CreatePageTypeResult;
  try {
    result = await createPageType({
      name: pageTypeName,
      plugin,
      path: pathValue.trim() || `/${pageTypeName}/`,
      tests,
      register,
    });
  } catch (error) {
    progress.error("Could not create the PageType.");
    throw error;
  }
  progress.stop(pageTypeResultMessage(result));
  if (register && !result.registered) {
    await log.warn("Register it manually in riebeckite.config.ts.");
  }
  note("riebeckite check\nriebeckite build", "Next steps");
  outro("PageType created.");
}

export function assertPageTypeName(name: string): void {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(name))
    throw new Error(
      "PageType name must be kebab-case and start with a letter.",
    );
}

export function assertPagePath(value: string): void {
  if (
    !/^\/[a-z0-9][a-z0-9/_-]*\/$/.test(value) ||
    value.includes("//") ||
    value.includes("..")
  )
    throw new Error(
      "PageType path must be an absolute, normalized URL path ending with '/'.",
    );
}

async function createPageTypePlugin(
  options: CreatePageTypeOptions,
): Promise<CreatePageTypeResult> {
  const root = path.resolve(process.cwd(), "extensions", options.name);
  await assertAbsent(root);
  const files = renderPluginFiles(
    options.name,
    ["pages"],
    options.tests,
    true,
    options.path,
  );
  await writeDirectoryAtomically(root, files);
  return {
    kind: "plugin",
    directory: path.relative(process.cwd(), root),
    registered: options.register ? await registerPlugin(options.name) : false,
  };
}

async function addPageTypeToPlugin(
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
    throw new Error(`Could not find Plugin entry point: ${indexPath}`);
  });
  if (
    source.includes(`"${options.path}"`) ||
    (await pluginUsesPath(pluginRoot, options.path))
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

function pageTypeResultMessage(result: CreatePageTypeResult): string {
  return result.kind === "plugin"
    ? `Created PageType Plugin in ${result.directory}`
    : `Added PageType to extensions/${result.plugin}`;
}

function addPageTypeToIndex(
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

async function writeDirectoryAtomically(
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

async function assertAbsent(target: string): Promise<void> {
  try {
    await fs.access(target);
    throw new Error(`Refusing to overwrite existing file: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function registerPlugin(name: string): Promise<boolean> {
  const configPath = path.resolve(process.cwd(), "riebeckite.config.ts");
  const source = await fs.readFile(configPath, "utf8").catch(() => null);
  if (!source) return false;
  const identifier = `${toPluginIdentifier(name)}Plugin`;
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

function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return `${identifier.slice(0, 1).toUpperCase()}${identifier.slice(1)}`;
}

function toPluginIdentifier(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

async function pluginUsesPath(
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
