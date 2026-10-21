import type { JsonValue } from "./json_value.js";
import type { ClientLifecycleScope } from "../client_lifecycle.js";

export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  moduleSpecifier: string;
};

export type PluginClientEntry<TPublicConfig extends JsonValue = JsonValue> = {
  pluginName: string;
  moduleSpecifier: string;
  exportName?: string;
  scope?: ClientLifecycleScope;
  initializerArguments?: ClientInitializerArguments;
  /**
   * Configuration intentionally made available to this browser entry.
   *
   * Plugin `options` are never inferred or copied here. Only this value is
   * included in client-facing output, so it must not contain secrets or other
   * private build-time options.
   */
  publicConfig?: TPublicConfig;
};

export type ClientInitializerArguments = "config" | "root" | "context";

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

export function createClientEntry<TPublicConfig extends JsonValue>(
  pluginName: string,
  moduleSpecifier: string,
  exportName?: string,
  publicConfig?: TPublicConfig,
  scope?: ClientLifecycleScope,
  initializerArguments?: ClientInitializerArguments,
): PluginClientEntry<TPublicConfig> {
  return {
    pluginName,
    moduleSpecifier,
    ...(exportName === undefined ? {} : { exportName }),
    ...(publicConfig === undefined ? {} : { publicConfig }),
    ...(scope === undefined ? {} : { scope }),
    ...(initializerArguments === undefined ? {} : { initializerArguments }),
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
