import type { JsonValue } from "./json_value.js";

export type PluginDataHelper<Input, Model> = (
  input: Readonly<Input>,
) => Model | Promise<Model>;

export type PluginComponent<Props> = (props: Readonly<Props>) => unknown;

export type PluginComponentClient = {
  moduleSpecifier: string;
  exportName?: string;
};

export type PluginComponentResolveContext = {
  readonly sourceSlug?: string;
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
    context: PluginComponentResolveContext,
  ): Props | Promise<Props>;
  client?: PluginComponentClient;
};

export function definePluginComponent<Props extends Record<string, JsonValue>>(
  component: PluginMarkdownComponent<Props>,
): PluginMarkdownComponent<Props> {
  return component;
}
