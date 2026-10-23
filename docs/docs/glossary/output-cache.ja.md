---
date: 2026-10-14
title: Output Cache
sidebar:
  hidden: true
---

# Output Cache

`.riebeckite/ssg-output-cache.json`に保存される、SSGの出力ルートとファイルをためるcacheです。Incremental SSGで再利用するためのもので、GitHub ActionsではCI実行間で復元し、検証に通らないcacheは破棄します。

## 目的

現在のmanifestをBuildしたあと、Coreは出力記述子を前回の成功した状態と比較します。HonoXは影響するcontentとPluginページのルートだけを描画し、変わっていないGenerated Outputは出力cacheから復元し、サイトが所有しなくなった出力は削除します。

## output inventory比較

Coreはoutput inventoryを構築します。`.riebeckite/ssg-output-cache.json`には、パスをキーにしたすべての生成物の記録が保存されています。contentの出力、redirect、Pluginページの出力、Generated Outputが含まれます。現在のinventoryを前回の成功した状態と比較します。どの出力が影響を受ける（再生成が必要）、変わらない（再利用できる）、削除されたかを決定します。ビルドログは`SSG outputs`の行で`rendered`、`reused`、`removed`の件数を報告します。

## 再利用の判定

Coreは、次の条件がすべて満たされるときだけ、変わっていない出力をcacheから復元します。

- Build stateが有効で、output change setが取得できている。
- Change setが完全な再生成を要求していない。つまり、失敗した外部依存がなく、`unknown`依存を持つ出力もない。
- 出力cacheが復元され、整合性検査（スキーマバージョン、entryファイル、チェックサム）を通過している。
- App fingerprintとclient manifest fingerprintがcacheの値と一致している。
- 変わっていない出力がすべて、site所有かcache内に存在する。

SSGのmetricsは結果を`outputCacheDecision`（各条件の判定）と`outputCacheRejectionReason`に記録します。理由は、出力を再利用したときは`null`です。それ以外は`change-set-unavailable`、`full-regeneration-required`、`output-cache-missing-or-invalid`のいずれかです。`app-fingerprint-changed`、`client-manifest-fingerprint-changed`、`unchanged-output-not-cached`のいずれかです。cacheを棄却したときは、同じmetricsの`fullRegenerationRequired`が`true`になります。

この判定はCLIのno-change fast pathとは別物です。Fast pathは、manifest hookやgenerated output planを必要とするpluginがないことも追加で要求します。

## 永続化

生成されたGitHub Actions workflowは、output cacheをcontent cacheとBuild stateと一緒に復元します。対象は`.riebeckite/ssg-output-cache.json`です。その`.riebeckite/ssg-output-cache.entries`ディレクトリも含みます。`.riebeckite/ssg-output-cache.fast-path.json` sidecarも含みます。これにより、CIでも実行間で描画済み出力を再利用できます。復元したstateが一致しなければRiebeckiteが検証してすべての出力を描き直すので、転送しても安全です。完全に作り直したい場合は、次の2ファイルを削除してください。`.riebeckite/build/content-state.json` と `.riebeckite/ssg-output-cache.json` です。workflowの詳細は[GitHub Actions](../guides/deployment/github-actions.ja.md)を参照してください。

## 関連用語

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
