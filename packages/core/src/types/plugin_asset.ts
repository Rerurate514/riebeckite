export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  /**
   * ESM/CSS module specifier resolved by the host bundler.
   * Example: "@riebeckite/plugin-lightbox/style.css".
   */
  moduleSpecifier: string;
};

export type PluginClientEntry = {
  pluginName: string;
  /** ESM module specifier resolved and bundled by the host bundler. */
  moduleSpecifier: string;
  /** Exported initializer name. Defaults to the module default export. */
  exportName?: string;
};

/**
 * Creates the conventional stylesheet declaration for a Riebeckite plugin.
 * Plugin packages expose this stylesheet as `./style.css`.
 */
export function createStyleAsset(pluginName: string): PluginAsset {
  return {
    pluginName,
    kind: "style",
    moduleSpecifier: `@riebeckite/plugin-${pluginName}/style.css`,
  };
}

/**
 * Creates the conventional browser initializer declaration for a Riebeckite plugin.
 * Plugin packages expose this initializer module as `./client`.
 */
export function createClientEntry(
  pluginName: string,
  exportName?: string,
): PluginClientEntry {
  return {
    pluginName,
    moduleSpecifier: `@riebeckite/plugin-${pluginName}/client`,
    ...(exportName === undefined ? {} : { exportName }),
  };
}
