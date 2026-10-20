import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  parseThemeFeatures,
  type ThemeFeatureId,
  type ThemeTemplateId,
  themeFeatureRegistry,
  themeTemplateRegistry,
} from "../theme_generator/registry.js";
import { renderThemeFiles } from "../theme_generator/templates.js";

export type CreateThemeOptions = {
  readonly name: string;
  readonly directory: string;
  readonly template: ThemeTemplateId;
  readonly features: readonly ThemeFeatureId[];
  readonly darkMode: boolean;
  readonly tests: boolean;
  readonly documentation: boolean;
  readonly register: boolean;
};

export async function runCreateTheme(
  options: CreateThemeOptions,
): Promise<void> {
  assertThemeName(options.name);
  const root = path.resolve(process.cwd(), options.directory);
  const themes = path.resolve(process.cwd(), "themes");
  if (root !== themes && !root.startsWith(`${themes}${path.sep}`)) {
    throw new Error("Theme directory must be inside themes/.");
  }
  await assertAbsent(root);
  const features = [
    ...new Set([
      ...themeTemplateRegistry[options.template].defaultFeatures,
      ...options.features,
    ]),
  ];
  const files = renderThemeFiles(
    options.name,
    options.template,
    features,
    options.darkMode,
    options.tests,
    options.documentation,
  );
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
  if (options.register && !(await registerTheme(options.name))) {
    console.log(
      "Theme was created. Register it manually in riebeckite.config.ts.",
    );
  }
  console.log(`Created theme in ${path.relative(process.cwd(), root) || "."}`);
}

export async function runInteractiveCreateTheme(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Cannot prompt for theme details in a non-interactive environment. Provide a name and --template.",
    );
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const name = (await readline.question("Theme name: ")).trim();
    assertThemeName(name);
    const directory =
      (await readline.question(`Directory [themes/${name}]: `)).trim() ||
      `themes/${name}`;
    printThemeChoices();
    const template =
      (await readline.question("Base template [minimal]: ")).trim() ||
      "minimal";
    if (!(template in themeTemplateRegistry))
      throw new Error(`Unknown theme template: ${template}.`);
    printFeatureChoices();
    const features = parseThemeFeatures(
      await readline.question(
        "Additional features (comma-separated, optional): ",
      ),
    );
    const darkMode =
      (await readline.question("Support light and dark modes? [Y/n]: "))
        .trim()
        .toLowerCase() !== "n";
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
    await runCreateTheme({
      name,
      directory,
      template: template as ThemeTemplateId,
      features,
      darkMode,
      tests,
      documentation,
      register,
    });
  } finally {
    readline.close();
  }
}

export function assertThemeName(name: string): void {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(name))
    throw new Error("Theme name must be kebab-case and start with a letter.");
}

async function assertAbsent(root: string): Promise<void> {
  try {
    await fs.access(root);
    throw new Error(`Refusing to overwrite existing directory: ${root}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function registerTheme(name: string): Promise<boolean> {
  const configPath = path.resolve(process.cwd(), "riebeckite.config.ts");
  let source: string;
  try {
    source = await fs.readFile(configPath, "utf8");
  } catch {
    return false;
  }
  const identifier = `${name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())}Theme`;
  if (source.includes(`name: "${name}"`) || source.includes(`${identifier}(`))
    return false;
  const theme = /theme:\s*[A-Za-z_$][\w$]*\([^()\r\n]*\),?/.exec(source);
  if (!theme) return false;
  const importLine = `import { ${identifier} } from "./themes/${name}/index";\n`;
  const replacement = `theme: ${identifier}(),`;
  const updated = source.replace(theme[0], replacement);
  if (updated === source) return false;
  await fs.writeFile(configPath, `${importLine}${updated}`, "utf8");
  return true;
}

function printThemeChoices(): void {
  for (const template of Object.values(themeTemplateRegistry))
    console.log(`  ${template.id}: ${template.description}`);
}

function printFeatureChoices(): void {
  for (const [id, feature] of Object.entries(themeFeatureRegistry))
    console.log(`  ${id}: ${feature.description}`);
}
