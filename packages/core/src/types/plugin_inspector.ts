import type { PluginContext } from "./plugin_context.js";

export type InspectorText =
  | string
  | { readonly en: string; readonly ja?: string };

export type InspectorTabData =
  | {
      readonly kind: "key-value";
      readonly items: readonly {
        readonly key: InspectorText;
        readonly value: unknown;
      }[];
    }
  | {
      readonly kind: "table";
      readonly columns: readonly InspectorText[];
      readonly rows: readonly (readonly unknown[])[];
    }
  | { readonly kind: "json"; readonly value: unknown }
  | { readonly kind: "error"; readonly message: string };

export type PluginInspectorTab = {
  readonly id: string;
  readonly title: InspectorText;
  readonly description?: InspectorText;
  readonly order?: number;
  readonly collect?: (
    context: PluginContext,
  ) => InspectorTabData | Promise<InspectorTabData>;
  readonly client?: string;
};

export type PluginInspectorExtension = {
  readonly apiVersion: 1;
  readonly tabs: readonly PluginInspectorTab[];
};

export type InspectorTabSnapshot = {
  readonly plugin: string;
  readonly id: string;
  readonly title: InspectorText;
  readonly description?: InspectorText;
  readonly order: number;
  readonly client?: string;
  readonly data?: InspectorTabData;
  readonly error?: string;
};
