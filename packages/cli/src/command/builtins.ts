import {
  type CliCommandDefinition,
  type CliCommandRegistry,
  createCliCommandRegistry,
  registerCliCommand,
} from "@riebeckite/core";
import {
  bridgeApproveCommand,
  contentCommand,
} from "./builtin_commands_content.js";
import {
  createCommand,
  createPluginCommand,
  createSiteCommand,
} from "./builtin_commands_create.js";
import {
  createComponentCommand,
  createPageTypeCommand,
  createThemeCommand,
} from "./builtin_commands_create_scaffold.js";
import {
  deployDomainCommand,
  deployGroupCommand,
  deploySetupCommand,
  deployWorkflowCommand,
} from "./builtin_commands_deploy.js";
import { completionCommand, helpCommand } from "./builtin_commands_help.js";
import { initCommand } from "./builtin_commands_init.js";
import {
  inspectApiCommand,
  inspectAssetsCommand,
  inspectBuildCommand,
  inspectCommand,
  inspectConfigCommand,
  inspectContentCommand,
  inspectGraphCommand,
  inspectPluginsCommand,
  inspectProvenanceCommand,
} from "./builtin_commands_inspect.js";
import {
  MIGRATE_ACTIONS,
  migrateActionCommand,
  migrateGroupCommand,
} from "./builtin_commands_migrate.js";
import {
  buildCommand,
  checkCommand,
  cleanCommand,
  devCommand,
  doctorCommand,
  profileCommand,
  upgradeCommand,
} from "./builtin_commands_ops.js";
import {
  PUBLISH_ACTIONS,
  publishActionCommand,
  publishGroupCommand,
} from "./builtin_commands_publish.js";
import {
  pluginDevCommand,
  pluginGroupCommand,
  pluginVerifyCommand,
  themeGroupCommand,
  themePreviewCommand,
} from "./builtin_commands_theme_plugin.js";

export function createBuiltinRegistry(): CliCommandRegistry {
  return definitions().reduce(
    (registry, definition) => registerCliCommand(registry, definition),
    createCliCommandRegistry(),
  );
}

function definitions(): readonly CliCommandDefinition[] {
  return [
    devCommand(),
    buildCommand(),
    cleanCommand(),
    checkCommand(),
    doctorCommand(),
    profileCommand(),
    upgradeCommand(),
    initCommand(),
    inspectCommand(),
    inspectConfigCommand(),
    inspectPluginsCommand(),
    inspectContentCommand(),
    inspectGraphCommand(),
    inspectBuildCommand(),
    inspectAssetsCommand(),
    inspectProvenanceCommand(),
    inspectApiCommand(),
    createCommand(),
    createSiteCommand(),
    createPluginCommand(),
    createThemeCommand(),
    createPageTypeCommand(),
    createComponentCommand(),
    themeGroupCommand(),
    themePreviewCommand(),
    pluginGroupCommand(),
    pluginDevCommand(),
    pluginVerifyCommand(),
    contentCommand(),
    bridgeApproveCommand(),
    migrateGroupCommand(),
    ...MIGRATE_ACTIONS.map(migrateActionCommand),
    publishGroupCommand(),
    ...PUBLISH_ACTIONS.map(publishActionCommand),
    deployGroupCommand(),
    deploySetupCommand(),
    deployWorkflowCommand(),
    deployDomainCommand(),
    helpCommand(),
    completionCommand(),
  ];
}
