---
title: Build cache
sidebar:
  label: Build cache
  order: 50
---
# Build cache

`cache` は build 時に使う永続 cache の設定です。省略可能で、既定では Integration が適切な directory を決めます。

| Field | 既定値 | 説明 |
| --- | --- | --- |
| `cache.enabled` | `true` | `false` にすると永続 cache を無効化し、毎回すべてを再生成します。 |
| `cache.directory` | `<buildDirectory>/cache` | cache の保存先を上書きします。cache を別の場所へ移したり共有したい場合に指定します。未指定なら Integration の既定値を使います。 |

cache には build 間で再利用する処理済み Content や Plugin の結果が入ります。無効化や保存先の変更は build の速度にだけ影響し、出力は変わりません。cold build でも同じ結果になります。
