# Riebeckite アーキテクチャ境界

Riebeckite では、変更理由が異なるコードを次の責務で分けます。

## Core

`packages/core` は content repository / content manager / manifest / content graph /
pipeline / plugin runtime / config / 共通型を持ちます。Core は Mermaid、検索、Backlinks
などの個別 Plugin / Feature を知りません。

Core を変更してよいのは、既存の plugin extension point や content model では複数の
Plugin / Feature が必要とする汎用能力を表現できない場合だけです。特定 Plugin 専用の
API は Core に追加しません。

## Plugin

`packages/plugins/*` は Markdown / AST / HTML / metadata / assets / client behavior など、
コンテンツをどう解釈・変換するかを拡張します。Mermaid、Media、Excalidraw、Lightbox、
Obsidian Markdown などが該当します。

Plugin 固有の CSS や client initializer は、可能な限り plugin package 内に置き、
`assets` / `clientEntries` で宣言します。`apps/web` 側へ Plugin 固有ファイルを分散させる
のは避けます。

## Feature

`apps/web/app/features` はサイトとして何ができるかを表します。Backlinks、Recent Posts、
Search Bar、Table of Contents のように、UI に加えて query、server-side data preparation、
client behavior、feature 固有 CSS を持てます。

Feature は Core / content model を利用して必要なデータを作り、Component へ渡します。
Feature 固有の server/client/style は同じ feature directory にまとめます。

## Component

`apps/web/app/components` は表示方法を担当します。Component は filesystem や
ContentManager に直接アクセスせず、必要なデータや slot を props で受け取って描画します。

例えば `Article` は記事本文の表示 shell と frontmatter 表示を担当し、Backlinks や
Table of Contents の取得・生成は Feature 側が所有します。

## Infrastructure

HonoX route、Vite config、Cloudflare Workers、filesystem、build scripts など外部技術との
接続は Infrastructure です。既存構造に合わせ、専用 directory を作ること自体は目的にしません。

## 判断基準

- Markdown / HTML の解釈・変換能力を追加するなら Plugin。
- サイト上の機能、画面上の振る舞い、query、server/client behavior を追加するなら Feature。
- データを受け取って表示するだけなら Component。
- content model、pipeline、plugin runtime、manifest など Riebeckite の土台なら Core。
- bundler、route、filesystem、deployment との接続なら Infrastructure。
