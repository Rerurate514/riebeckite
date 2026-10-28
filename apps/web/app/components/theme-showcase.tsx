import type { WebLocale } from "../lib/locale";
import { getShowcaseThemes, getThemeDocsHref } from "../lib/theme-showcase";
import { ThemePreview } from "./theme-preview";

export function ThemeShowcase({ locale }: { locale: WebLocale }) {
  const themes = getShowcaseThemes(locale);
  const japanese = locale === "ja";
  return (
    <div
      class="theme-showcase"
      data-theme-showcase
      data-theme-showcase-locale={locale}
    >
      <header class="theme-showcase__header">
        <p class="theme-showcase__eyebrow">
          {japanese ? "Riebeckite テーマ" : "Riebeckite themes"}
        </p>
        <h1>
          {japanese
            ? "読むための最適なテーマを見つけよう。"
            : "Find the right reading surface."}
        </h1>
        <p>
          {japanese
            ? "すべての公式テーマを、実際の Markdown レンダリングで比較できます。このページでコンテンツ、カラーモード、表示幅を切り替えられます。"
            : "Compare every official theme with real Markdown rendering. Change the content, color mode, and viewport without leaving this page."}
        </p>
      </header>

      <section class="theme-showcase__preview" aria-labelledby="preview-title">
        <div class="theme-showcase__section-heading">
          <div>
            <p class="theme-showcase__eyebrow">
              {japanese ? "インタラクティブプレビュー" : "Interactive preview"}
            </p>
            <h2 id="preview-title">
              {japanese ? "テーマを試す" : "Try a theme"}
            </h2>
          </div>
        </div>
        <p class="theme-showcase__preview-notice">
          {japanese
            ? "このプレビューにはプラグインが反映されないため、画像やコードブロックなどの表示は本番サイトと若干異なる場合があります。"
            : "Plugins are not applied in this preview, so images, code blocks, and other content may look slightly different on your published site."}
        </p>
        <ThemePreview locale={locale} mode="gallery" />
      </section>

      <section
        class="theme-showcase__detail"
        data-preview-configuration
        aria-labelledby="detail-title"
      >
        <p class="theme-showcase__eyebrow">
          {japanese ? "選択中のテーマ" : "Selected theme"}
        </p>
        <h2 id="detail-title" data-theme-detail-name>
          Default
        </h2>
        <p data-theme-detail-description />
        <div class="theme-showcase__detail-meta">
          <code data-theme-detail-package />
          <a
            data-theme-detail-docs
            href={getThemeDocsHref("riebeckite", locale)}
          >
            {japanese ? "テーマドキュメント" : "Theme documentation"}
          </a>
        </div>
        <pre>
          <code data-theme-detail-code />
        </pre>
        <button
          type="button"
          data-theme-copy
          data-preview-copy-success={japanese ? "コピーしました" : "Copied"}
          data-preview-copy-failure={
            japanese ? "コピーできませんでした" : "Copy failed"
          }
        >
          {japanese ? "設定をコピー" : "Copy configuration"}
        </button>
      </section>

      <section class="theme-showcase__gallery" aria-labelledby="gallery-title">
        <div class="theme-showcase__section-heading">
          <div>
            <p class="theme-showcase__eyebrow">
              {japanese ? "公式コレクション" : "Official collection"}
            </p>
            <h2 id="gallery-title">
              {japanese ? "用途から選ぶ" : "Choose by purpose"}
            </h2>
          </div>
          <p>
            {japanese
              ? `公式テーマ ${themes.length} 種`
              : `${themes.length} official themes`}
          </p>
        </div>
        <div class="theme-showcase__theme-list">
          {themes.map((theme) => (
            <article
              class="theme-showcase__theme"
              key={theme.name}
              data-theme-card={theme.name}
            >
              <div>
                <h3>{theme.label}</h3>
                <p>{theme.description}</p>
              </div>
              <ul>
                {theme.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div class="theme-showcase__theme-actions">
                <button type="button" data-theme-select={theme.name}>
                  {japanese ? "プレビューを開く" : "Open preview"}
                </button>
                <a href={getThemeDocsHref(theme.name, locale)}>
                  {japanese ? "ドキュメント" : "Docs"}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
