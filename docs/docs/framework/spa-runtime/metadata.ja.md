---
date: 2026-10-23
title: ページ情報
sidebar:
  label: ページ情報
  order: 20
---
# ページ情報

## ページ情報の更新

`main` を置き換える前に、ランタイムはページごとに変わる `<head>` の内容を更新します。

- 取得したページの `document.title` を設定する
- `<html lang>` と `<html dir>` をコピーし、取得元にない場合は削除する
- 現在の `<head>` から、ページが所有する要素を削除する
- 取得したページの `<head>` から、ページが所有する要素を複製して追加する

ページごとに置き換える要素と、アプリケーション全体で残す要素は、`data-riebeckite-head` 属性で区別します。

- `data-riebeckite-head="page"` の要素は置き換える
- `data-riebeckite-head="global"` と `"runtime"` の要素は残す
- Plugin が生成する `meta` と `link` には、ページ所有の属性が自動的に付く
- Plugin のデータ用スクリプト（`application/ld+json`、`application/json`）もページ所有になる
- 実行可能な Plugin スクリプトには所有権を付けず、複製も再実行もしない

互換性のため、次の従来のセレクタに一致する要素もページ所有として扱います。

- `link[rel="canonical"]`、`link[hreflang]`
- `script[type="application/ld+json"]`
- `meta[name="description"]`、`meta[name="author"]`、`meta[name="robots"]`
- `meta[name^="twitter:"]`
- `meta[property^="og:"]`、`meta[property^="article:"]`

上記以外の `<head>` の要素は残ります。実行可能な `<script>` は、`data-riebeckite-head="page"` が付いていても置き換えません。再実行を避けるためです。所有権の属性がない `<script>` と `<style>` も、そのまま残ります。

## 履歴・スクロール位置・フォーカス

スクロール位置の復元が有効な場合、ランタイムは `history.scrollRestoration = "manual"` を設定し、停止時に元の値へ戻します。

スクロール位置は、スクロールが落ち着いたときと、クリックによる移動を始める直前に、`replaceState` を使って `history.state` の `scroll` に保存します。戻る・進む操作では、保存された位置を復元します。保存がない場合は復元しません。

クリックによる移動では、コミットの成功後に `{ scroll: [0, 0] }` を持つ履歴を追加し、ページ先頭へ移動します。URL にハッシュがある場合は、代わりに一致する要素へスクロールします。

履歴の扱いは次のとおりです。

- クリックによる移動は、コミットの成功後に新しい履歴を追加する
- `popstate` による移動は履歴を追加しない
- リダイレクトがあった場合は、レスポンス URL を履歴に使う

フォーカスと通知の扱いは次のとおりです。

- URL にハッシュがない場合、必要なら `tabindex="-1"` を追加し、`preventScroll` を指定して新しい `main` にフォーカスする
- `#riebeckite-navigation-announcer` を作成または再利用し、`aria-live="polite"` の要素に新しいページタイトルを設定する
- `spa:navigation` イベントの `detail` は `{ url, popstate }` を持つ

## リンク先の先読み

`prefetch: "hover"` を指定すると、`pointerover` のリスナーが追加されます。対象になるリンクの条件はクリック時と同じで、ハッシュだけのリンクは無視します。

先読みしたページは、URL をキーにした[[glossary/cache|キャッシュ]]で管理します。

- 最近使った順に、完了した項目を最大20件保持する
- 先読みとページ移動の進行中リクエストを重複排除する
- 成功したレスポンスは30秒間保持する
- 失敗した項目と期限切れの項目は削除する
- ランタイムの停止時には、進行中のリクエストを中断する

先読みは、データ節約設定、`slow-2g`、`2g` 接続では実行しません。呼び出し元が `signal` を中断しても失敗するのはその呼び出し元だけで、共有されているリクエストは中断しません。
