import {
  type CliCommandRegistry,
  registerPluginCliExtension,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";

export type PluginCommandFailure = {
  readonly pluginId: string;
  readonly error: unknown;
};

export type PluginCommandDiscovery = {
  readonly registry: CliCommandRegistry;
  readonly failures: readonly PluginCommandFailure[];
};

export function discoverPluginCommands(
  registry: CliCommandRegistry,
  project: RiebeckiteProject,
): PluginCommandDiscovery {
  if (registry.registrations.some((entry) => entry.source === "plugin")) {
    return { registry, failures: [] };
  }

  let current = registry;
  const failures: PluginCommandFailure[] = [];
  for (const plugin of project.config.plugins) {
    try {
      const extension = plugin.cli;
      if (!extension) continue;
      current = registerPluginCliExtension(current, plugin.name, extension);
    } catch (error) {
      failures.push({ pluginId: plugin.name, error });
    }
  }
  return { registry: current, failures };
}

export function describePluginCommandFailure(
  failure: PluginCommandFailure,
): string {
  const message =
    failure.error instanceof Error
      ? failure.error.message
      : String(failure.error);
  return `Plugin ${failure.pluginId} could not register CLI commands: ${message}`;
}
