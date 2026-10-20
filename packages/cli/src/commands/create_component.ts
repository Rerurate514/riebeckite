import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  renderComponent,
  renderComponentCss,
  renderComponentTest,
} from "../component_generator/templates.js";
import { assertPageTypeName } from "./create_page_type.js";

export type CreateComponentOptions = {
  readonly name: string;
  readonly target: "site" | "plugin" | "theme";
  readonly plugin?: string;
  readonly theme?: string;
  readonly tests: boolean;
  readonly styles: boolean;
};

export async function runCreateComponent(
  options: CreateComponentOptions,
): Promise<void> {
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
  console.log(
    `Created ${options.target} component in ${path.relative(process.cwd(), componentPath)}`,
  );
}

export async function runInteractiveCreateComponent(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Cannot prompt for component details in a non-interactive environment. Provide a name.",
    );
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const name = (await readline.question("Component name: ")).trim();
    const target =
      (await readline.question("Target [site|plugin|theme] (site): ")).trim() ||
      "site";
    if (target !== "site" && target !== "plugin" && target !== "theme")
      throw new Error("Component target must be site, plugin, or theme.");
    const plugin =
      target === "plugin"
        ? (await readline.question("Plugin name: ")).trim()
        : undefined;
    const tests =
      (await readline.question("Generate tests? [y/N]: "))
        .trim()
        .toLowerCase() === "y";
    const styles =
      (await readline.question("Generate styles? [y/N]: "))
        .trim()
        .toLowerCase() === "y";
    await runCreateComponent({ name, target, plugin, tests, styles });
  } finally {
    readline.close();
  }
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
    throw new Error(`Could not find Plugin entry point: ${indexPath}`);
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
