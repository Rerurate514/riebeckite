export type PluginAssetKind = "style" | "script";

export type PluginAsset = {
  pluginName: string;
  kind: PluginAssetKind;
  moduleSpecifier: string;
};

export type PluginClientEntry = {
  pluginName: string;
  moduleSpecifier: string;
  exportName?: string;
};

export function createStyleAsset(pluginName: string): PluginAsset {
  return {
    pluginName,
    kind: "style",
    moduleSpecifier: `@riebeckite/plugin-${pluginName}/style.css`,
  };
}

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
