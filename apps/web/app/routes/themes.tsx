import { createRoute } from "honox/factory";
import { buildWebsiteSeo } from "../lib/seo";

type ThemePreview = {
  id: string;
  theme: string;
  label: string;
  mode: "light" | "dark";
  attrs?: Record<string, string>;
};

/**
 * One entry per preview. `theme` must match the theme's identity name, which
 * is the `data-theme-name` its stylesheet is scoped to. `attrs` carries the
 * theme-specific option attributes that switch variants on.
 */
const previews: ThemePreview[] = [
  {
    id: "riebeckite-light",
    theme: "riebeckite",
    label: "light",
    mode: "light",
  },
  { id: "riebeckite-dark", theme: "riebeckite", label: "dark", mode: "dark" },
  { id: "minimal-light", theme: "minimal", label: "light", mode: "light" },
  { id: "minimal-dark", theme: "minimal", label: "dark", mode: "dark" },
  {
    id: "gruvbox-light",
    theme: "gruvbox",
    label: "light · medium contrast",
    mode: "light",
  },
  {
    id: "gruvbox-dark",
    theme: "gruvbox",
    label: "dark · medium contrast",
    mode: "dark",
  },
  {
    id: "rerurate-light",
    theme: "rerurate",
    label: "light · motion · drop cap · medium",
    mode: "light",
    attrs: { "data-rerurate-initial": "on" },
  },
  {
    id: "rerurate-large",
    theme: "rerurate",
    label: "light · motion · drop cap · large",
    mode: "light",
    attrs: {
      "data-rerurate-initial": "on",
      "data-rerurate-initial-size": "large",
    },
  },
  {
    id: "rerurate-headings-large",
    theme: "rerurate",
    label: "light · motion · drop cap · large headings",
    mode: "light",
    attrs: {
      "data-rerurate-initial": "on",
      "data-rerurate-headings": "large",
    },
  },
  {
    id: "rerurate-motion-off",
    theme: "rerurate",
    label: "light · motion off · drop cap",
    mode: "light",
    attrs: {
      "data-rerurate-initial": "on",
      "data-rerurate-motion": "off",
    },
  },
  {
    id: "rerurate-still",
    theme: "rerurate",
    label: "light · motion off",
    mode: "light",
    attrs: { "data-rerurate-motion": "off" },
  },
  {
    id: "rerurate-no-marks",
    theme: "rerurate",
    label: "light · motion · drop cap · no heading marks",
    mode: "light",
    attrs: {
      "data-rerurate-initial": "on",
      "data-rerurate-heading-marks": "off",
    },
  },
  {
    id: "sakura-light",
    theme: "sakura",
    label: "light · decorated · soft",
    mode: "light",
  },
  {
    id: "sakura-dark",
    theme: "sakura",
    label: "dark · decorated · soft",
    mode: "dark",
  },
  {
    id: "sakura-vivid",
    theme: "sakura",
    label: "light · plain · crisp · vivid",
    mode: "light",
    attrs: {
      "data-sakura-heading": "plain",
      "data-sakura-roundness": "crisp",
      "data-sakura-bloom": "vivid",
    },
  },
  {
    id: "tokyonight-light",
    theme: "tokyonight",
    label: "light · tech · cozy",
    mode: "light",
  },
  {
    id: "tokyonight-dark",
    theme: "tokyonight",
    label: "dark · tech · cozy",
    mode: "dark",
  },
  {
    id: "tokyonight-neon",
    theme: "tokyonight",
    label: "dark · tech · cozy · neon",
    mode: "dark",
    attrs: { "data-tokyonight-neon": "on" },
  },
  {
    id: "tokyonight-compact",
    theme: "tokyonight",
    label: "dark · plain · compact",
    mode: "dark",
    attrs: {
      "data-tokyonight-heading": "plain",
      "data-tokyonight-density": "compact",
    },
  },
];

export default createRoute(async (c) => {
  c.set(
    "seo",
    buildWebsiteSeo({
      title: "Theme gallery",
      description:
        "Compare every built-in Riebeckite theme with the same sample article: typography, spacing, surfaces, and component chrome.",
      path: "/themes",
    }),
  );
  c.set("headTags", []);

  return c.render(
    <main class="theme-gallery">
      <header class="theme-gallery__header">
        <p class="theme-gallery__eyebrow">Riebeckite</p>
        <h1 class="theme-gallery__title">Theme gallery</h1>
        <p class="theme-gallery__intro">
          各テーマを同じサンプル記事で並べています。色だけでなく、組版・余白・
          罫線・角丸・部品の違いを比較できます。
        </p>
      </header>
      <div class="theme-gallery__list">
        {previews.map((preview) => (
          <section class="theme-gallery__item" key={preview.id}>
            <header class="theme-gallery__caption">
              <span class="theme-gallery__name">{preview.theme}</span>
              <span class="theme-gallery__meta">{preview.label}</span>
            </header>
            <div class="theme-gallery__frame">
              <div
                class="rb-theme-root theme-gallery__preview"
                data-theme-name={preview.theme}
                data-theme={preview.mode}
                {...(preview.attrs ?? {})}
              >
                <SampleArticle title={preview.theme} id={preview.id} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>,
  );
});

/**
 * A single sample article exercising the stable hooks a theme may style:
 * headings, lists, code, table, a callout, a TOC, and backlinks.
 */
function SampleArticle(props: { title: string; id: string }) {
  const demoId = `sample-${props.id}`;
  const codeLines = [
    "export const theme = defineTheme({",
    `  name: "${props.title}",`,
    '  options: { density: "cozy" },',
    "});",
  ];
  return (
    <article class="rb-article">
      <header class="rb-article-header">
        <h1>{props.title}</h1>
      </header>
      <p class="rb-article-meta">テーマ見本 · 2026</p>
      <div class="rb-article-body">
        <p>
          この段落はテーマの本文組版を示します。インラインコードは
          <code>const theme = "{props.title}"</code> のように表示され、
          <a href={`#${demoId}`}>リンク</a>や<strong>強調</strong>、
          <em>斜体</em>
          も含みます。
        </p>
        <h2 id={demoId}>見出しレベル2</h2>
        <p>
          Riebeckite
          のテーマは色だけでなく、余白・罫線・角丸・組版まで変えられます。
          段落のリズムと見出しの階層に注目してください。
        </p>
        <h3>補足的な見出し</h3>
        <p>h3 までの階層を用意し、見出しサイズの差も比較できます。</p>
        <blockquote>
          <p>引用はテーマごとに異なる表情を持ちます。</p>
        </blockquote>
        <h3 id={`${demoId}-toc`}>箇条書き</h3>
        <ul>
          <li>設計トークンで色を決める</li>
          <li>安定したフックで構造を組む</li>
          <li>テーマ固有のバリアントで個性を出す</li>
        </ul>
        <ol>
          <li>トークン</li>
          <li>キャラクター層</li>
          <li>バリアント</li>
        </ol>
        <h3>コード</h3>
        <div class="rr-code">
          <div class="rr-code__body">
            <pre class="rr-code__pre">
              <code class="rr-code__code">
                {codeLines.map((line) => (
                  <span class="rr-code__line" key={line}>
                    {line}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </div>
        <h3>表</h3>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>役割</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>paper</td>
              <td>背景</td>
            </tr>
            <tr>
              <td>ink</td>
              <td>本文</td>
            </tr>
            <tr>
              <td>accent</td>
              <td>強調</td>
            </tr>
          </tbody>
        </table>
        <div class="rr-callout callout callout-note" data-callout="note">
          <div class="callout-title">
            <div class="callout-icon" />
            <div class="callout-title-inner">Note</div>
          </div>
          <div class="callout-content">
            <p>
              コールアウトは <code>.rr-callout</code> フックでスタイルされます。
            </p>
          </div>
        </div>
        <nav class="rr-table-of-contents">
          <p>目次</p>
          <ul>
            <li>
              <a href={`#${demoId}`}>見出しレベル2</a>
            </li>
            <li>
              <a href={`#${demoId}-toc`}>箇条書き</a>
            </li>
          </ul>
        </nav>
        <aside class="rr-backlinks">
          <h2 id={`${demoId}-backlinks`}>バックリンク</h2>
          <ul>
            <li>
              <a href={`#${demoId}-backlinks`}>関連するノート</a>
            </li>
          </ul>
        </aside>
        <hr />
      </div>
      <footer class="rb-article-footer">
        <p>記事フッター（.rb-article-footer）の見本です。</p>
      </footer>
    </article>
  );
}
