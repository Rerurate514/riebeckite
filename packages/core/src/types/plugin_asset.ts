import type { ClientLifecycleScope } from "../client_lifecycle.js";
import type { JsonValue } from "./json_value.js";

export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  moduleSpecifier: string;
};

export type PluginRuntimeEntry<TOptions extends JsonValue = JsonValue> = {
  id: string;
  moduleSpecifier: string;
  exportName?: string;
  options?: TOptions;
};

export function createRuntimeEntry<TOptions extends JsonValue = JsonValue>(
  id: string,
  moduleSpecifier: string,
  exportName?: string,
  options?: TOptions,
): PluginRuntimeEntry<TOptions> {
  return {
    id,
    moduleSpecifier,
    ...(exportName === undefined ? {} : { exportName }),
    ...(options === undefined ? {} : { options }),
  };
}

export type ClientInitializerRoot = "page" | "document";

export type PluginClientEntry<TPublicConfig extends JsonValue = JsonValue> = {
  pluginName: string;
  moduleSpecifier: string;
  exportName?: string;
  scope?: ClientLifecycleScope;
  initializerArguments?: ClientInitializerArguments;
  presenceSelector?: string;
  root?: ClientInitializerRoot;
  runtimeEntries?: readonly PluginRuntimeEntry[];
  /**
   * Configuration intentionally made available to this browser entry.
   *
   * Plugin `options` are never inferred or copied here. Only this value is
   * included in client-facing output, so it must not contain secrets or other
   * private build-time options.
   */
  publicConfig?: TPublicConfig;
};

export type CreateClientEntryOptions<
  TPublicConfig extends JsonValue = JsonValue,
> = {
  moduleSpecifier: string;
  exportName?: string;
  publicConfig?: TPublicConfig;
  scope?: ClientLifecycleScope;
  initializerArguments?: ClientInitializerArguments;
  presenceSelector?: string;
  root?: ClientInitializerRoot;
  runtimeEntries?: readonly PluginRuntimeEntry[];
};

type ClientInitializerArguments = "config" | "root" | "context";

export function createStyleAsset(
  pluginName: string,
  moduleSpecifier: string,
): PluginAsset {
  return {
    pluginName,
    kind: "style",
    moduleSpecifier,
  };
}

export function createClientEntry<TPublicConfig extends JsonValue = JsonValue>(
  pluginName: string,
  options: CreateClientEntryOptions<TPublicConfig>,
): PluginClientEntry<TPublicConfig> {
  return {
    pluginName,
    moduleSpecifier: options.moduleSpecifier,
    ...(options.exportName === undefined
      ? {}
      : { exportName: options.exportName }),
    ...(options.publicConfig === undefined
      ? {}
      : { publicConfig: options.publicConfig }),
    ...(options.scope === undefined ? {} : { scope: options.scope }),
    ...(options.initializerArguments === undefined
      ? {}
      : { initializerArguments: options.initializerArguments }),
    ...(options.presenceSelector === undefined
      ? {}
      : { presenceSelector: options.presenceSelector }),
    ...(options.root === undefined ? {} : { root: options.root }),
    ...(options.runtimeEntries === undefined
      ? {}
      : { runtimeEntries: options.runtimeEntries }),
  };
}

/**
 * Serializes explicitly registered client configuration for code generation.
 * Rejecting non-JSON values prevents generated client modules from silently
 * dropping or changing configuration supplied through an untyped plugin.
 */
export function serializePublicClientConfig(value: unknown): string {
  assertJsonValue(value, new Set<object>());
  return JSON.stringify(value);
}

function assertJsonValue(
  value: unknown,
  ancestors: Set<object>,
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    throw new TypeError("Public client configuration numbers must be finite.");
  }
  if (typeof value !== "object") {
    throw new TypeError(
      "Public client configuration must be JSON-serializable.",
    );
  }
  if (ancestors.has(value)) {
    throw new TypeError("Public client configuration must not contain cycles.");
  }

  const prototype = Object.getPrototypeOf(value);
  if (
    prototype !== Object.prototype &&
    prototype !== null &&
    !Array.isArray(value)
  ) {
    throw new TypeError(
      "Public client configuration must contain only plain objects.",
    );
  }

  ancestors.add(value);
  for (const item of Array.isArray(value) ? value : Object.values(value)) {
    assertJsonValue(item, ancestors);
  }
  ancestors.delete(value);
}
