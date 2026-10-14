---
title: Locale
sidebar:
  hidden: true
---

# Locale

サイトやページが書かれている言語と地域の識別子で、enやjaなどです。既定のlocaleは、URLに接頭辞を付けずに配信する言語を決めます。

## 既定localeと接頭辞

| 設定 | 効果 |
| --- | --- |
| `defaultLang: en` | 英語は接頭辞なしで配信 |
| `languages: [en, ja]` | 日本語は`/ja/`の下で配信 |

## ページごとの言語

ページのlocaleはfrontmatterの`lang`fieldかファイル名の接尾辞から決まります。これがURLの接頭辞を決めます。

## LocaleとURL生成
localeは各ページのURL接頭辞を決定します。既定言語（`l10n.defaultLang`で設定）は接頭辞なしのURLを維持します（`/about`など）。その他の言語は言語コードで接頭辞が付けられます（`/en/about`, `/ja/about`）。この接頭辞はファイル名を書き換えるのではなく、l10nプラグインがpublic location解決時に付加します。

言語検出の優先順位（`packages/plugins/l10n/src/l10n.ts`で定義）は以下の通りです：

1. **frontmatter** ：ファイルのfrontmatter anywhereにある`lang:`
2. **custom detector** ：`detect`オプションが提供されている場合
3. **filename suffix** ：`.ja.md`, `-en.md`, `_en-US.md`など
4. **`defaultLang`** ：他の信号で言語が解決されない場合に使用

```ts
// Example: language detection precedence
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  detect: ({ path }) => path.startsWith("French/") ? { lang: "fr" } : undefined,
});
```

解決されたlocaleはmanifestの`publicLocation.language`に格納され、integrationが正しい`<html lang>`属性とURL接頭辞を描画するために使用されます。
