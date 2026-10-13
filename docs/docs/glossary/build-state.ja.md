---
title: ビルド状態
sidebar:
  hidden: true
---

# ビルド状態

前回の Build が記録されたもので、 entries、 fingerprints、 dependencies、 output changes を含みます。

## 場所と内容

 `.riebeckite/build/content-state.json` に保存される。
 entries、 fingerprints、 dependencies、 pipeline fingerprint、 manifest entries、 outputs、 external dependencies を含む。
 次の Build が incremental change set を計算するために読み込む。

## バージョンと妥当性

バージョンは `CONTENT_BUILD_STATE_VERSION` (現在は 12) である。
欠落・非互換・不正な状態の場合は full build パスが取られる。
 状態は Build 成功後にのみ更新され、失敗しても以前の有効な状態が壊されない。

## 関連用語

- [[build|ビルド]]
- [[incremental-build|インクリメンタルビルド]]
- [[fingerprint|フィンガープリント]]
- [[output-inventory|出力インベントリ]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
