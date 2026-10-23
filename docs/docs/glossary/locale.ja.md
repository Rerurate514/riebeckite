---
date: 2026-10-14
title: ロケール（Locale）
sidebar:
  hidden: true
---

# ロケール（Locale）

サイトやページが対象とする言語と地域の識別子です（`en`、`ja` など）。既定のロケールは、URLに接頭辞を付けずに配信する言語を決めます。

## 既定ロケールと接頭辞

| 設定 | 効果 |
| --- | --- |
| `defaultLang: en` | 英語は接頭辞なしで配信 |
| `languages: [en, ja]` | 日本語は `/ja/` の下で配信 |

## ページごとの言語

ページのロケールは、frontmatterの `lang` フィールドかファイル名の接尾辞から決まります。ロケールによって、そのページに付くURL接頭辞が決まります。

## ロケールとURL生成
ロケールは各ページのURL接頭辞を決めます。既定言語（`l10n.defaultLang` で設定）は接頭辞なしのURL（`/about`）のままで、それ以外の言語には言語コードの接頭辞が付きます（`/en/about`、`/ja/about`）。この接頭辞はファイル名を書き換えるのではなく、公開先の解決時にl10nプラグインが付加します。

言語検出の優先順位は `packages/plugins/l10n/src/l10n.ts` で定義されており、次のとおりです。

1. **frontmatter** — ファイルのfrontmatter内のどこかにある `lang:`
2. **カスタム検出器** — `detect` オプションが指定されている場合
3. **ファイル名の接尾辞** — `.ja.md`、`-en.md`、`_en-US.md` など
4. **`defaultLang`** — 他のどの信号でも言語が決まらない場合に使用

```ts
// Example: language detection precedence
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  detect: ({ path }) => path.startsWith("French/") ? { lang: "fr" } : undefined,
});
```

解決されたロケールはマニフェストの `publicLocation.language` に格納され、インテグレーションが正しい `<html lang>` 属性とURL接頭辞を描画するために使います。
