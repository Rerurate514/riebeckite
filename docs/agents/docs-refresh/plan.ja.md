---
private: true
title: ドキュメント刷新 設計書
---

# ドキュメント刷新 設計書 (2026-11-18, branch docs-refresh)

Phase 0/1 の全ワーカー調査 (A: 導入・デプロイ, B: framework・guides, C: plugins・themes・glossary, D: ナビゲーション・リンク・多言語) を踏まえた実装計画。本文書は内部資料 (公開対象外)。

## 1. 確定済み決定

1. **URL方針 = 全面再設計**。旧URL→新URLは301で維持。
2. **obsidian-plugin/ は private 化** (`publish: false` の意図を尊重)。sidebar order 25 の割込みも解消。
3. **guides/migration/ は private 維持**。ja の壊れた `[[seo]]` リンク14箇所のみ修正。
4. **ユーザーの未コミット改善はブランチ初回コミット (45bdfe69) として保護**。presets.{md,ja.md} の改善内容は踏襲する。

## 2. 新しい情報アーキテクチャ

### 2.1 トップレベル構成 (sidebar.order 再設計)

| order | セクション | 責務 | 想定読者 |
| --- | --- | --- | --- |
| 0 | Docs home (`docs/docs/README.md`) | ペルソナ別タスク索引・入口 | 全員 |
| 10 | Philosophy | 設計思想 | 全員 |
| 20 | Getting started | 初回導入・最初の1ページ | 初心者 |
| 30 | Guides | 目的別レシピ (執筆・Obsidian・カスタマイズ・デプロイ) | 利用者・サイト開発者 |
| 40 | Plugins | プラグインカタログ (85本は平坦維持、READMEをカテゴリ別索引に強化) | 利用者・開発者 |
| 50 | Themes | テーマカタログ・作り方 | 利用者・テーマ開発者 |
| 60 | Reference | CLI・設定・正確な仕様調べ | 全員 |
| 70 | Framework | 本体の仕組み (開発者向け) | 本体・プラグイン・テーマ開発者 |
| 80 | Glossary | 用語集 (用語ページはhidden、READMEハブのみ表示) | 全員 |
| 90 | Accessibility | 対応状況 | 本体開発者・サイト開発者 |
| 100 | Security | 信頼境界と保証 | 本体開発者 |
| 110 | Releases | 変更履歴 | 全員 |

### 2.2 主要導線 (ペルソナ別)

- **初めて静的サイトを作る人**: Docs home → Quick start → Installation → First content → デプロイは guides/deployment/ に飛ぶ (getting-started 内の重複ページは廃止)
- **Obsidianユーザー**: Docs home → Obsidian Vault (getting-started) → guides/obsidian/ (深掘り)
- **サイトカスタマイズ**: Docs home → Guides → カスタマイズ/テーマ
- **プラグイン開発者**: Docs home → Plugins → writing-a-plugin → recipes
- **配置パターン選択**: project-structure (正本の3パターン表) → integrated / separate-directories / separate-repositories 各setup → 運用は deployment/separate-content-repository

### 2.3 3ハブの責務分離

- `docs/index.md` … プロダクトランディング (/)
- `docs/docs/README.md` … ドキュメントホーム。**ペルソナ別タスク索引に書き換える** (正本)
- `docs/README.md` … vault・コントリビューター向け手引き (URL維持。`check_docs.mjs` Rule 3 の到達性ルートであり、private化すると全ファイルが到達不能エラーになるため公開維持)

## 3. ファイル操作マッピング (旧→新)

構造変更は最小に留める。plugins 85本は `docs/docs/plugins/<slug>.{md,ja.md}` 平坦維持 (sync_docs.mjs・check_plugin_docs_parity.mjs・npm package README の生成がパスを前提にしているため)。framework/themes/reference/glossary のフォルダ構造も維持し内容修正のみ。

| 現行 | 操作 | 新 | 備考 |
| --- | --- | --- | --- |
| getting-started/content-location | 統合 (project-structureへ) | getting-started/project-structure | 3パターン比較表の正本はここ |
| getting-started/deployment | 削除 | guides/deployment/README | A-H3: Quick Start読者への再scaffold指示を解消 |
| guides/content-repositories/basics | 移動統合 | guides/deployment/separate-content-repository/concepts | |
| guides/content-repositories/setup | 移動統合 | …/separate-content-repository/setup | s-c-r/repository-split と統合 |
| guides/deployment/separate-content-repository/repository-split | 移動統合 | …/separate-content-repository/setup | |
| guides/content-repositories/publishing | 移動統合 | …/separate-content-repository/publishing | トラブルシュート表は troubleshooting が正本 (A-M7) |
| getting-started/separate-repositories-setup (291行) | トリム | 同位置 | 入口 (why・結論) を残し運用手順はs-c-rセクションへリンク |
| obsidian-plugin/{README,architecture} (日英4本) | private化 | — | 旧URLは guides/obsidian/README へ 301 |
| docs/audits/**, docs/architecture/** | private化 | — | D2: 意図せず公開中の内部文書を非公開に |
| docs/docs/README.md | 書き換え | 同位置 | ペルソナ別タスク索引 (A-L5 の「full documentation map」嘘を解消) |
| guides/migration/** | private維持 | 同位置 | ja の `[[seo]]` 14箇所を相対リンク化のみ |

## 4. Redirect 機構

**`alias()` プラグインを採用** (rename は route lock がマシンローカルで新規clone時に効かない、permalink は URL体系自体を変えてしまうため却下)。`aliases` frontmatterは現在vaultで0件使用のため副作用なし。

website/riebeckite.config.ts:

```ts
import { alias } from "@riebeckite/plugin-alias";
plugins: [
  // 空きスロットへ追加
  alias({ status: 301 }),
]
```

各受け皿ページの frontmatter に `aliases` (旧URL文字列, /docs/... 形式。**ja側は裸パスで書く** — l10nプラグインがmanifest段階でjaノートのredirectに /ja を自動付与するため、/ja を書くと二重になる):

| 旧URL | 受け皿 |
| --- | --- |
| /{ja/}docs/getting-started/content-location/ | getting-started/project-structure |
| /{ja/}docs/getting-started/deployment/ | guides/deployment/README |
| /{ja/}docs/guides/content-repositories/basics/ | s-c-r/concepts |
| /{ja/}docs/guides/content-repositories/setup/ | s-c-r/setup |
| /{ja/}docs/guides/content-repositories/publishing/ | s-c-r/publishing |
| /{ja/}docs/guides/deployment/separate-content-repository/repository-split/ | s-c-r/setup |
| /{ja/}docs/obsidian-plugin/ | guides/obsidian (ハブ1ページ) |
| /{ja/}docs/obsidian-plugin/architecture/ | guides/obsidian |

注記:
- aliasプラグインは末尾スラッシュ付きパスを受け付けないため、スラッシュなし形式 (`/docs/obsidian-plugin`) で登録する。旧URLがfolder URL (末尾スラッシュ付き) の `/docs/obsidian-plugin/` へのリクエストはPlausibleな静的配信の正規化に委ねる (制限として最終報告に記録)。
- en/jaの同一裸パスalias衝突 (aliasプラグインのcollision keyspaceがロケール盲) はalias本体の修正 (optional: ["content.localization"] でl10n後に実行 + 言語プレフィックス導出 + privateノート予約除外) で解消済み。

D2対象 (audits/architecture) は意図せぬ公開だったため 404 のまま自然消滅させる (報告書に記録)。

## 5. 修正台帳 (Phase 1 分類に基づく)

### B3: GLM が実施する構造変更・共通ファイル

1. 上記§3のファイル移動・統合・私的化
2. トップレベル sidebar.order 一括更新 (§2.1: philosophy 5→10, getting-started 10→20, guides 20→30, plugins 30→40, themes 50→50, reference 40→60, framework 60→70, glossary 70→80, accessibility 70→90, security 80→100, releases 7→110 + nested→flat)
3. getting-started 内 order 再割当: README 10, quick-start 20, installation 30, first-content 40, obsidian-vault 50, presets 60, project-structure 70, integrated-setup 80, separate-directories-setup 90, separate-repositories-setup 100, first-plugin 110, first-theme 120
4. security.ja.md の sidebar.label 「Security」→「セキュリティ」
5. docs/docs/README.md をペルソナ別タスク索引に書き換え (accessibility/security/releases 欠落も解消)
6. showcase en 9ファイルの frontmatter 欠落補完 (date/title)、`showcase_progress`/`showcase_priority` 削除 (C-M5)
7. website/riebeckite.config.ts へ alias() 追加
8. getting-started/README.md の章表に project-structure/obsidian-vault 等を反映 (A-H2)

### B4 (レーン1): getting-started 事実修正

- content.directory の基準直し (appRoot基準, A-H1): content-location merged content (project-structure). 表記は正典 roots.md に合わせる
- quick-start ステップ7の前提反転修正
- installation.md OG画像記述に writer 追加 (A-L3)
- docs/index.ja.md のリリースノート行欠落 (A-M3)
- releases.md showcase 自己矛盾 (A-L2)
- obsidian-vault.md トリム (詳細は guides/obsidian へ)
- separate-repositories-setup トリム (運用手順は s-c-r へ)
- `.obsidian/` 除外表記の統一 (実装=既定除外, A-L6)

### B4 (レーン2): 日英整合 (security/accessibility + 欠落節)

- security.ja.md をen構成へ再構築 (信頼境界表の「契約」列復元, A-M6)
- accessibility.md テーマ列挙を現行14テーマ化 (A-M5)、accessibility.ja.md 具体性復元 (A-M4)
- guides/README.ja.md 表3行欠落 (B-M5)
- guides/obsidian/setup.ja.md 「The basic idea」節欠落 (B-M8)
- framework/README.ja.md 「Responsibility boundaries」節欠落 (B-M5)
- themes/README.ja.md 公式テーマリンクをja版へ (C-L3)

### B4 (レーン3): framework 内部品質

- page-system/integration.md ルート例を現行scaffold (createContentRoute) へ (B-M1) + resolveRiebeckiteHomeRequest 重複排除
- architecture/packages.md 残り12パッケージの位置づけ追記 (B-M2)
- theme-system 見出し番号再構成 (B-M3)、自己参照リンク削除 (B-M4)
- 重複注意書き・図のトリム (B-M6)、sources.md hook順序訂正 (parse→onPostParsed→process→onPostProcessed)
- incremental.md 行番号参照の一般化 (B-M9)
- inspector.md 内部重複 (inspect content --list) 統合、`inspect api` をCLI表へ追記
- honox site/ui 空セクション・二重Sidebar・Related terms慣行 (W B低)
- framework 内の壊れWikiLink→相対リンク: sources.md:70 (manifest/content-graph), manifest.ja.md:34, plugin-system.ja.md:229 (D3)

### B4 (レーン4): plugins/glossary 領域

- glossary plugin 二重記載 (C-H5)、README `rr-callout` 実装整合修正 (C-H1)
- glossary README 定義再掲を更新 (C-M2: typography/user-css/preset/callout/sidenote の浮きを解消)
- glossary/{cache,plugin-cache} を定義+リンクに短縮、cache正本=framework (C-M3)
- glossary/theme.md 内部パス参照をreference/theme-apiへ (C-M3)
- themes/README + writing-a-theme から theme generator への導線追加 (C-M7)
- plugins/docs.{md,ja.md}: サイドバー位置 (左)・collapsed実体 (data-sidebar-expanded)・Exports二重typo・l10n.md LanguageSwitcher記述の修正 (D8) → sync_docs で package README 再生成
- pickable external fixes wikiLink etc (D3 リスト: glossary/content 5語, content-query, search, hreflang.ja, localization.ja, publish-strategy.ja, obsidian-markdown×2, showcase/obsidian-syntax×2, migration ja 14本)

### B5: 検査強化

- check_docs.mjs に WikiLink 解決検査を追加 (§B-H1/D3 の再発防止。ja 側の既存構文も検査対象に)
- 予期しない出力増加 (old aliases) がRule 1〜5に与える影響を確認

### B6: ビルド検証

`pnpm --filter website build` (または該当スクリプト) → dist で:
- _redirects に全旧URL→新URL 301 が含まれること (§4表)
- sitemap から obsidian-plugin/audits/architecture/migration が消えていること
- jaサイドバー・hreflang・壊れリンク (rr-obsidian-wikilink--broken) が消えていること
- glossary 孤立ページ・前後ナビの変化を記録

## 6. スコープ外 (報告のみ)

framework 本体コードの問題はドキュメント刷新と分離して最終報告に記載:
- D4: jaサイドバー現在地ハイライト不具合 (navigation isActive)
- D5: DocsSidebar二重描画・全項目DOM出力 (パフォーマンス)
- D6: ja UIラベル英語固定・RSS language・x-default無し
- plugins/ 85本のサイドバー階層化 (docs プラグインがフォルダ構造しか階層化しない)

## 7. 並列作業制約

- レーン1〜4のファイル集合は互いに完全分離
- frontmatter の order/hidden/label は B3 の値 (§5 B3) を正とする。レーンはorder値を変更しない
- 各レーン完了後に check_docs.mjs を実行し自己検証
