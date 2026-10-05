# @riebeckite/plugin-navigation

サイトナビゲーションを提供する Riebeckite プラグインです。`navigation()` は
Vault にすでにあるノートから主要ナビゲーションを導出します。Riebeckite 専用の
ファイルも必須 frontmatter も不要なので、既存の Obsidian Vault をそのまま
公開できます。ナビゲーションの「モデル」はプラグインが持ち、描画と配置は
Site シェルが担当します。

[English](./README.md)

## 仕組み

`navigation()` はマニフェストの discoverable エントリ（公開され、ルーティング
可能なノート）を読み、スラッグ階層でまとめます。

- フォルダはセクションになる
- `index` / `README` ノートはそのフォルダへのリンクになり、同じフォルダの
  直下のノートは子になる
- それ以外のノートはリンクになる
- タイトルはノート自身の `title` を使い、なければスラッグのセグメントから作る

index ノートを持たないフォルダは、子をまとめたラベルとして表示されます。
モデルは `manifest.discoverableEntries` から作るため、下書き・予約公開・
その他の非表示ノートは決して現れません。

Vault 側の変更は不要です。`navigation.md` もナビゲーション用 frontmatter も
要らず、フォルダ構造がすでに表していることを再入力する必要もありません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { navigation } from "@riebeckite/plugin-navigation";

export default defineConfig({
  // ...
  plugins: [navigation()],
});
```

Site シェルがモデルを描画します。HonoX サイトでは次のように使います。

```tsx
import { content } from "../content";
import { resolveSiteNavigation } from "@riebeckite/plugin-navigation";

const model = resolveSiteNavigation(config, await content.getManifest());
const primary = model?.primary ?? [];
const secondary = model?.secondary ?? [];
```

プラグインが登録されていない場合、`resolveSiteNavigation` は `null` を返すため、
ナビゲーションのないサイトもそのまま動作します。

## 手書きナビゲーション

自動導出ですべてを表現できるわけではなく、リンクを意図的に整えたいサイトも
あります。`items` を渡すと導出の代わりに手書きリンクを使います。

```ts
navigation({
  items: [
    { label: "Docs", href: "/docs/" },
    { label: "Reference", href: "/docs/reference/" },
    {
      label: "Themes",
      href: "/docs/themes/",
      children: [
        { label: "Default", href: "/docs/themes/default" },
        { label: "Writing a theme", href: "/docs/themes/writing-a-theme" },
      ],
    },
  ],
});
```

`secondary` は Site が控えめに描画してよい補助リンクを保持します。

```ts
navigation({
  secondary: [
    { label: "Docs", href: "/docs/" },
    { label: "GitHub", href: "https://github.com/Rerurate514/riebeckite", external: true },
  ],
});
```

`primary` と `secondary` は配置ではなく目立ちやすさを表します。それぞれを
ヘッダー・フッター・サイドバーのどこに描画するかは Site が決めます。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `items` | `NavigationItem[]` | 導出値 | 手書きの主要ナビゲーション |
| `secondary` | `NavigationItem[]` | `[]` | 補助リンク |

`NavigationItem` は `{ label, href?, children?, external? }` です。導出された
フォルダグループは index ノートを持たないことがあるため `href` は型上省略
可能ですが、手書きアイテムには空でない `href` が必要です。`external` は別タブで
開くリンクを表します。

## エクスポート

- `navigation(options?)` — プラグインファクトリ
- `navigationPlugin` — `navigation` のエイリアス
- `NAVIGATION_PLUGIN_NAME` — プラグイン名 `"navigation"`
- `buildNavigation(entries, options?)` — マニフェストエントリからモデルを構築する
- `resolveSiteNavigation(config, manifest)` — 有効なプラグインを見つけてモデルを
  構築する。なければ `null`
- `validateNavigationOptions(options)` — オプションの検証
- 型: `NavigationItem`, `NavigationOptions`, `NavigationSource`,
  `SiteNavigation`

## 制約

- 導出は単一言語の Vault を対象とします。多言語 Vault では言語プレフィックスを
  明示するため `items` を書いてください。
- 並び順はタイトルのアルファベット順です。frontmatter の順序は読みません。
- `exclude` / `include` / `order` はまだありません。実際のサイトが必要とした
  ときにだけ追加します。

## 関連リンク

- [設定リファレンス](../../../docs/ja/docs/reference/configuration.md)
- [プラグイン API](../../../docs/ja/docs/reference/plugin-api.md)
