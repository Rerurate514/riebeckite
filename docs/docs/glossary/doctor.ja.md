---
title: Doctor
sidebar:
  hidden: true
---

# Doctor

 environment、 config、 plugins、 content、 Build State を確認して Project 全体の問題を診断する CLI コマンドです。

## チェック内容

 environment、 config、 plugins、 content sources、 および build state。
 可能な限り独立したチェックを継続する。健康チェックが失敗すると non-zero status で終了する。

## 役割

 Build の代わりにはならない。doctor の結果が失敗すると non-zero status で終了する。
 1つの診断に失敗しても、安全に続行できる独立した診断は可能な限り継続する。

## 関連用語

- [[check|Check]]
- [[glossary/inspector|Inspector]]
- [[build|ビルド]]

## さらに詳しく

- [CLI](../reference/cli.ja.md)
