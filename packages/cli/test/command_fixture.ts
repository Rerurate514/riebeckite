import {
  type CliCommandInput,
  type CliCommandResolution,
  resolveCliCommand,
} from "@riebeckite/core";
import { createBuiltinRegistry } from "../src/command/builtins.js";

export type ResolvedCommand = Extract<
  CliCommandResolution,
  { kind: "command" }
>;

export function resolveCommand(argv: readonly string[]): ResolvedCommand {
  const resolution = resolveCliCommand(createBuiltinRegistry(), argv);
  if (resolution.kind !== "command") {
    throw new Error(
      `Expected a command resolution, received ${resolution.kind}.`,
    );
  }
  return resolution;
}

export function resolveInput(argv: readonly string[]): CliCommandInput {
  return resolveCommand(argv).input;
}
