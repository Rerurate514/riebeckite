import {
  type CliCommandDefinition,
  CliUsageError,
  cliArgument,
  cliBoolean,
  cliExample,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";

export function initCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "init",
    summary: "Create a new Riebeckite site.",
    arguments: [
      cliArgument("directory", {
        description: "Target directory.",
        default: ".",
      }),
    ],
    options: [
      cliString("preset", {
        description: "Starter preset.",
        valueName: "name",
      }),
      cliString("features", {
        description: "Comma-separated scaffold feature names.",
        valueName: "names",
      }),
      cliString("utilities", {
        description: "Comma-separated utility file names.",
        valueName: "names",
      }),
      cliBoolean("force", { description: "Write into a non-empty directory." }),
      cliBoolean("list-presets", {
        description: "List available presets and exit.",
      }),
      cliBoolean("github-actions", {
        description: "Add the GitHub Actions deployment workflow.",
      }),
      cliBoolean("cloudflare-workers", {
        description: "Add the Cloudflare Workers deployment workflow.",
      }),
      cliString("content-repository", {
        description: "External content repository (owner/repository).",
        valueName: "owner/repository",
      }),
      cliString("site-repository", {
        description: "Site repository (owner/repository).",
        valueName: "owner/repository",
      }),
    ],
    examples: [
      cliExample("riebeckite init my-site --preset starter"),
      cliExample("riebeckite init --list-presets"),
    ],
    async handler(context, input) {
      if (input.options.listPresets === true) {
        const { SCAFFOLD_PRESETS } = await import("create-riebeckite/scaffold");
        context.output.writeLine("Available presets:");
        context.output.writeLine();
        for (const preset of SCAFFOLD_PRESETS) {
          context.output.writeLine(`  ${preset.name}: ${preset.description}`);
        }
        return;
      }
      const scaffold = await import("create-riebeckite/scaffold");
      try {
        const presetName = input.options.preset;
        if (
          typeof presetName === "string" &&
          !scaffold.isScaffoldPresetName(presetName)
        ) {
          throw new Error(
            `Unknown preset: ${presetName}. Available presets: ${scaffold.SCAFFOLD_PRESETS.map((preset) => preset.name).join(", ")}.`,
          );
        }
        const { runInit } = await import("../commands/init.js");
        await runInit({
          directory: input.arguments.directory as string,
          force: input.options.force as boolean,
          preset:
            (presetName as
              | import("create-riebeckite/scaffold").ScaffoldPresetName
              | undefined) ?? scaffold.SCAFFOLD_DEFAULT_PRESET,
          ...(typeof input.options.features === "string"
            ? {
                features: scaffold.parseScaffoldFeatures(
                  input.options.features,
                ),
              }
            : {}),
          utilities:
            typeof input.options.utilities === "string"
              ? scaffold.parseScaffoldUtilities(input.options.utilities)
              : scaffold.SCAFFOLD_DEFAULT_UTILITIES,
          deployment: scaffold.scaffoldDeploymentFromFlags({
            githubActions: input.options.githubActions === true,
            cloudflareWorkers: input.options.cloudflareWorkers === true,
            ...(typeof input.options.contentRepository === "string"
              ? { contentRepository: input.options.contentRepository }
              : {}),
            ...(typeof input.options.siteRepository === "string"
              ? { siteRepository: input.options.siteRepository }
              : {}),
          }),
        });
      } catch (error) {
        if (error instanceof CliUsageError) throw error;
        throw new CliUsageError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
