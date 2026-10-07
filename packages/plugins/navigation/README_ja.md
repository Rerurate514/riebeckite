# @riebeckite/plugin-navigation

サイトナビゲーションを提供する Riebeckite プラグインです。`navigation()` は
Vault にすでにあるノートから主要ナビゲーションを導出します。Riebeckite 専用の
ファイルも必須 frontmatter も不要なので、既存の Obsidian Vault をそのまま
公開できます。ナビゲーションの「モデル」と描画の仕組みはプラグインが持ち、
配置は Site が担当します。

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

### 描画

`SiteNav` は解決済みのツリーを `<nav>` ランドマークとネストしたリストとして
描画します。子の再帰描画、現在パスの判定、言語を考慮した正規化、外部リンクの
扱い、`aria-current` といった描画の仕組みを担当し、その `rb-nav` ツリーを
成立させる構造 CSS を自身の `style.css` に同梱します（自動生成される plugin
styles 経由で読み込まれます）。ツリーをどこに置くか、モバイルで `<details>` を
使うかは Site が決めます。

```tsx
import { SiteNav } from "@riebeckite/plugin-navigation";

<header class="site-header rb-site-header">
  <a href="/" class="site-header__home rb-site-header__home">My Site</a>
  <SiteNav
    items={primary}
    path={c.req.path}
    language={c.get("htmlLanguage")}
  />
</header>;
```

`path` は現在のリクエストパスです。`language` は現在のコンテンツ言語で、指定すると
`SiteNav` は `/language` プレフィックスを取り除いてから現在のアイテムを判定します。
そのため、言語プレフィックスのない手書き href でもローカライズされたページに
一致します。`localizeHref` を渡すと現在の言語に合わせて href を書き換えられます。
`label` でランドマークのラベルを、`class` / `className` で `<nav>` のクラスを
拡張できます。

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
- `SiteNav` — 解決済みツリーを標準の `rb-nav` 構造で描画する
- 型: `NavigationItem`, `NavigationOptions`, `NavigationSource`,
  `SiteNavigation`, `SiteNavProps`

## 制約

- `l10n` Plugin が言語 metadata を付与している場合、導出は表示中の言語に追従し、
  多言語 Vault の Navigation が言語を混在させることはありません。localization
  metadata のない Vault では、discoverable な全 entry を使います。
- 並び順はタイトルのアルファベット順です。frontmatter の順序は読みません。
- `exclude` / `include` / `order` はまだありません。実際のサイトが必要とした
  ときにだけ追加します。

## 関連リンク

- [設定リファレンス](../../../docs/docs/reference/configuration.ja.md)
- [プラグイン API](../../../docs/docs/reference/plugin-api.ja.md)
