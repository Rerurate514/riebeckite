import { fence } from "./readme_demos_fence.js";
import type { ReadmeDemo } from "./readme_demos_types.js";

export const README_DEMOS_B: Readonly<Record<string, ReadmeDemo>> = {
  "@riebeckite/plugin-map": {
    title: { en: "Maps", ja: "地図" },
    intro: {
      en: "A `map` fence embeds an OpenStreetMap: a static fallback (coordinates and links) first, upgraded to an interactive map when JavaScript is available.",
      ja: "`map` フェンスが OpenStreetMap を埋め込みます。まず静的なフォールバック（座標とリンク）を表示し、JavaScript がある場合はインタラクティブな地図に拡張します。",
    },
    markdown: fence(
      "map",
      [
        "center: 35.6812, 139.7671",
        "zoom: 13",
        "label: Tokyo Station",
        "markers:",
        "  - 35.6812, 139.7671 | Tokyo Station",
        "  - 35.6586, 139.7454 | Tokyo Tower",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-marp": {
    title: { en: "Marp slides", ja: "Marp スライド" },
    intro: {
      en: "A `marp` fence renders slides, separated by `---`.",
      ja: "`marp` フェンスがスライドとして描画されます。スライドは `---` で区切ります。",
    },
    markdown: fence(
      'marp title="Intro deck"',
      ["# First slide", "", "- a bullet", "", "---", "", "# Second slide"].join(
        "\n",
      ),
    ),
  },
  "@riebeckite/plugin-qr-code": {
    title: { en: "QR codes", ja: "QR コード" },
    intro: {
      en: "A `qr` fence becomes an inline SVG QR code, encoded entirely at build time.",
      ja: "`qr` フェンスがインライン SVG の QR コードになります（ビルド時に全てエンコードされます）。",
    },
    markdown: fence("qr", "# caption: Project page\nhttps://example.com/"),
  },
  "@riebeckite/plugin-rich-embed": {
    title: { en: "Rich embeds", ja: "リッチ埋め込み" },
    intro: {
      en: "An `embed` fence turns a URL into a YouTube, Vimeo, Spotify, CodePen, or Gist embed.",
      ja: "`embed` フェンスの URL が YouTube・Vimeo・Spotify・CodePen・Gist の埋め込みになります。",
    },
    markdown: fence(
      "embed",
      [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "title: Demo video",
        "caption: A short caption",
        "aspect: 16/9",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-gallery": {
    title: { en: "Gallery cards", ja: "ギャラリーカード" },
    intro: {
      en: "A `gallery` YAML fence renders a responsive grid of cards — handy for theme or project showcases.",
      ja: "`gallery` の YAML フェンスがレスポンシブなカードグリッドを描画します。テーマやプロジェクトの紹介に便利です。",
    },
    markdown: fence(
      "gallery",
      [
        "columns: 3",
        "items:",
        "  - title: Default",
        "    description: A clean, typographic theme.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/default",
        "  - title: Minimal",
        "    description: Stripped back to the essentials.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/minimal",
        "  - title: Gruvbox",
        "    description: A warm, high-contrast palette.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/gruvbox",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-dataview": {
    title: { en: "Dataview", ja: "Dataview" },
    intro: {
      en: "A `dataview` query renders a table of notes from the manifest.",
      ja: "`dataview` クエリがマニフェストからノート一覧を描画します。",
    },
    markdown: fence(
      "dataview",
      [
        'TABLE file.name AS "Name", status',
        "FROM #project",
        'WHERE status = "active"',
        "SORT file.name asc",
        "LIMIT 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-query": {
    title: { en: "Query", ja: "Query" },
    intro: {
      en: "A `query` fence is YAML that filters and sorts entries from the manifest.",
      ja: "`query` フェンスの YAML でマニフェストのエントリを絞り込み・並べ替えできます。",
    },
    markdown: fence(
      "query",
      [
        "filter:",
        "  tags:",
        "    any: [diary]",
        "sort:",
        "  field: date",
        "  order: desc",
        "limit: 5",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-bases": {
    title: { en: "Base views", ja: "Base ビュー" },
    intro: {
      en: "A `base` YAML fence renders a Base table view.",
      ja: "`base` YAML フェンスが Base のテーブルビューを描画します。",
    },
    markdown: fence(
      "base",
      [
        "filters:",
        "  and:",
        '    - file.hasTag("featured")',
        "properties:",
        "  file.name:",
        "    displayName: Title",
        "views:",
        "  - type: table",
        "    name: Featured",
        "    limit: 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-kanban": {
    title: { en: "Kanban boards", ja: "カンバンボード" },
    intro: {
      en: "A note whose body is `##` columns of task lists becomes a board; `#tags` and `[[wikilinks]]` work inside cards.",
      ja: "本文が `##` 列とタスクリストでできたノートはボードになります。カード内では `#タグ` や `[[ウィキリンク]]` も使えます。",
    },
    markdown: fence(
      "md",
      [
        "## Backlog",
        "",
        "- [ ] Draft the release notes",
        "- [ ] Link to [[index]]",
        "",
        "## Done",
        "",
        "- [x] Publish the fixture",
      ].join("\n"),
    ),
  },
};
