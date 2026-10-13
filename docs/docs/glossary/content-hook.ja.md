---
title: Content hook
sidebar:
  hidden: true
---

# Content hook

コンテンツフックはコンテンツ処理の命名されたフェーズに参加します: config resolved から content loaded、post parsed、post processed、content graph、manifest 作成、そして diagnostics まで。

## 処理フェーズ

コンテンツ処理パイプラインの hook の順序は: `setup → buildStart → config resolved → public locations resolved → content loaded → Markdown/HTML pipeline → post parsed → post processed → content graph → manifest created → diagnostics → build end`。

## フックの使用

本当に必要なフェーズのみ hook を使用してください。例えば `onContentLoaded` 内で manifest 情報を再構築するなど、後のフェーズの情報を earlier で再構築しないでください。

## 関連用語

- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle hook]]
- [[hook-context|Hook context]]
- [[renderer|Renderer]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
