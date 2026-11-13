import type { JsonValue } from "./types/json_value.js";
import { serializePublicClientConfig } from "./types/plugin_asset.js";
import type {
  PluginMarkdownComponent,
  PluginMarkdownComponentResolveContext,
} from "./types/plugin_component.js";

export type PreparedMarkdownComponent = {
  readonly name: string;
  readonly props: string;
  readonly content: string;
  readonly interactive: boolean;
};

const EMPTY_CONTEXT: PluginMarkdownComponentResolveContext = {
  resolveAssetUrl: () => null,
};

export async function prepareMarkdownComponent(
  component: PluginMarkdownComponent,
  props: Record<string, JsonValue>,
  context: PluginMarkdownComponentResolveContext = EMPTY_CONTEXT,
): Promise<PreparedMarkdownComponent> {
  const parsed = component.parseProps?.(props) ?? props;
  const resolved = component.resolveProps
    ? await component.resolveProps(parsed, context)
    : parsed;
  return {
    name: component.name,
    props: serializePublicClientConfig(resolved),
    content: await component.render(resolved),
    interactive: component.client !== undefined,
  };
}
