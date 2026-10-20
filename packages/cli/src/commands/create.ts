import { runCreateRiebeckite } from "create-riebeckite";
import { createSetupPrompts } from "../prompts.js";
import { runInteractiveCreatePlugin } from "./create_plugin.js";
import { runInteractiveCreateTheme } from "./create_theme.js";

export type CreateTarget = "site" | "plugin" | "theme";

export async function runInteractiveCreate(): Promise<void> {
  const prompts = createSetupPrompts();
  if (!prompts.interactive) {
    throw new Error(
      "Cannot choose what to create in a non-interactive environment. Use create site, create plugin, or create theme.",
    );
  }
  const target = await prompts.select<CreateTarget>(
    "What would you like to create?",
    [
      { value: "site", label: "Site" },
      { value: "plugin", label: "Plugin" },
      { value: "theme", label: "Theme" },
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
  await runInteractiveCreateTheme();
}

export function createHelp(): string {
  return `Create a Riebeckite site, Plugin, or Theme.

Usage:
  riebeckite create
  riebeckite create site [directory] [create-riebeckite options]
  riebeckite create plugin [name] [plugin options]
  riebeckite create theme [name] [theme options]

Examples:
  riebeckite create
  riebeckite create site my-site --preset starter
  riebeckite create plugin reading-time --features transform
  riebeckite create theme my-theme --template blog --register`;
}
