import type { WebLocale } from "../lib/locale";
import {
  getShowcaseFixtures,
  getShowcaseThemes,
  getThemeDocsHref,
} from "../lib/theme-showcase";

export function ThemeShowcase({ locale }: { locale: WebLocale }) {
  const themes = getShowcaseThemes(locale);
  const fixtures = getShowcaseFixtures(locale);
  const japanese = locale === "ja";
  const serializedFixtures = JSON.stringify(
    Object.fromEntries(
      fixtures.map((fixture) => [fixture.id, fixture.markdown]),
    ),
  );
  const serializedPages = JSON.stringify(
    Object.fromEntries(
      fixtures
        .filter((fixture) => fixture.pages)
        .map((fixture) => [
          fixture.id,
          { currentPageId: fixture.currentPageId, pages: fixture.pages },
        ]),
    ),
  );
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
        <div
          class="theme-showcase__workspace"
          data-plugin-preview
          data-preview-plugin="theme-showcase"
          data-preview-fixtures={serializedFixtures}
          data-preview-pages={serializedPages}
        >
          <output data-preview-status aria-live="polite">
            {japanese ? "プレビューを準備中" : "Preparing preview"}
          </output>
          <div class="theme-showcase__controls">
            <label>
              {japanese ? "テーマ" : "Theme"}
              <select data-preview-theme>
                {themes.map((theme) => (
                  <option value={theme.name} key={theme.name}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {japanese ? "カラーモード" : "Color mode"}
              <select data-preview-mode>
                <option value="light">{japanese ? "ライト" : "Light"}</option>
                <option value="dark">{japanese ? "ダーク" : "Dark"}</option>
                <option value="system" selected>
                  {japanese ? "システム" : "System"}
                </option>
              </select>
            </label>
            <label>
              {japanese ? "サンプル" : "Sample"}
              <select data-preview-fixture>
                {fixtures.map((fixture) => (
                  <option value={fixture.id} key={fixture.id}>
                    {fixture.title}
                  </option>
                ))}
              </select>
            </label>
            <label hidden>
              {japanese ? "ページ" : "Page"}
              <select data-preview-page />
            </label>
            <div data-preview-theme-settings />
            <fieldset class="theme-showcase__devices">
              <legend>{japanese ? "表示幅" : "Viewport"}</legend>
              <button
                type="button"
                data-preview-device="desktop"
                aria-pressed="true"
              >
                {japanese ? "デスクトップ" : "Desktop"}
              </button>
              <button
                type="button"
                data-preview-device="tablet"
                aria-pressed="false"
              >
                {japanese ? "タブレット" : "Tablet"}
              </button>
              <button
                type="button"
                data-preview-device="mobile"
                aria-pressed="false"
              >
                {japanese ? "モバイル" : "Mobile"}
              </button>
            </fieldset>
            <button type="button" data-preview-reset>
              {japanese ? "プレビューをリセット" : "Reset preview"}
            </button>
          </div>
          <textarea data-preview-markdown hidden>
            {fixtures[0].markdown}
          </textarea>
          <div
            class="theme-showcase__frame-wrap"
            data-preview-viewport="desktop"
          >
            <iframe
              data-preview-frame
              title={japanese ? "テーマプレビュー" : "Theme preview"}
              sandbox=""
            />
          </div>
          <ul
            class="theme-showcase__diagnostics"
            data-preview-diagnostics
            aria-live="polite"
          />
        </div>
      </section>

      <section class="theme-showcase__detail" aria-labelledby="detail-title">
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
        <button type="button" data-theme-copy>
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
