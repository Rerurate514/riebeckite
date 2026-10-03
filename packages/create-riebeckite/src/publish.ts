import type {
  PackageManagerCommand,
  PackageManagerCommands,
} from "./package-manager.js";
import type { CommandRunner } from "./run-commands.js";

export type DeploymentPhase = "install" | "build" | "deploy";

export class DeploymentFailure extends Error {
  readonly phase: DeploymentPhase;

  constructor(phase: DeploymentPhase, message: string) {
    super(message);
    this.name = "DeploymentFailure";
    this.phase = phase;
  }
}

export async function installDependencies(
  directory: string,
  commands: PackageManagerCommands,
  run: CommandRunner,
): Promise<void> {
  await runCommand("install", commands.install, directory, run);
}

export async function buildAndDeploy(
  directory: string,
  commands: PackageManagerCommands,
  run: CommandRunner,
): Promise<void> {
  await runCommand("build", commands.build, directory, run);
  await runCommand("deploy", commands.deploy, directory, run);
}

export function formatCloudflareNextSteps(
  relativeDirectory: string,
  commands: PackageManagerCommands,
): string {
  const lines = ["Next steps:"];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  lines.push(`  ${commands.build.label}`);
  lines.push(`  ${commands.deploy.label}`);
  return lines.join("\n");
}

export function formatDeploymentFailure(
  relativeDirectory: string,
  commands: PackageManagerCommands,
  failure: DeploymentFailure,
): string {
  const lines = [
    "Project created successfully.",
    deploymentFailureSummary(failure.phase),
    failure.message,
    "You can retry with:",
  ];
  if (relativeDirectory !== ".") {
    lines.push(`  cd ${relativeDirectory}`);
  }
  if (failure.phase === "install") {
    lines.push(`  ${commands.install.label}`);
  }
  lines.push(`  ${commands.build.label}`);
  lines.push(`  ${commands.deploy.label}`);
  return lines.join("\n");
}

function deploymentFailureSummary(phase: DeploymentPhase): string {
  if (phase === "install") return "Installing dependencies failed.";
  if (phase === "build") return "Build failed.";
  return "Deployment failed.";
}

async function runCommand(
  phase: DeploymentPhase,
  command: PackageManagerCommand,
  directory: string,
  run: CommandRunner,
): Promise<void> {
  let exitCode: number;
  try {
    exitCode = await run(command.command, command.args, directory);
  } catch (error) {
    throw new DeploymentFailure(
      phase,
      error instanceof Error ? error.message : String(error),
    );
  }
  if (exitCode !== 0) {
    throw new DeploymentFailure(
      phase,
      `${command.label} exited with code ${exitCode}.`,
    );
  }
}
