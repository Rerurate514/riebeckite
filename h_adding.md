# 追加すべき画像・サンプルファイル（あとでやる）

ドキュメント監査の結果。`docs/` を対象に、画像やサンプルファイルがないと分かりづらい箇所を優先度順に列挙する。

## 前提・編集ルール

- 画像置き場は `docs/assets/`（現状はロゴ4点と `HW.md` のみ）。
- プラグインページ `docs/docs/plugins/*.md` は正本。画像を足す場合は**docs 側を編集 → `pnpm docs:sync`**で package README を生成する。
- テーマページ `docs/docs/themes/*.md` は手書き。
- 各ページの `.ja.md` ミラーを同期する。
- ドキュメントサイトをビルドすれば `showcase` 等で実物を確認できるが、GitHub / ソース表示ではレンダリングされない。そのため静的画像・フィクスチャが必要。

---

## 優先度A: テーマ（文章では外観を伝えられない）

- [ ] `docs/docs/themes/README.md` L242–253 / L255–333 — 6テーマ（Default / Minimal / Gruvbox / Rerurate / Sakura / Tokyo Night）を形容のみで説明。全テーマのライト/ダーク比較スクリーンショットを追加。
- [ ] `docs/docs/themes/default.md` — プレビュー画像。
- [ ] `docs/docs/themes/minimal.md` — プレビュー画像。
- [ ] `docs/docs/themes/gruvbox.md` — プレビュー画像。
- [ ] `docs/docs/themes/rerurate.md` — プレビュー画像。
- [ ] `docs/docs/themes/sakura.md` — プレビュー画像。
- [ ] `docs/docs/themes/tokyonight.md` — プレビュー画像。
- [ ] `docs/docs/getting-started/first-theme.md` L47 — default→minimal のビフォーアフター画像。
- [ ] `docs/docs/getting-started/presets.md` L31–36 / L40–54 — プリセット別スクリーンショット（showcase は既存フィクスチャを流用可能）。
- [ ] `docs/docs/framework/theme-system/tokens.md` L32–64 — 色トークンのスウォッチ図（任意）。

## 優先度B: 図・ダイアグラム系プラグイン

- [ ] `docs/docs/plugins/wavedrom.md` L34–56 — タイミング図の完成例。
- [ ] `docs/docs/plugins/excalibrain.md` L12–22 / L95–107 / L155–164 — 7領域レイアウトのレンダリング画像。
- [ ] `docs/docs/plugins/canvas.md` L25–28 / L33–58 — サンプル `.canvas` ＋ static/client/both の表示。
- [ ] `docs/docs/plugins/excalidraw.md` L11–15 / L50–53 — サンプル `.excalidraw` ＋埋め込み表示。
- [ ] `docs/docs/plugins/map.md` L42–75 / L80–97 — 地図のスクリーンショット（静的フォールバックと操作後の2状態）。
- [ ] `docs/docs/plugins/mermaid.md` L34–76 — レンダリング結果の例。
- [ ] `docs/docs/plugins/d2.md` L55–72 — レンダリング結果の例。
- [ ] `docs/docs/plugins/graphviz.md` — レンダリング結果の例。
- [ ] `docs/docs/plugins/plantuml.md` — サーバレンダリング結果。
- [ ] `docs/docs/plugins/chartjs.md` L34–63 — 描画後のチャート画像。
- [ ] `docs/docs/plugins/vega-lite.md` L36–52 — 描画後のチャート画像。
- [ ] `docs/docs/plugins/markmap.md` L37–47 — マインドマップの完成図。
- [ ] `docs/docs/plugins/marp.md` L55–64 — スライド表示のスクリーンショット。

## 優先度C: メディア・ファイル依存

- [ ] `docs/docs/plugins/pdf.md` L11–13 — サンプル `report.pdf` ＋インライン表示。
- [ ] `docs/docs/plugins/media.md` L33–34 — サンプル音声/動画 ＋プレーヤー表示。
- [ ] `docs/docs/plugins/attachment.md` L13 — 非画像サンプル ＋添付カード表示。
- [ ] `docs/docs/plugins/gallery.md` L13–29 / L75–92 — カードグリッドの表示。
- [ ] `docs/docs/plugins/lightbox.md` L33–54 — クリック拡大のビフォーアフター（GIF推奨）。
- [ ] `docs/docs/plugins/qr-code.md` L37–41 — 生成QRコードの実物。
- [ ] `docs/docs/plugins/responsive-image.md` — `picture`/srcset の結果。
- [ ] `docs/docs/plugins/rich-embed.md` — 埋め込みカードの表示。
- [ ] `docs/docs/plugins/autocardlink.md` — リンクカードの表示。

## 優先度D: インタラクティブUI系

- [ ] `docs/docs/plugins/sidenotes.md` L14–29 / L68–82 — デスクトップ/モバイルの2状態。
- [ ] `docs/docs/plugins/hover-preview.md` L16–18 — ホバーポップオーバーのGIF。
- [ ] `docs/docs/plugins/text-fragment.md` L10–18 / L36–58 — 選択→ポップオーバー→URL生成。
- [ ] `docs/docs/plugins/flashcards.md` L82–96 — めくり・移動のGIF。
- [ ] `docs/docs/plugins/kanban.md` L39–49 / L65–81 — ボード表示。
- [ ] `docs/docs/plugins/local-graph.md` L12–25 — 放射状グラフ。
- [ ] `docs/docs/plugins/garden-explorer.md` L12–23 / L35–58 — 3パネルUIと force/radial の違い。
- [ ] `docs/docs/plugins/code-annotations.md` — annotation記法→DOMの対応図。
- [ ] `docs/docs/plugins/ux.md` / `search.md` / `toc.md` / `share.md` / `code-tabs.md` / `color-mode.md` — UIのスクリーンショット（中優先）。

## 優先度E: サンプルVault・プレースホルダ

- [ ] `docs/docs/getting-started/obsidian-vault.md` L88–107 — 例示している `![[sample.png]]` 等の実体／最小サンプルVault。
- [ ] `docs/docs/getting-started/obsidian-vault.md` L119–138 — プラグインON/OFFの比較。
- [ ] `docs/docs/guides/writing-content.md` L116 / L307 / L313 — 実在するサンプル画像。
- [ ] `docs/docs/plugins/showcase.md` — 主要プラグインの静止画/GIF（GitHubでは結果が見えない）。

---

## 進め方メモ

- 効果が大きい順: A（テーマ比較）→ B の wavedrom/excalibrain/canvas/excalidraw/map → C の pdf/media/attachment → D の sidenotes/hover-preview/flashcards/lightbox。
- テーマ比較は基準記事を1本決めて撮れば、6テーマ分とプリセット差分をまとめて作れる。
- B/C のフィクスチャは `showcase` プリセット（`presets.md` L50）の既存素材を流用できる可能性が高い。
