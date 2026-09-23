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
