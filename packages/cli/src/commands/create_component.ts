import fs from "node:fs/promises";
import path from "node:path";
import { confirm, intro, outro, select, spinner, text } from "@clack/prompts";
import {
  renderComponent,
  renderComponentCss,
  renderComponentTest,
} from "../component_generator/templates.js";
import { listLocalPlugins } from "../local_plugins.js";
import { resolvePrompt, validateInput } from "../prompt_helpers.js";
import { assertPageTypeName } from "./create_page_type.js";

export type CreateComponentOptions = {
  readonly name: string;
  readonly target: "site" | "plugin" | "theme";
  readonly plugin?: string;
  readonly theme?: string;
  readonly tests: boolean;
  readonly styles: boolean;
};

type CreateComponentResult = {
  readonly target: "site" | "plugin";
  readonly directory: string;
};

export async function runCreateComponent(
  options: CreateComponentOptions,
): Promise<void> {
  const result = await createComponent(options);
  console.log(`Created ${result.target} component in ${result.directory}`);
}

async function createComponent(
  options: CreateComponentOptions,
): Promise<CreateComponentResult> {
  assertPageTypeName(options.name);
  if (options.target === "theme")
    throw new Error(
      "Themes do not own components. Create a site component and style its rr-* hook from the Theme.",
    );
  if (options.target === "plugin") {
    if (!options.plugin)
      throw new Error("--plugin is required when --target plugin is used.");
    assertPageTypeName(options.plugin);
  }
  const root =
    options.target === "site"
      ? path.resolve(process.cwd(), "app", "components")
      : path.resolve(
          process.cwd(),
          "extensions",
          options.plugin ?? "",
          "components",
        );
  const componentPath = path.join(root, `${options.name}.tsx`);
  const stylePath = path.join(root, `${options.name}.css`);
  await assertAbsent(componentPath);
  if (options.styles) await assertAbsent(stylePath);
  const pluginIndex =
    options.target === "plugin"
      ? await pluginIndexUpdate(options.plugin ?? "", options.name)
      : undefined;
  const testPath = path.join(root, `${options.name}.test.ts`);
  if (options.tests) await assertAbsent(testPath);
  await fs.mkdir(root, { recursive: true });
  const temporary = `${componentPath}.tmp-${process.pid}`;
  const temporaryIndex = pluginIndex
    ? `${pluginIndex.path}.tmp-${process.pid}`
    : undefined;
  try {
    await fs.writeFile(
      temporary,
      renderComponent(options.name, options.target),
      "utf8",
    );
    await fs.rename(temporary, componentPath);
    if (options.styles)
      await fs.writeFile(stylePath, renderComponentCss(options.name), "utf8");
    if (options.tests)
      await fs.writeFile(
        testPath,
        renderComponentTest(options.name, `./${options.name}.js`),
        "utf8",
      );
    if (pluginIndex)
      await fs.writeFile(temporaryIndex ?? "", pluginIndex.source, "utf8");
    if (pluginIndex) await fs.rename(temporaryIndex ?? "", pluginIndex.path);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    if (temporaryIndex) await fs.rm(temporaryIndex, { force: true });
    await fs.rm(componentPath, { force: true });
    if (options.styles) await fs.rm(stylePath, { force: true });
    if (options.tests) await fs.rm(testPath, { force: true });
    throw error;
  }
  return {
    target: options.target,
    directory: path.relative(process.cwd(), componentPath),
  };
}

export async function runInteractiveCreateComponent(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true)
    throw new Error(
      "Cannot prompt for component details in a non-interactive environment. Provide a name.",
    );
  intro("Create a Riebeckite Component");
  const name = await resolvePrompt(
    text({
      message: "Component name",
      placeholder: "note-card",
      validate: validateInput(assertPageTypeName),
    }),
  );
  if (name === null) return;
  const componentName = name.trim();
  const target = await resolvePrompt(
    select<"site" | "plugin">({
      message: "Where should the component live?",
      initialValue: "site",
      options: [
        {
          value: "site",
          label: "Site",
          hint: "app/components",
        },
        {
          value: "plugin",
          label: "Plugin",
          hint: "extensions/<plugin>/components",
        },
      ],
    }),
  );
  if (target === null) return;
  let plugin: string | undefined;
  if (target === "plugin") {
    const plugins = await listLocalPlugins();
    if (plugins.length === 0)
      throw new Error(
        "No local Plugins found in extensions/. Create a Plugin first with `riebeckite create plugin`.",
      );
    const pluginName = await resolvePrompt(
      select<string>({
        message: "Which Plugin should own the component?",
        options: plugins.map((name) => ({
          value: name,
          label: name,
          hint: `extensions/${name}`,
        })),
      }),
    );
    if (pluginName === null) return;
    plugin = pluginName;
  }
  const tests = await resolvePrompt(
    confirm({ message: "Generate tests?", initialValue: false }),
  );
  if (tests === null) return;
  const styles = await resolvePrompt(
    confirm({ message: "Generate styles?", initialValue: false }),
  );
  if (styles === null) return;

  const progress = spinner();
  progress.start("Creating Component");
  let result: CreateComponentResult;
  try {
    result = await createComponent({
      name: componentName,
      target,
      plugin,
      tests,
      styles,
    });
  } catch (error) {
    progress.error("Could not create the Component.");
    throw error;
  }
  progress.stop(`Created ${result.target} component in ${result.directory}`);
  outro("Component created.");
}

async function pluginIndexUpdate(
  plugin: string,
  name: string,
): Promise<{ path: string; source: string }> {
  const indexPath = path.resolve(
    process.cwd(),
    "extensions",
    plugin,
    "index.ts",
  );
  const source = await fs.readFile(indexPath, "utf8").catch(() => {
    throw new Error(
      `Could not find Plugin entry point: ${indexPath}. Create the Plugin first with \`riebeckite create plugin\`.`,
    );
  });
  const identifier = toIdentifier(name);
  if (
    source.includes(`${identifier}Props`) ||
    source.includes(`./components/${name}.js`)
  )
    throw new Error(`Plugin already exports a component named ${name}.`);
  return {
    path: indexPath,
    source: `${source}\nexport { default as ${identifier} } from "./components/${name}.js";\nexport type { ${identifier}Props } from "./components/${name}.js";\n`,
  };
}

async function assertAbsent(target: string): Promise<void> {
  try {
    await fs.access(target);
    throw new Error(`Refusing to overwrite existing file: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return `${identifier.slice(0, 1).toUpperCase()}${identifier.slice(1)}`;
}
