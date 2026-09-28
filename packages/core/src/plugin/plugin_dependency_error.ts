export type PluginDependencyErrorKind =
  | "missing-capability"
  | "duplicate-provider"
  | "cycle";

export class PluginDependencyError extends Error {
  readonly kind: PluginDependencyErrorKind;
  readonly pluginName?: string;
  readonly capability?: string;
  readonly pluginNames: readonly string[];
  readonly chain: readonly string[];

  constructor(input: {
    kind: PluginDependencyErrorKind;
    pluginName?: string;
    capability?: string;
    pluginNames?: readonly string[];
    chain?: readonly string[];
  }) {
    super(createMessage(input));
    this.name = "PluginDependencyError";
    this.kind = input.kind;
    this.pluginName = input.pluginName;
    this.capability = input.capability;
    this.pluginNames = input.pluginNames ?? [];
    this.chain = input.chain ?? [];
  }
}

function createMessage(input: {
  kind: PluginDependencyErrorKind;
  pluginName?: string;
  capability?: string;
  pluginNames?: readonly string[];
  chain?: readonly string[];
}): string {
  if (input.kind === "missing-capability") {
    return `Plugin "${input.pluginName}" requires missing capability "${input.capability}"`;
  }

  if (input.kind === "duplicate-provider") {
    return [
      `Capability "${input.capability}" is provided by multiple plugins:`,
      ...(input.pluginNames ?? []).map((name) => `- ${name}`),
    ].join("\n");
  }

  return [
    `Plugin dependency cycle detected for capability "${input.capability}":`,
    (input.chain ?? []).join(" -> "),
  ].join("\n");
}
