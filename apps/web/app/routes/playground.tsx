import { createRoute } from "honox/factory";
import { PluginPreview } from "../components/plugin-preview";
import { buildWebsiteSeo } from "../lib/seo";
import { previewRegistry } from "../preview-registry";

export default createRoute((c) => {
  const requestedPlugin = c.req.query("plugin") ?? "code-tabs";
  const plugin =
    previewRegistry.plugin(requestedPlugin) ??
    previewRegistry.plugin("code-tabs");
  const requestedFixture = c.req.query("fixture");
  const fixture =
    plugin?.fixtures.find((item) => item.id === requestedFixture) ??
    plugin?.fixtures[0];
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Playground",
      description:
        "Try the Riebeckite Markdown pipeline safely in your browser.",
      path: "/playground",
    }),
  );
  c.set("headTags", []);

  return c.render(
    <div class="playground">
      <header class="playground__header">
        <p class="playground__eyebrow">Riebeckite</p>
        <h1>Playground</h1>
        <p>
          Markdown は Riebeckite
          の実際のパイプラインで処理し、出力はサニタイズ済みの隔離フレームに表示します。
        </p>
      </header>
      <form
        class="playground__picker"
        action="/playground"
        method="get"
        data-playground-picker
      >
        <label>
          Plugin
          <select name="plugin" data-playground-plugin>
            {previewRegistry.plugins.map((item) => (
              <option value={item.id} selected={item.id === plugin?.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </form>
      {plugin && fixture && (
        <PluginPreview
          plugin={plugin.id}
          fixture={fixture.id}
          compact={false}
          playgroundLink={false}
        />
      )}
      <section class="playground__details">
        <h2>Safety boundary</h2>
        <p>
          Raw HTML is supported by Riebeckite for trusted site content. This
          public preview sanitizes the final HTML and applies a sandbox and
          restrictive CSP before it is displayed.
        </p>
      </section>
    </div>,
  );
});
