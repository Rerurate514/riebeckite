import type {
  CliCommandDefinition,
  CliCommandNode,
  CliCommandRegistration,
  CliCommandRegistry,
  CliCommandSource,
  PluginCliExtension,
} from "./types.js";

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export class CliCommandConflictError extends Error {
  readonly code = "CLI_COMMAND_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "CliCommandConflictError";
  }
}

type RegisterOptions = {
  readonly source?: CliCommandSource;
  readonly pluginId?: string;
  readonly namespace?: string;
};

export function createCliCommandRegistry(
  registrations: readonly CliCommandRegistration[] = [],
): CliCommandRegistry {
  return buildRegistry(registrations);
}

export function registerCliCommand(
  registry: CliCommandRegistry,
  definition: CliCommandDefinition,
  options: RegisterOptions = {},
): CliCommandRegistry {
  const namespace = options.namespace;
  const effective = namespace
    ? { ...definition, id: `${namespace} ${definition.id}` }
    : definition;
  const registration: CliCommandRegistration = {
    command: effective,
    source: options.source ?? "builtin",
    ...(options.pluginId === undefined ? {} : { pluginId: options.pluginId }),
    ...(namespace === undefined ? {} : { namespace }),
  };
  return buildRegistry([...registry.registrations, registration]);
}

export function registerPluginCliExtension(
  registry: CliCommandRegistry,
  pluginId: string,
  extension: PluginCliExtension,
): CliCommandRegistry {
  const namespace = extension.namespace ?? pluginId;
  assertName(namespace, `plugin ${pluginId} command namespace`);
  let next = registry;
  for (const command of extension.commands) {
    next = registerCliCommand(next, command, {
      source: "plugin",
      pluginId,
      namespace,
    });
  }
  return next;
}

export function findCommandByPath(
  registry: CliCommandRegistry,
  path: string,
): CliCommandRegistration | undefined {
  const normalized = normalizeCommandId(path);
  return registry.registrations.find(
    (registration) => registration.command.id === normalized,
  );
}

export function commandPathSegments(id: string): readonly string[] {
  return normalizeCommandId(id).split(" ");
}

export function normalizeCommandId(id: string): string {
  return id.trim().replace(/\s+/g, " ");
}

function buildRegistry(
  registrations: readonly CliCommandRegistration[],
): CliCommandRegistry {
  const ids = new Map<string, CliCommandRegistration>();
  const aliases = new Map<string, string>();
  const namespaces = new Map<string, string>();
  const pluginIds = new Map<string, string>();

  for (const registration of registrations) {
    const id = normalizeCommandId(registration.command.id);
    if (!id) {
      throw new CliCommandConflictError("A command must have a non-empty id.");
    }
    assertCommandId(id);
    if (ids.has(id)) {
      throw new CliCommandConflictError(
        `Duplicate command id: ${id}${describeSource(registration)}.`,
      );
    }
    ids.set(id, { ...registration, command: { ...registration.command, id } });

    if (registration.namespace !== undefined) {
      assertName(registration.namespace, `command namespace for ${id}`);
      if (!id.startsWith(`${registration.namespace} `)) {
        throw new CliCommandConflictError(
          `Plugin command ${id} must be namespaced under ${registration.namespace}.`,
        );
      }
      const previousPlugin = namespaces.get(registration.namespace);
      if (
        previousPlugin !== undefined &&
        previousPlugin !== registration.pluginId
      ) {
        throw new CliCommandConflictError(
          `Command namespace ${registration.namespace} is used by both ${previousPlugin} and ${registration.pluginId}.`,
        );
      }
      namespaces.set(registration.namespace, registration.pluginId ?? "");
    }

    if (registration.pluginId !== undefined) {
      const previousNamespace = pluginIds.get(registration.pluginId);
      if (
        previousNamespace !== undefined &&
        previousNamespace !== registration.namespace
      ) {
        throw new CliCommandConflictError(
          `Plugin ${registration.pluginId} registered commands under multiple namespaces.`,
        );
      }
      pluginIds.set(registration.pluginId, registration.namespace ?? "");
    }
  }

  for (const registration of registrations) {
    for (const alias of registration.command.aliases ?? []) {
      const normalized = normalizeCommandId(alias);
      assertCommandId(normalized, "alias");
      if (
        registration.namespace !== undefined &&
        commandPathSegments(normalized)[0] !== registration.namespace
      ) {
        throw new CliCommandConflictError(
          `Plugin command alias ${normalized} must be namespaced under ${registration.namespace}.`,
        );
      }
      if (ids.has(normalized)) {
        throw new CliCommandConflictError(
          `Command alias ${normalized} conflicts with a command id.`,
        );
      }
      const owner = aliases.get(normalized);
      if (owner !== undefined && owner !== registration.command.id) {
        throw new CliCommandConflictError(
          `Command alias ${normalized} is registered by both ${owner} and ${registration.command.id}.`,
        );
      }
      aliases.set(normalized, normalizeCommandId(registration.command.id));
    }
  }

  for (const namespace of namespaces.keys()) {
    for (const [id, registration] of ids) {
      if (registration.namespace === namespace) continue;
      if (commandPathSegments(id)[0] === namespace) {
        throw new CliCommandConflictError(
          `Plugin command namespace ${namespace} conflicts with command ${id}.`,
        );
      }
    }
    for (const alias of aliases.keys()) {
      if (commandPathSegments(alias)[0] === namespace) {
        throw new CliCommandConflictError(
          `Plugin command namespace ${namespace} conflicts with alias ${alias}.`,
        );
      }
    }
  }

  return {
    registrations: [...ids.values()],
    nodes: buildNodes([...ids.values()]),
    aliases,
    namespaces,
  };
}

function buildNodes(
  registrations: readonly CliCommandRegistration[],
): readonly CliCommandNode[] {
  type MutableNode = {
    name: string;
    path: string;
    command?: CliCommandRegistration;
    children: Map<string, MutableNode>;
  };
  const roots = new Map<string, MutableNode>();

  for (const registration of registrations) {
    const segments = commandPathSegments(registration.command.id);
    let level = roots;
    let path = "";
    let node: MutableNode | undefined;
    for (const segment of segments) {
      path = path ? `${path} ${segment}` : segment;
      node = level.get(segment);
      if (!node) {
        node = { name: segment, path, children: new Map() };
        level.set(segment, node);
      }
      level = node.children;
    }
    if (node) node.command = registration;
  }

  const toNodes = (level: ReadonlyMap<string, MutableNode>): CliCommandNode[] =>
    [...level.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((node) => ({
        name: node.name,
        path: node.path,
        ...(node.command === undefined ? {} : { command: node.command }),
        children: toNodes(node.children),
      }));

  return toNodes(roots);
}

function assertCommandId(id: string, label = "command id"): void {
  for (const segment of commandPathSegments(id)) {
    assertName(segment, label);
  }
}

function assertName(value: string, label: string): void {
  if (!NAME_PATTERN.test(value)) {
    throw new CliCommandConflictError(
      `Invalid ${label}: ${value}. Names must be lowercase kebab-case.`,
    );
  }
}

function describeSource(registration: CliCommandRegistration): string {
  if (registration.pluginId) return ` from plugin ${registration.pluginId}`;
  return registration.source === "builtin" ? " (built-in)" : "";
}
