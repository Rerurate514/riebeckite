---
date: 2026-10-20
title: "CSS とブラウザ動作を追加する"
sidebar:
  label: "8. CSS とブラウザ動作を追加する"
  order: 8
---
# CSS とブラウザ動作を追加する

スタイルは `assets`、ブラウザの初期化処理は `clientEntries` で宣言します。サイト内のローカルプラグインは CSS を `extensions/` に置いて構いません。配布するパッケージでは、CSS をサイトへコピーしたりブラウザから `node_modules` を直接参照したりせず、パッケージの export として公開してください。

このレシピはすべてのコードブロックにコピーボタンを追加します。クライアントモジュールはボタンのラベルを `publicConfig` として明示的に受け取ります。プラグインの `options` がブラウザへ送られることはありません。

```ts
import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export type CopyCodeOptions = {
  label?: string;
};

export function copyCode(options: CopyCodeOptions = {}) {
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

クライアントエントリはパッケージのサブパスを指します。パッケージの `exports` に宣言します。

```json
{
  "exports": {
    ".": "./index.ts",
    "./client": "./client.ts",
    "./style.css": "./style.css"
  }
}
```

初期化関数は普通のブラウザ関数です。複数回読み込まれても壊れないようにします。

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

スタイルを追加します。

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

配布するパッケージでは、`exports` を実際に同梱するファイルへ向けてください。生成されたクライアントモジュールは名前付き export を import し、`publicConfig` を渡して呼び出します。それ以外のオプションは渡しません。

コンポーネントの状態が必要で、DOM の拡張では足りない場合は、サイト側でコンポーネントを HonoX Island で包みます。プラグインは `app/islands/` を所有しません。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
