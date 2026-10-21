import { createRoute } from "honox/factory";
import { buildWebsiteSeo } from "../lib/seo";

const starterMarkdown = `# Preview a Riebeckite document

Write Markdown here. The preview uses Riebeckite's real Markdown pipeline.




\`\`\`ts tab="TypeScript"
const message = "Hello, Riebeckite";
\`\`\`

\`\`\`js tab="JavaScript"
const message = "Hello, Riebeckite";
\`\`\``;

export default createRoute((c) => {
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Playground",
      description: "Try the Riebeckite Markdown pipeline safely in your browser.",
      path: "/playground",
    }),
  );
  c.set("headTags", []);

  return c.render(
    <div class="playground" data-playground>
      <header class="playground__header">
        <p class="playground__eyebrow">Riebeckite</p>
        <h1>Playground</h1>
        <p>
          Markdown はブラウザ内で実行し、出力はサニタイズ済みの隔離フレームに表示します。
        </p>
      </header>
      <div class="playground__controls" aria-label="Preview settings">
        <label>
          Plugin
          <select data-playground-plugin>
            <option value="">None</option>
            <option value="code-tabs">Code tabs</option>
          </select>
        </label>
        <label>
          <input type="checkbox" data-playground-sync-tabs />
          Sync code-tab labels
        </label>
        <label>
          Theme
          <select data-playground-theme>
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
          <select data-playground-mode>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
      <div class="playground__workspace">
        <label class="playground__editor-label">
          <span>Markdown</span>
          <textarea data-playground-markdown spellcheck="false">
            {starterMarkdown}
          </textarea>
        </label>
        <section class="playground__output" aria-live="polite">
          <header>
            <span>Preview</span>
            <span data-playground-status>Ready</span>
          </header>
          <iframe
            data-playground-frame
            title="Sanitized Riebeckite preview"
            sandbox=""
          />
          <ul class="playground__diagnostics" data-playground-diagnostics />
        </section>
      </div>
      <section class="playground__details">
        <h2>Safety boundary</h2>
        <p>
          Raw HTML is supported by Riebeckite for trusted site content. This public
          preview sanitizes the final HTML and applies a sandbox and restrictive CSP
          before it is displayed.
        </p>
      </section>
    </div>,
  );
});
