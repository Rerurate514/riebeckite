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
import { listLocalPlugins } from "../local_plugins.js";
import { renderPluginFiles } from "../plugin_generator/templates.js";
import { resolvePrompt, validateInput } from "../prompt_helpers.js";
import {
  addPageTypeToPlugin,
  assertAbsent,
  pageTypeResultMessage,
  registerPlugin,
  writeDirectoryAtomically,
} from "./create_page_type_part2.js";

export type CreatePageTypeOptions = {
  readonly name: string;
  readonly plugin?: string;
  readonly path: string;
  readonly tests: boolean;
  readonly register: boolean;
};

export type CreatePageTypeResult =
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

export async function createPageType(
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
          hint: "Add the PageType to a local Plugin",
        },
      ],
    }),
  );
  if (destination === null) return;
  let plugin: string | undefined;
  if (destination === "existing") {
    const plugins = await listLocalPlugins();
    if (plugins.length === 0)
      throw new Error(
        "No local Plugins found in extensions/. Create a Plugin first with `riebeckite create plugin`.",
      );
    const pluginName = await resolvePrompt(
      select<string>({
        message: "Which Plugin should own the PageType?",
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

export async function createPageTypePlugin(
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
