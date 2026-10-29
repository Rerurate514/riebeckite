import { SCAFFOLD_PRESETS } from "create-riebeckite/scaffold";
import { resolveRiebeckiteProject } from "./application_root.js";
import type { Command } from "./cli.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runClean } from "./commands/clean.js";
import {
  createHelp,
  runCreateSite,
  runInteractiveCreate,
} from "./commands/create.js";
import {
  runCreateComponent,
  runInteractiveCreateComponent,
} from "./commands/create_component.js";
import {
  runCreatePageType,
  runInteractiveCreatePageType,
} from "./commands/create_page_type.js";
import {
  runCreatePlugin,
  runInteractiveCreatePlugin,
} from "./commands/create_plugin.js";
import {
  runCreateTheme,
  runInteractiveCreateTheme,
} from "./commands/create_theme.js";
import { runDeploy } from "./commands/deploy.js";
import { runDeployDomain } from "./commands/deploy_domain.js";
import { runDeploySetup } from "./commands/deploy_setup.js";
import { runDev } from "./commands/dev.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runInspect } from "./commands/inspect.js";
import { runPluginDev } from "./commands/plugin_dev.js";
import { runPluginVerify } from "./commands/plugin_verify.js";
import { runProfile } from "./commands/profile.js";
import { runThemePreview } from "./commands/theme_preview.js";
import { runUpgradeCheck } from "./commands/upgrade.js";
import { themeTemplateRegistry } from "./theme_generator/registry.js";

export async function runCommand(command: Command): Promise<void> {
  if (command.name === "init") {
    if (command.listPresets) return printPresets();
    return runInit(command);
  }
  if (command.name === "create-help") return console.log(createHelp());
  if (command.name === "create-interactive") return runInteractiveCreate();
  if (command.name === "create-site") return runCreateSite(command.arguments);
  if (command.name === "create-plugin") {
    return runCreatePlugin({
      name: command.pluginName,
      directory: command.directory,
      features: command.features,
      tests: command.tests,
      documentation: command.documentation,
      register: command.register,
    });
  }
  if (command.name === "create-plugin-interactive")
    return runInteractiveCreatePlugin();
  if (command.name === "create-theme-list") return printThemeTemplates();
  if (command.name === "create-theme") {
    return runCreateTheme({
      name: command.themeName,
      directory: command.directory,
      template: command.template,
      features: command.features,
      darkMode: command.darkMode,
      tests: command.tests,
      documentation: command.documentation,
      register: command.register,
    });
  }
  if (command.name === "create-theme-interactive")
    return runInteractiveCreateTheme();
  if (command.name === "create-page-type")
    return runCreatePageType(command.options);
  if (command.name === "create-page-type-interactive")
    return runInteractiveCreatePageType();
  if (command.name === "create-component")
    return runCreateComponent(command.options);
  if (command.name === "create-component-interactive")
    return runInteractiveCreateComponent();
  if (command.name === "theme-preview")
    return runThemePreview({
      name: command.themeName,
      port: command.port,
      open: command.open,
    });
  if (command.name === "plugin-dev")
    return runPluginDev({
      pluginPath: command.pluginPath,
      port: command.port,
      open: command.open,
    });
  if (command.name === "plugin-verify") {
    if (!runPluginVerify(command)) process.exitCode = 1;
    return;
  }

  const project = await resolveRiebeckiteProject(process.cwd());
  if (command.name === "dev") return runDev(project);
  if (command.name === "build")
    return runBuild(project, { full: command.full });
  if (command.name === "clean")
    return runClean(project, { scope: command.scope });
  if (command.name === "deploy")
    return runDeploy(project, { dryRun: command.dryRun });
  if (command.name === "deploy-setup") return runDeploySetup(project);
  if (command.name === "deploy-domain") return runDeployDomain(project);
  if (command.name === "doctor") {
    if (!(await runDoctorCommand(project, command))) process.exitCode = 1;
    return;
  }
  if (command.name === "profile")
    return runProfile(project, { full: command.full });
  if (command.name === "inspect") return runInspect(project, command);
  if (command.name === "upgrade") {
    if (!(await runUpgradeCheck(project, command)) && process.exitCode !== 130)
      process.exitCode = 1;
    return;
  }
  if (!(await runCheck(project))) process.exitCode = 1;
}

function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const preset of SCAFFOLD_PRESETS)
    console.log(`  ${preset.name}: ${preset.description}`);
}

function printThemeTemplates(): void {
  for (const template of Object.values(themeTemplateRegistry))
    console.log(`${template.id}: ${template.description}`);
}
