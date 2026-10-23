---
date: 2026-10-14
title: ビルド依存関係（Build Dependency）
sidebar:
  hidden: true
---

# ビルド依存関係（Build Dependency）

Coreとプラグインの間の取り決めで、処理済みコンテンツや出力したファイルが、ビルド間でどの入力に依存するかを宣言します。

## コンテンツ依存関係

プラグインは`processedContentCache`に`dependencyMode`（none、tracked、global、unsafe）を宣言します。
CoreはCoreのコンテンツAPIを通じた読み取りを、安定した識別子を持つ依存関係として記録します。
コンテンツ、ファイル、リンクの依存関係は記録され、以降のビルドで比較されます。

## 出力依存関係

出力依存関係はコンテンツ依存関係とは別に扱います。それぞれの種類は、変更セットの異なる部分に反応します。

| 種類 | 影響を受ける条件 |
| --- | --- |
| `content { slug }` | そのコンテンツが変わったとき。 |
| `tag { tag }` | そのタグを持つコンテンツが変わったとき。 |
| `folder { folder }` | そのフォルダー内のコンテンツが変わったとき。 |
| `global` | どのコンテンツかが変わったとき。 |
| `unknown` | 常に。Coreは出力の完全な再生成も要求します。 |

## 依存関係の宣言場所

出力依存関係は次の場所で宣言できます。

- プラグインページの`pageTypes[].outputDependencies`。
- `onManifestCreated`で既存のマニフェストエントリのHTMLを更新するプラグインの、ルートの`outputDependencies`。Coreはこれをすべてのコンテンツ出力に追加します。
- 生成物の`context.output.emit(..., { dependencies })`。依存関係を宣言していない生成物は`unknown`となり、出力全体の再生成を引き起こします。

依存関係の種類とその効果は次のとおりです。

| 種類 | 説明 |
| --- | --- |
| `content { slug }` | 特定のコンテンツのslugが変わったときに再生成します。 |
| `tag { tag }` | そのタグを持つコンテンツが変わったときに再生成します。 |
| `folder { folder }` | そのフォルダー内のコンテンツが変わったときに再生成します。 |
| `global` | ソースを問わず、どのコンテンツかが変わったときに再生成します。 |
| `unknown` | 常に出力全体の再生成を引き起こします。スコープを記述できないときに使います。 |

スコープが分かっている場合は`content`、`tag`、`folder`を使い、マニフェスト全体のコレクション変換には`global`を使います。`unknown`は、入力を完全には表現できない場合にだけ使ってください。誤った出力宣言は古いファイルを残す可能性があるため、`unknown`は増分SSGを犠牲にして出力全体を描画し直す、意図的な選択です。

## 関連用語

- [[cache-invalidation|Cache Invalidation]]
- [[output-dependency|Output Dependency]]
- [[fingerprint|Fingerprint]]
- [[plugin-dependency|Plugin dependency]]

## さらに詳しく

- [Build Dependency](../framework/build-dependency.ja.md)
