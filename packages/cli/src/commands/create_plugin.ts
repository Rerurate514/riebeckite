import fs from "node:fs/promises";
import path from "node:path";
import {
  confirm,
  groupMultiselect,
  intro,
  log,
  note,
  outro,
  spinner,
  text,
} from "@clack/prompts";
import {
  PLUGIN_FEATURE_IDS,
  type PluginFeatureId,
  parsePluginFeatures,
  pluginFeatureRegistry,
} from "../plugin_generator/registry.js";
import { renderPluginFiles } from "../plugin_generator/templates.js";
import { resolvePrompt, validateInput } from "../prompt_helpers.js";

type CreatePluginOptions = {
  readonly name: string;
  readonly directory: string;
  readonly features: readonly PluginFeatureId[];
  readonly tests: boolean;
  readonly documentation: boolean;
  readonly register: boolean;
};

type CreatePluginResult = {
  readonly directory: string;
  readonly registered: boolean;
};

export async function runCreatePlugin(
  options: CreatePluginOptions,
): Promise<void> {
  const result = await createPlugin(options);
  if (options.register && !result.registered)
    console.log(
      "Plugin was created. Register it manually in riebeckite.config.ts.",
    );
  console.log(`Created plugin in ${result.directory}`);
}

async function createPlugin(
  options: CreatePluginOptions,
): Promise<CreatePluginResult> {
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
  const registered = options.register
    ? await registerPlugin(options.name)
    : false;
  return {
    directory: path.relative(process.cwd(), root) || ".",
    registered,
  };
}

export async function runInteractiveCreatePlugin(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new Error(
      "Cannot prompt for plugin details in a non-interactive environment. Provide a name and --features.",
    );
  }
  intro("Create a Riebeckite Plugin");
  const name = await resolvePrompt(
    text({
      message: "Plugin name",
      placeholder: "my-plugin",
      validate: validateInput(assertPluginName),
    }),
  );
  if (name === null) return;
  const pluginName = name.trim();
  const directory = await resolvePrompt(
    text({
      message: "Directory",
      placeholder: `extensions/${pluginName}`,
      defaultValue: `extensions/${pluginName}`,
    }),
  );
  if (directory === null) return;
  const features = await resolvePrompt(
    groupMultiselect<PluginFeatureId>({
      message: "Plugin features",
      options: {
        Primary: featureOptions("primary"),
        Supporting: featureOptions("support"),
      },
    }),
  );
  if (features === null) return;
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
  progress.start("Creating Plugin");
  let result: CreatePluginResult;
  try {
    result = await createPlugin({
      name: pluginName,
      directory,
      features,
      tests,
      documentation,
      register,
    });
  } catch (error) {
    progress.error("Could not create the Plugin.");
    throw error;
  }
  progress.stop(`Created Plugin in ${result.directory}`);
  if (register && !result.registered) {
    await log.warn("Register it manually in riebeckite.config.ts.");
  }
  note("riebeckite check\nriebeckite build", "Next steps");
  outro("Plugin created.");
}

function featureOptions(
  category: "primary" | "support",
): { value: PluginFeatureId; label: string; hint: string }[] {
  return PLUGIN_FEATURE_IDS.filter(
    (id) => pluginFeatureRegistry[id].category === category,
  ).map((id) => ({
    value: id,
    label: id,
    hint: pluginFeatureRegistry[id].description,
  }));
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
  const identifier = name.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
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
