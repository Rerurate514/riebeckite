import type { RiebeckitePlugin } from "@riebeckite/core";

export type PreviewFixture = {
  readonly id: string;
  readonly title: string;
  readonly markdown: string;
};

export type PreviewPluginAvailability = "browser" | "node" | "unsupported";

export type PreviewPlugin<TOptions = unknown> = {
  readonly id: string;
  readonly title: string;
  readonly availability: PreviewPluginAvailability;
  readonly fixtures: readonly PreviewFixture[];
  create(options: TOptions | undefined): RiebeckitePlugin<TOptions>;
};

export type PreviewRegistry = {
  readonly fixtures: readonly PreviewFixture[];
  readonly plugins: readonly PreviewPlugin[];
  fixture(id: string): PreviewFixture | undefined;
  plugin(id: string): PreviewPlugin | undefined;
};

export function definePluginPreview<TOptions>(
  preview: PreviewPlugin<TOptions>,
): PreviewPlugin<TOptions> {
  return preview;
}

export function createPreviewRegistry(input: {
  readonly fixtures?: readonly PreviewFixture[];
  readonly plugins?: readonly PreviewPlugin[];
}): PreviewRegistry {
  const fixtures = [...(input.fixtures ?? [])];
  const plugins = [...(input.plugins ?? [])];
  assertUniqueIds(fixtures, "fixture");
  assertUniqueIds(plugins, "plugin");

  for (const plugin of plugins) {
    assertUniqueIds(plugin.fixtures, `fixture for plugin "${plugin.id}"`);
  }

  return {
    fixtures,
    plugins,
    fixture: (id) => fixtures.find((fixture) => fixture.id === id),
    plugin: (id) => plugins.find((plugin) => plugin.id === id),
  };
}

function assertUniqueIds(
  values: readonly { readonly id: string }[],
  subject: string,
): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (value.id.trim() === "") throw new Error(`A ${subject} ID is required.`);
    if (ids.has(value.id)) throw new Error(`Duplicate ${subject} ID: "${value.id}".`);
    ids.add(value.id);
  }
}
