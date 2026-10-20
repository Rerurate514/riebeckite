import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  type PluginFeatureId,
  parsePluginFeatures,
  pluginFeatureRegistry,
} from "../plugin_generator/registry.js";
import { renderPluginFiles } from "../plugin_generator/templates.js";

export type CreatePluginOptions = {
  readonly name: string;
  readonly directory: string;
  readonly features: readonly PluginFeatureId[];
  readonly tests: boolean;
  readonly documentation: boolean;
  readonly register: boolean;
};

export async function runCreatePlugin(
  options: CreatePluginOptions,
): Promise<void> {
  assertPluginName(options.name);
  const root = path.resolve(process.cwd(), options.directory);
  const extensions = path.resolve(process.cwd(), "extensions");
  if (root !== extensions && !root.startsWith(`${extensions}${path.sep}`)) {
    throw new Error("Plugin directory must be inside extensions/.");
  }
  try {
    await fs.access(root);
    throw new Error(`Refusing to overwrite existing directory: ${root}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const files = renderPluginFiles(
    options.name,
    options.features,
    options.tests,
    options.documentation,
  );
  const temporary = `${root}.tmp-${process.pid}`;
  let temporaryCreated = false;
  try {
    await fs.mkdir(path.dirname(temporary), { recursive: true });
    await fs.mkdir(temporary, { recursive: false });
    temporaryCreated = true;
    for (const [relative, content] of files) {
      const target = path.join(temporary, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }
    await fs.rename(temporary, root);
  } catch (error) {
    if (temporaryCreated)
      await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }
  if (options.register) {
    const registered = await registerPlugin(options.name);
    if (!registered)
      console.log(
        "Plugin was created. Register it manually in riebeckite.config.ts.",
      );
  }
  console.log(`Created plugin in ${path.relative(process.cwd(), root) || "."}`);
}

export async function runInteractiveCreatePlugin(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new Error(
      "Cannot prompt for plugin details in a non-interactive environment. Provide a name and --features.",
    );
  }
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const name = (await readline.question("Plugin name: ")).trim();
    assertPluginName(name);
    const directory =
      (await readline.question(`Directory [extensions/${name}]: `)).trim() ||
      `extensions/${name}`;
    console.log("Primary features:");
    printFeatureChoices("primary");
    console.log("Supporting features:");
    printFeatureChoices("support");
    const features = parsePluginFeatures(
      (await readline.question("Features (comma-separated): ")).trim(),
    );
    const tests =
      (await readline.question("Generate tests? [Y/n]: "))
        .trim()
        .toLowerCase() !== "n";
    const documentation =
      (await readline.question("Generate README? [Y/n]: "))
        .trim()
        .toLowerCase() !== "n";
    const register =
      (await readline.question("Register in riebeckite.config.ts? [y/N]: "))
        .trim()
        .toLowerCase() === "y";
    await runCreatePlugin({
      name,
      directory,
      features,
      tests,
      documentation,
      register,
    });
  } finally {
    readline.close();
  }
}

function printFeatureChoices(category: "primary" | "support"): void {
  for (const feature of Object.values(pluginFeatureRegistry)) {
    if (feature.category === category)
      console.log(`  ${feature.id}: ${feature.description}`);
  }
}

export function parseCreatePluginFeatures(
  value: string,
): readonly PluginFeatureId[] {
  return parsePluginFeatures(value);
}

export function assertPluginName(name: string): void {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(name)) {
    throw new Error("Plugin name must be kebab-case and start with a letter.");
  }
}

async function registerPlugin(name: string): Promise<boolean> {
  const configPath = path.resolve(process.cwd(), "riebeckite.config.ts");
  let source: string;
  try {
    source = await fs.readFile(configPath, "utf8");
  } catch {
    return false;
  }
  const identifier = `${name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())}Plugin`;
  if (source.includes(`name: "${name}"`) || source.includes(`${identifier}(`))
    return false;
  const array = /plugins:\s*\[([\s\S]*?)\n(\s*)\]/.exec(source);
  if (!array?.[2]) return false;
  const importLine = `import { ${identifier} } from "./extensions/${name}/index";\n`;
  const insertion = `plugins: [${array[1]}\n${array[2]}  ${identifier}(),\n${array[2]}]`;
  const updated = source.replace(array[0], insertion);
  if (updated === source) return false;
  await fs.writeFile(configPath, `${importLine}${updated}`, "utf8");
  return true;
}
