---
date: 2026-10-14
title: プリセット（Preset）
sidebar:
  hidden: true
---

# プリセット（Preset）

よくある構成をまかなうために用意されたオプション群です。Riebeckite では2つの場面で使います。

## スキャフォールドプリセット

`create-riebeckite` と `riebeckite init` は、スキャフォールドプリセットから完全なサイトを生成します。プリセットは、プラグイン、テーマ、生成されるコンテンツ、アプリケーションファイルを選びます。

利用できるプリセットは `empty`、`minimal`、`starter`、`digital-garden`、`blog`、`docs`、`portfolio`、`showcase` で、既定は `starter` です。`--preset <name>` で選び、`--list-presets` で一覧を表示できます。

```sh
npx create-riebeckite my-site --preset blog
```

各プリセットの内容は[プリセット](../getting-started/presets.ja.md)を参照してください。

## テーマプリセット

テーマは `defineTheme` で名前付きプリセットを宣言できます。テーマプリセットは、`preset` オプションで選ぶテーマ設定の部分集合です。

```ts
export const myTheme = defineTheme({
  name: "my-theme",
  styles: [{ moduleSpecifier: "/themes/my-theme.css" }],
  presets: {
    compact: { label: "Compact", settings: { density: "compact" } },
  },
});
```

```ts
theme: myTheme({ preset: "compact" })
```

解決順は、スキーマの既定値、プリセット、明示的な `settings` の順で、明示的な設定が優先されます。詳しくは [Theme API](../reference/theme-api.ja.md) を参照してください。

## 関連用語

- [[glossary/theme|Theme]]
- [[glossary/config|Config]]
- [[glossary/plugin|Plugin]]

## さらに詳しく

- [プリセット](../getting-started/presets.ja.md)
- [Theme API](../reference/theme-api.ja.md)
