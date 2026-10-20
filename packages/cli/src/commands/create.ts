import { runCreateRiebeckite } from "create-riebeckite";
import { createSetupPrompts } from "../prompts.js";
import { runInteractiveCreateComponent } from "./create_component.js";
import { runInteractiveCreatePageType } from "./create_page_type.js";
import { runInteractiveCreatePlugin } from "./create_plugin.js";
import { runInteractiveCreateTheme } from "./create_theme.js";

export type CreateTarget =
  | "site"
  | "plugin"
  | "theme"
  | "page-type"
  | "component";

export async function runInteractiveCreate(): Promise<void> {
  const prompts = createSetupPrompts();
  if (!prompts.interactive) {
    throw new Error(
      "Cannot choose what to create in a non-interactive environment. Use create site, create plugin, create theme, create page-type, or create component.",
    );
  }
  const target = await prompts.select<CreateTarget>(
    "What would you like to create?",
    [
      { value: "site", label: "Site" },
      { value: "plugin", label: "Plugin" },
      { value: "theme", label: "Theme" },
      { value: "page-type", label: "PageType" },
      { value: "component", label: "Component" },
    ],
  );
  await runCreateTarget(target);
}

export async function runCreateSite(
  arguments_: readonly string[],
): Promise<void> {
  await runCreateRiebeckite(arguments_);
}

async function runCreateTarget(target: CreateTarget): Promise<void> {
  if (target === "site") {
    await runCreateSite([]);
    return;
  }
  if (target === "plugin") {
    await runInteractiveCreatePlugin();
    return;
  }
  if (target === "theme") {
    await runInteractiveCreateTheme();
    return;
  }
  if (target === "page-type") {
    await runInteractiveCreatePageType();
    return;
  }
  await runInteractiveCreateComponent();
}

export function createHelp(): string {
  return `Create a Riebeckite site, Plugin, Theme, PageType, or Component.

Usage:
  riebeckite create
  riebeckite create site [directory] [create-riebeckite options]
  riebeckite create plugin [name] [plugin options]
  riebeckite create theme [name] [theme options]
  riebeckite create page-type [name] [--plugin <name>] [--path <path>] [--with-tests] [--register]
  riebeckite create component [name] [--target site|plugin|theme] [--plugin <name>] [--with-tests] [--with-styles]

Examples:
  riebeckite create
  riebeckite create site my-site --preset starter
  riebeckite create plugin reading-time --features transform
  riebeckite create theme my-theme --template blog --register
  riebeckite create page-type glossary --path /glossary/ --with-tests
  riebeckite create component note-card --target site --with-styles`;
}
