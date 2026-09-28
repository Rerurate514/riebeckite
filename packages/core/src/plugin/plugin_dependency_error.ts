export type PluginDependencyErrorKind =
  | "missing-capability"
  | "duplicate-provider"
  | "self-dependency"
  | "invalid-capability"
  | "cycle";

export type CapabilityDeclaration = "provides" | "requires" | "optional";

export class PluginDependencyError extends Error {
  readonly kind: PluginDependencyErrorKind;
  readonly pluginName?: string;
  readonly capability?: string;
  readonly declaration?: CapabilityDeclaration;
  readonly pluginNames: readonly string[];
  readonly chain: readonly string[];
  readonly availableCapabilities: readonly string[];

  constructor(input: {
    kind: PluginDependencyErrorKind;
    pluginName?: string;
    capability?: string;
    declaration?: CapabilityDeclaration;
    pluginNames?: readonly string[];
    chain?: readonly string[];
    availableCapabilities?: readonly string[];
  }) {
    super(createMessage(input));
    this.name = "PluginDependencyError";
    this.kind = input.kind;
    this.pluginName = input.pluginName;
    this.capability = input.capability;
    this.declaration = input.declaration;
    this.pluginNames = input.pluginNames ?? [];
    this.chain = input.chain ?? [];
    this.availableCapabilities = input.availableCapabilities ?? [];
  }
}

function createMessage(input: {
  kind: PluginDependencyErrorKind;
  pluginName?: string;
  capability?: string;
  declaration?: CapabilityDeclaration;
  pluginNames?: readonly string[];
  chain?: readonly string[];
  availableCapabilities?: readonly string[];
}): string {
  if (input.kind === "missing-capability") {
    return [
      `Plugin "${input.pluginName}" requires missing capability "${input.capability}".`,
      formatAvailableCapabilities(input.availableCapabilities),
    ].join("\n");
  }

  if (input.kind === "self-dependency") {
    return `Plugin "${input.pluginName}" requires capability "${input.capability}" that it also provides.`;
  }

  if (input.kind === "invalid-capability") {
    return `Plugin "${input.pluginName}" declares an empty or invalid capability in "${input.declaration}".`;
  }

  if (input.kind === "duplicate-provider") {
    return [
      `Capability "${input.capability}" is provided by multiple plugins:`,
      ...(input.pluginNames ?? []).map((name) => `- ${name}`),
      "A capability must have exactly one provider.",
    ].join("\n");
  }

  return [
    `Plugin dependency cycle detected for capability "${input.capability}":`,
    (input.chain ?? []).join(" -> "),
  ].join("\n");
}

function formatAvailableCapabilities(
  capabilities: readonly string[] | undefined,
): string {
  if (!capabilities || capabilities.length === 0) {
    return "No plugin declares a provided capability.";
  }
  return [
    "Available capabilities:",
    ...[...capabilities].sort().map((capability) => `- ${capability}`),
  ].join("\n");
}
