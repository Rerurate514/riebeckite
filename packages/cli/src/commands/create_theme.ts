import fs from "node:fs/promises";
import path from "node:path";
import {
  confirm,
  intro,
  log,
  multiselect,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { resolvePrompt, validateInput } from "../prompt_helpers.js";
import {
  THEME_FEATURE_IDS,
  THEME_TEMPLATE_IDS,
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

type CreateThemeResult = {
  readonly directory: string;
  readonly registered: boolean;
};

export async function runCreateTheme(
  options: CreateThemeOptions,
): Promise<void> {
  const result = await createTheme(options);
  if (options.register && !result.registered)
    console.log(
      "Theme was created. Register it manually in riebeckite.config.ts.",
    );
  console.log(`Created theme in ${result.directory}`);
}

async function createTheme(
  options: CreateThemeOptions,
): Promise<CreateThemeResult> {
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
  const registered = options.register
    ? await registerTheme(options.name)
    : false;
  return {
    directory: path.relative(process.cwd(), root) || ".",
    registered,
  };
}

export async function runInteractiveCreateTheme(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Cannot prompt for theme details in a non-interactive environment. Provide a name and --template.",
    );
  intro("Create a Riebeckite Theme");
  const name = await resolvePrompt(
    text({
      message: "Theme name",
      placeholder: "my-theme",
      validate: validateInput(assertThemeName),
    }),
  );
  if (name === null) return;
  const themeName = name.trim();
  const directory = await resolvePrompt(
    text({
      message: "Directory",
      placeholder: `themes/${themeName}`,
      defaultValue: `themes/${themeName}`,
    }),
  );
  if (directory === null) return;
  const template = await resolvePrompt(
    select<ThemeTemplateId>({
      message: "Base template",
      initialValue: "minimal",
      options: THEME_TEMPLATE_IDS.map((id) => ({
        value: id,
        label: themeTemplateRegistry[id].name,
        hint: themeTemplateRegistry[id].description,
      })),
    }),
  );
  if (template === null) return;
  const defaults = themeTemplateRegistry[template].defaultFeatures;
  if (defaults.length > 0) {
    await log.info(
      `${themeTemplateRegistry[template].name} already includes ${defaults.join(", ")}.`,
    );
  }
  const features = await resolvePrompt(
    multiselect<ThemeFeatureId>({
      message: "Additional features",
      options: THEME_FEATURE_IDS.filter((id) => !defaults.includes(id)).map(
        (id) => ({
          value: id,
          label: id,
          hint: themeFeatureRegistry[id].description,
        }),
      ),
      required: false,
    }),
  );
  if (features === null) return;
  const darkMode = await resolvePrompt(
    confirm({
      message: "Support light and dark modes?",
      initialValue: true,
    }),
  );
  if (darkMode === null) return;
  const tests = await resolvePrompt(
    confirm({ message: "Generate tests?", initialValue: true }),
  );
  if (tests === null) return;
  const documentation = await resolvePrompt(
    confirm({ message: "Generate README?", initialValue: true }),
  );
  if (documentation === null) return;
  const register = await resolvePrompt(
    confirm({
      message: "Register in riebeckite.config.ts?",
      initialValue: false,
    }),
  );
  if (register === null) return;

  const progress = spinner();
  progress.start("Creating Theme");
  let result: CreateThemeResult;
  try {
    result = await createTheme({
      name: themeName,
      directory,
      template,
      features,
      darkMode,
      tests,
      documentation,
      register,
    });
  } catch (error) {
    progress.error("Could not create the Theme.");
    throw error;
  }
  progress.stop(`Created Theme in ${result.directory}`);
  if (register && !result.registered) {
    await log.warn("Register it manually in riebeckite.config.ts.");
  }
  note(`riebeckite theme preview ${themeName}\nriebeckite check`, "Next steps");
  outro("Theme created.");
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
