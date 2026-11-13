import type { ContentManifest } from "./content_manifest.js";
import type { Diagnostic } from "./diagnostic.js";
import type { JsonValue } from "./json_value.js";

export type PluginDataHelper<Input, Model> = (
  input: Readonly<Input>,
) => Model | Promise<Model>;

export type PluginSiteComponent<Props> = (props: Readonly<Props>) => unknown;

export type PluginMarkdownComponentClient = {
  moduleSpecifier: string;
  exportName?: string;
};

export type PluginMarkdownComponentResolveContext = {
  readonly sourceSlug?: string;
  readonly manifest?: ContentManifest;
  readonly diagnostics?: Diagnostic[];
  resolveAssetUrl(
    input: string,
  ): { readonly path: string; readonly url: string } | null;
};

export type PluginMarkdownComponent<
  Props extends Record<string, JsonValue> = Record<string, JsonValue>,
> = {
  name: string;
  render(props: Readonly<Props>): string | Promise<string>;
  parseProps?(props: Record<string, JsonValue>): Props;
  resolveProps?(
    props: Readonly<Props>,
    context: PluginMarkdownComponentResolveContext,
  ): Props | Promise<Props>;
  deferUntilManifest?: boolean;
  renderError?(
    error: unknown,
    props: Readonly<Props>,
  ): string | Promise<string>;
  client?: PluginMarkdownComponentClient;
};

export type PluginHastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: PluginHastNode[];
  value?: string;
  [key: string]: unknown;
};

export type PluginHastTransform = {
  name: string;
  match(node: PluginHastNode): boolean;
  render(
    input: {
      readonly node: PluginHastNode;
      readonly html: string;
      readonly children: string;
    },
    context: PluginMarkdownComponentResolveContext,
  ): string | Promise<string>;
};

export function defineHastTransform(
  transform: PluginHastTransform,
): PluginHastTransform {
  return transform;
}

export function defineMarkdownComponent<
  Props extends Record<string, JsonValue>,
>(component: PluginMarkdownComponent<Props>): PluginMarkdownComponent<Props> {
  return component;
}
