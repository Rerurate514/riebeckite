import type { PreviewPlugin } from "@riebeckite/preview";
import { previewRegistry } from "../preview-registry";

type PluginPreviewProps = {
  readonly plugin: string;
  readonly fixture: string;
  readonly editable?: boolean;
  readonly compact?: boolean;
};

export function PluginPreview({
  plugin: pluginId,
  fixture: fixtureId,
  editable = true,
  compact = true,
}: PluginPreviewProps) {
  const plugin = previewRegistry.plugin(pluginId);
  const fixture = plugin && previewRegistry.fixture(plugin.id, fixtureId);
  if (!plugin || !fixture) return null;

  const playgroundHref = `/playground?plugin=${encodeURIComponent(plugin.id)}&fixture=${encodeURIComponent(fixture.id)}`;
  return (
    <section
      class={`plugin-preview${compact ? " plugin-preview--compact" : ""}`}
      data-plugin-preview
      data-preview-plugin={plugin.id}
      data-preview-fixture={fixture.id}
      data-preview-options={JSON.stringify(defaultOptions(plugin))}
      data-preview-fixtures={JSON.stringify(
        Object.fromEntries(
          plugin.fixtures.map((item) => [item.id, item.markdown]),
        ),
      )}
    >
      <header class="plugin-preview__header">
        <div>
          <p>Interactive preview</p>
          <h2>{plugin.title}</h2>
        </div>
        <a href={playgroundHref}>Open in Playground</a>
      </header>
      <div class="plugin-preview__controls">
        <label>
          Fixture
          <select data-preview-fixture-select>
            {plugin.fixtures.map((item) => (
              <option value={item.id} selected={item.id === fixture.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <PreviewOptions plugin={plugin} />
        <label>
          Theme
          <select data-preview-theme>
            <option value="default">Default</option>
            <option value="minimal">Minimal</option>
            <option value="gruvbox">Gruvbox</option>
            <option value="rerurate">Rerurate</option>
            <option value="sakura">Sakura</option>
            <option value="tokyonight">Tokyo Night</option>
          </select>
        </label>
        <label>
          Color mode
          <select data-preview-mode>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
      {editable ? (
        <label class="plugin-preview__editor-label">
          <span>Markdown</span>
          <textarea data-preview-markdown spellcheck={false}>
            {fixture.markdown}
          </textarea>
        </label>
      ) : (
        <textarea data-preview-markdown hidden>
          {fixture.markdown}
        </textarea>
      )}
      <section class="plugin-preview__output" aria-live="polite">
        <header>
          <span>Preview</span>
          <span data-preview-status>Loading</span>
        </header>
        <iframe
          data-preview-frame
          title={`${plugin.title} preview`}
          sandbox=""
        />
        <ul class="plugin-preview__diagnostics" data-preview-diagnostics />
      </section>
    </section>
  );
}

function PreviewOptions({ plugin }: { readonly plugin: PreviewPlugin }) {
  if (!plugin.options) return null;
  return Object.entries(plugin.options).map(([name, option]) => {
    const id = `preview-option-${plugin.id}-${name}`;
    if (option.type === "boolean") {
      return (
        <label for={id}>
          <input
            id={id}
            type="checkbox"
            data-preview-option={name}
            checked={option.default === true}
          />
          {option.title}
        </label>
      );
    }
    if (option.type === "enum") {
      return (
        <label>
          {option.title}
          <select data-preview-option={name}>
            {option.values.map((value) => (
              <option value={value} selected={value === option.default}>
                {value}
              </option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <label>
        {option.title}
        <input
          data-preview-option={name}
          type={option.type === "number" ? "number" : "text"}
          value={option.default === undefined ? "" : String(option.default)}
        />
      </label>
    );
  });
}

function defaultOptions(plugin: PreviewPlugin): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(plugin.options ?? {}).flatMap(([name, option]) =>
      option.default === undefined ? [] : [[name, option.default]],
    ),
  );
}
