import { RuntimeStateError } from "./errors.js";
import { RuntimeInstance } from "./instance.js";
import type {
  InteractiveRuntime,
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeInstanceOptions,
  RuntimeKind,
  RuntimeLimits,
} from "./types.js";

export class InteractiveRuntimeRegistry {
  private readonly definitions = new Map<
    string,
    RuntimeDefinition<unknown, unknown>
  >();

  register<TInput, TOutput>(
    definition: RuntimeDefinition<TInput, TOutput>,
  ): void {
    if (this.definitions.has(definition.id)) {
      throw new RuntimeStateError(
        `Interactive runtime "${definition.id}" is already registered.`,
      );
    }
    this.definitions.set(
      definition.id,
      definition as RuntimeDefinition<unknown, unknown>,
    );
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  get<TInput = unknown, TOutput = unknown>(
    id: string,
  ): RuntimeDefinition<TInput, TOutput> {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new RuntimeStateError(
        `Interactive runtime "${id}" is not registered.`,
      );
    }
    return definition as RuntimeDefinition<TInput, TOutput>;
  }

  get ids(): readonly string[] {
    return [...this.definitions.keys()];
  }

  create<TInput = unknown, TOutput = unknown>(
    id: string,
    options: RuntimeInstanceOptions = {},
  ): InteractiveRuntime<TInput, TOutput> {
    return new RuntimeInstance(this.get<TInput, TOutput>(id), options);
  }
}

export function defineInteractiveRuntime<TInput, TOutput>(definition: {
  readonly id: string;
  readonly kind: RuntimeKind;
  readonly capabilities?: readonly RuntimeCapability[];
  readonly limits?: RuntimeLimits;
  readonly create: RuntimeDefinition<TInput, TOutput>["create"];
}): RuntimeDefinition<TInput, TOutput> {
  if (!definition.id.trim()) {
    throw new RuntimeStateError("Interactive runtime id must not be empty.");
  }
  const capabilities = [...(definition.capabilities ?? [])];
  if (new Set(capabilities).size !== capabilities.length) {
    throw new RuntimeStateError(
      `Interactive runtime "${definition.id}" declares duplicate capabilities.`,
    );
  }
  return Object.freeze({
    id: definition.id,
    kind: definition.kind,
    capabilities: Object.freeze(capabilities),
    limits: Object.freeze({ ...(definition.limits ?? {}) }),
    create: definition.create,
  });
}

export function createInteractiveRuntime<TInput, TOutput>(
  definition: RuntimeDefinition<TInput, TOutput>,
  options: RuntimeInstanceOptions = {},
): InteractiveRuntime<TInput, TOutput> {
  return new RuntimeInstance(definition, options);
}
