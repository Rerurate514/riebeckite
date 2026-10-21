---
title: SPA Navigation の設計
---

# SPA Navigation の設計

これは opt-in SPA runtime の実装設計であり、利用者向け設定ガイドではありません。

## 責務

`@riebeckite/spa` は独立した browser runtime であり、Plugin ではありません。

```text
Application -> @riebeckite/honox -> Core
Application -> @riebeckite/spa
Plugins ------------------------> Core client lifecycle contract
```

Core は portable な client lifecycle contract を所有しますが、SPA package、HonoX、DOM 実装を import しません。`spa` 設定値は opaque に保持し、具体的な型は SPA package が提供します。HonoX integration は解決済みの値がある場合だけ runtime を import します。したがって SPA を有効にしない Site の bundle と navigation は変わりません。

Integration は client entry を生成して HonoX へ接続します。runtime は same-origin GET navigation、history、replacement、head reconciliation、scroll/focus restoration、prefetch を所有します。form は対象外です。

## Island の制約と commit 順序

Application は `initRiebeckiteClient()` より前に HonoX の `createClient()` を呼びます。HonoX 0.1.56 の `createClient()` は `data-hono-hydrated` のない root だけを選び、module を読む前に属性を付けて hydration します。再呼び出しで新しい island は hydrate できますが、古い island を unmount せず、汎用 remount API ではありません。

SPA transaction は、fetch と検証、page behavior の unmount、所有 page root と所有する script 以外の head node の置換、新しい island の hydrate、page behavior の mount、history/scroll/focus/announcement/analytics の更新の順に進めます。後続 navigation は fetch と古い async work を abort します。成功前に失敗した場合は document navigation fallback で URL/DOM の整合性を保ちます。

## Core lifecycle contract

| Scope | Owner | Lifetime |
| --- | --- | --- |
| `app` | 永続する application shell | bootstrap から application dispose まで |
| `page` | 置換される page root | 各 document page |

initializer は scope root、`AbortSignal`、public configuration を受け、同期または非同期の cleanup を返せます。unmount は先に abort し、cleanup を一度だけ呼び、error を隔離・報告し、遅い initializer を active にしません。lifecycle coordinator は lifecycle state だけを所有し、Plugin の DOM policy は所有しません。

## Client entry の監査

登録済みの `createClientEntry` は 27 件ではなく 28 件です。「cleanup」は目標ではなく監査結果です。heavy renderer は page replacement 前の abort-safe な書き込みが必要です。

| Entry | 移行後 scope | Async/heavy | cleanup または再実行の所見 |
| --- | --- | --- | --- |
| analytics | page event | network | document one-shot guard があり SPA hook がない |
| autocardlink, canvas, code-enhance, code-tabs, diff, excalibrain, flashcards, lightbox, share, sidenotes, text-fragment | page | sync | document scope。cleanup が必要 |
| chartjs | page | async/heavy | Chart instance を破棄しない |
| color-mode | app | sync | module guard と listener に cleanup がない |
| d2, graphviz, markmap | page | async/heavy | abort-safe rendering が必要 |
| docs | page | sync | resize listener に cleanup がない |
| excalidraw | page | async/heavy | observer を disconnect しない |
| garden-explorer | page | hydration | `hydrateRoot` entry に dispose 経路がない |
| hover-preview | page | fetch | cleanup はあるが fetch を abort しない |
| map | page | async/heavy | Leaflet map を remove しない |
| mermaid | page | async/heavy | script/rendering を abort できない |
| search | app | index fetch | global listener と pending fetch に cleanup がない |
| toc | page | sync | scroll/resize/rAF に cleanup がない |
| ux | app/page に分割 | sync | guard、listener、observer、timer に cleanup がない |
| vega-lite | page | async/heavy | embed が置換後に書き込める |
| wavedrom | page | async/heavy | global renderer state があり cleanup がない |

`@riebeckite/plugin-navigation` はこの revision では client entry を登録しておらず、まだ lifecycle 移行対象ではありません。既存 entry は bootstrap/`DOMContentLoaded` 後に走るか global document を検索します。page entry は渡された root から検索し、document listener は scope cleanup が所有する必要があります。

## Page、head、build の所有権

replacement には安定した一つの `<main id="main-content">` と明示的な shell ownership が必要です。生成 starter/showcase はすでにこの contract を満たしますが、`apps/web` は route-owned main のため SPA 有効化前にそろえます。Header、Footer、永続 Search、Color mode は app scope、route content は page scope です。

server renderer は page-owned head node を mark します。global style と bootstrap script は残します。runtime は title、metadata、canonical/OG data、JSON-LD、mark された Plugin node を ownership key で reconcile します。取得 document の任意 script を clone・実行してはいけません。

生成 virtual client module を `@riebeckite/spa` への唯一の bundle edge にします。SPA 無効時には import しないため、現在の SSG artifact preservation、output plan、dependency fingerprint、cache、asset inventory を維持します。SPA 有効時の production/SSG test でこの点を確認します。

## 必須の検証

SPA off/on の初期表示、internal/external/modifier/hash link、history/scroll、404/redirect/network failure、cancellation、cleanup/remount、island、head ownership、analytics 重複防止、HMR、direct URL、JavaScript-off output、listener/observer leak、bounded prefetch の cache/cancellation を検証します。性能は実測値だけを報告します。
