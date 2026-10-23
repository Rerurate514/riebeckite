---
date: 2026-10-14
title: Build Dependency
sidebar:
  hidden: true
---

# Build Dependency

あるコンテンツや出力に影響する入力の宣言で、別のノート、ファイル、tag、folderなどがあります。依存を記録することで、Coreは変化が影響し得る分だけを無効化できます。

## 依存の種類

content（slug）、file（sourceのパス）、link（解決済みのリンク）、global（設定の変更）、projection（taxonomyやrecent-posts）を扱います。tagとfolderも扱います。

## 依存の宣言

出力依存はcontent依存とは別に扱われます。各型は変更の異なる部分に反応します。

| タイプ | 影響を受けるとき |
| --- | --- |
| `content { slug }` | そのcontentが変わったとき。 |
| `tag { tag }` | そのtagを持つcontentが変わったとき。 |
| `folder { folder }` | そのfolder内のcontentが変わったとき。 |
| `global` | どのcontentも変わったとき。 |
| `unknown` | 常に。Coreはもともと出力再生成を要求します。 |

## 依存宣言の場所

出力依存は以下の場所で宣言できます：

- プラグインページの`pageTypes[].outputDependencies`。
- `onManifestCreated`で既存のmanifest entry HTMLを更新するプラグインのルート`outputDependencies`。Coreはすべてのcontent outputに追加します。
- 生成出力の`context.output.emit(..., { dependencies })`。依存関係が宣言されていない生成出力は`unknown`として扱われ、すべての出力の再生成を引き起こします。

依存タイプとその効果：

| タイプ | 説明 |
| --- | --- |
| `content { slug }` | 特定のcontent slugが変わったときに再生成をトリガーします。 |
| `tag { tag }` | そのtagを持つany contentが変わったときに再生成をトリガーします。 |
| `folder { folder }` | そのfolder内のcontentが変わったときに再生成をトリガーします。 |
| `global` | マニフェスト全体のコレクション変換に関連し、any contentが変わったときに再生成をトリガーします。 |
| `unknown` | 常に全出力再生成をトリガーします。scopeを完全に記述できないときに使用します。 |

`content`、`tag`、または`folder`の範囲が分かっている場合はそれを使用し、`global`はマニフェストwideのコレクション変換のために使用してください。入力が完全に記述できない場合にのみ`unknown`を使用してください。誤った出力宣言は古いファイルを保存する可能性があります。そのため`unknown`はインクリメンタルSSGを犠牲にして全出力描画に振り切る意図があります。

## 関連用語

- [[cache-invalidation|Cache Invalidation]]
- [[output-dependency|Output Dependency]]
- [[fingerprint|Fingerprint]]
- [[plugin-dependency|Plugin dependency]]

## さらに詳しく

- [Build Dependency](../framework/build-dependency.ja.md)
