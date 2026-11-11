import type { JsonValue } from "./types/json_value.js";
import { serializePublicClientConfig } from "./types/plugin_asset.js";
import type { PluginMarkdownComponent } from "./types/plugin_component.js";

export type PreparedPluginComponent = {
  readonly name: string;
  readonly props: string;
  readonly content: string;
  readonly interactive: boolean;
};

export async function preparePluginComponent(
  component: PluginMarkdownComponent,
  props: Record<string, JsonValue>,
): Promise<PreparedPluginComponent> {
  const resolved = component.parseProps?.(props) ?? props;
  return {
    name: component.name,
    props: serializePublicClientConfig(resolved),
    content: await component.render(resolved),
    interactive: component.client !== undefined,
  };
}
