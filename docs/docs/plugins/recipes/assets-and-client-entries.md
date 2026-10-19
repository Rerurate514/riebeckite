---
title: "Add CSS and Browser Behavior"
sidebar:
  label: "8. Add CSS and Browser Behavior"
  order: 8
---
# Add CSS and Browser Behavior

Declare stylesheets with `assets` and browser initializers with `clientEntries`. A site-local plugin can keep its CSS under `extensions/`; a published package should expose the stylesheet as a package export instead of copying it into the site or referencing `node_modules` from the browser.

This recipe adds a copy button to every code block. The client module uses an explicit `publicConfig` value for the button label. Plugin `options` are never sent to the browser.

```ts
import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export type CopyCodeOptions = {
  label?: string;
};

export function copyCodePlugin(options: CopyCodeOptions = {}) {
  return definePlugin({
    name: "copy-code",
    options,
    assets: [
      createStyleAsset(
        "copy-code",
        "@example/riebeckite-plugin-copy-code/style.css",
      ),
    ],
    clientEntries: [
      createClientEntry(
        "copy-code",
        "@example/riebeckite-plugin-copy-code/client",
        "initCopyCode",
        { label: options.label ?? "Copy" },
      ),
    ],
  });
}
```

The client entry points at a package subpath. Declare it in the package `exports`:

```json
{
  "exports": {
    ".": "./index.ts",
    "./client": "./client.ts",
    "./style.css": "./style.css"
  }
}
```

The initializer is a normal browser function. It must tolerate being loaded more than once.

```ts
type CopyCodeConfig = {
  label?: string;
};

export function initCopyCode(config: CopyCodeConfig = {}): void {
  const start = () => {
    for (const pre of document.querySelectorAll("pre")) {
      if (pre.querySelector("[data-rr-copy]")) continue;

      pre.style.position = "relative";
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.rrCopy = "";
      button.textContent = config.label ?? "Copy";

      button.addEventListener("click", async () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "Copied";
          window.setTimeout(() => {
            button.textContent = config.label ?? "Copy";
          }, 1500);
        } catch {
          button.textContent = "Failed";
        }
      });

      pre.append(button);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
```

Add the styles:

```css
[data-rr-copy] {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: 1px solid var(--rb-color-border);
  border-radius: 4px;
  background: var(--rb-color-surface);
  color: var(--rb-color-text);
  padding: 0.25rem 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
```

For a published package, point the `exports` entries at the files you ship. The generated client module imports the named export, calls it with `publicConfig`, and ignores the rest of the plugin options.

If browser behavior needs component state rather than DOM enhancement, let the site wrap the component in its own HonoX Island. Plugins do not own `app/islands/`.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
