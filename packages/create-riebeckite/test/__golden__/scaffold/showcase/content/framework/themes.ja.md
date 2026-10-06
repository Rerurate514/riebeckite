---
publish: true
---

# テーマ

テーマを変えるだけで、色・文字組み・レイアウトといったサイト全体の見た目が変わります。コンテンツやルートには一切触れる必要はありません。Riebeckite には 6 つのテーマが用意されており、パッケージをインストールして 1 行書き換えるだけで切り替えられます。

## テーマギャラリー

```gallery
columns: 3
items:
  - title: "Default"
    description: "デフォルトテーマ：クリーンなデザイントークン、ライト/ダーク/システムのカラーモード、記事レイアウト。"
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "文字組みを重視した静かなテーマ。"
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "やわらかいピンクと温かみのあるアクセントのテーマ。"
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "Gruvbox 風の温かみのあるレトロパレット。"
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "ネオンオプション付きのモダンなナイトパレット。"
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "作者自身のデザインをテーマにしたテーマ。"
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## テーマの切り替え

このスターターは `@riebeckite/theme-default` を使っています。別のテーマを試すには：

パッケージをインストール：

```sh
npm install @riebeckite/theme-sakura
```

`riebeckite.config.ts` の `theme` を新しいファクトリに変更：

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## 同梱テーマ一覧

| テーマ | 説明 |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | デフォルトテーマ：クリーンなデザイントークン、ライト/ダーク/システムのカラーモード、記事レイアウト。 |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | 文字組みを重視した静かなテーマ。 |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | やわらかいピンクと温かみのあるアクセントのテーマ。 |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | Gruvbox 風の温かみのあるレトロパレット。 |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | ネオンオプション付きのモダンなナイトパレット。 |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | 作者自身のデザインをテーマにしたテーマ。 |

## すべてのテーマでライト/ダーク切り替え、文字組み、記事レイアウトをサポートしています。詳しいオプションは各 README を参照してください。


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

