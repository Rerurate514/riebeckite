import type { WebLocale } from "../lib/locale";
import { getShowcaseFixtures, getShowcaseThemes } from "../lib/theme-showcase";

export function ThemePreview({
  locale,
  themeId,
  mode,
}: {
  locale: WebLocale;
  themeId?: string;
  mode: "gallery" | "single";
}) {
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
  const selectedTheme = themeId ?? themes[0].name;
  return (
    <div
      class="theme-showcase__workspace"
      data-plugin-preview
      data-preview-plugin="theme-showcase"
      data-preview-fixtures={serializedFixtures}
      data-preview-pages={serializedPages}
      data-theme-preview-mode={mode}
    >
      <output data-preview-status aria-live="polite">
        {japanese ? "プレビューを準備中" : "Preparing preview"}
      </output>
      <div class="theme-showcase__controls">
        <div class="theme-showcase__toolbar">
          <label class="theme-showcase__control" hidden={mode === "single"}>
            <span class="theme-showcase__control-label">
              {japanese ? "テーマ" : "Theme"}
            </span>
            <select data-preview-theme>
              {themes.map((theme) => (
                <option
                  value={theme.name}
                  selected={theme.name === selectedTheme}
                  key={theme.name}
                >
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          {mode === "single" && (
            <select data-preview-theme hidden>
              <option value={selectedTheme} selected />
            </select>
          )}
          <label class="theme-showcase__control">
            <span class="theme-showcase__control-label">
              {japanese ? "カラーモード" : "Color mode"}
            </span>
            <select data-preview-mode>
              <option value="light">{japanese ? "ライト" : "Light"}</option>
              <option value="dark">{japanese ? "ダーク" : "Dark"}</option>
              <option value="system" selected>
                {japanese ? "システム" : "System"}
              </option>
            </select>
          </label>
          <label class="theme-showcase__control">
            <span class="theme-showcase__control-label">
              {japanese ? "サンプル" : "Sample"}
            </span>
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
          <fieldset class="theme-showcase__devices">
            <legend>{japanese ? "表示幅" : "Viewport"}</legend>
            <div class="theme-showcase__segmented">
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
            </div>
          </fieldset>
          <button
            class="theme-showcase__reset"
            type="button"
            data-preview-reset
          >
            {japanese ? "プレビューをリセット" : "Reset preview"}
          </button>
        </div>
        <div class="theme-showcase__settings">
          <p class="theme-showcase__eyebrow">
            {japanese ? "テーマ設定" : "Theme settings"}
          </p>
          <div
            class="theme-showcase__settings-grid"
            data-preview-theme-settings
          />
        </div>
      </div>
      <textarea data-preview-markdown hidden>
        {fixtures[0].markdown}
      </textarea>
      <div class="theme-showcase__frame-wrap" data-preview-viewport="desktop">
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
  );
}

export function ThemeDocumentationPreview({
  locale,
  themeId,
}: {
  locale: WebLocale;
  themeId: string;
}) {
  const theme = getShowcaseThemes(locale).find((item) => item.name === themeId);
  if (!theme) return null;
  const japanese = locale === "ja";
  return (
    <section
      class="theme-documentation-preview"
      data-theme-documentation-preview
      aria-labelledby={`theme-preview-${themeId}`}
    >
      <div class="theme-showcase__section-heading">
        <div>
          <p class="theme-showcase__eyebrow">
            {japanese ? "インタラクティブプレビュー" : "Interactive preview"}
          </p>
          <h2 id={`theme-preview-${themeId}`}>
            {japanese ? `${theme.label} を試す` : `Try ${theme.label}`}
          </h2>
        </div>
      </div>
      <p class="theme-showcase__preview-notice">
        {japanese
          ? "このプレビューにはプラグインが反映されないため、本番サイトと表示が少し異なる場合があります。"
          : "Plugins are not applied in this preview, so it may differ slightly from your published site."}
      </p>
      <ThemePreview locale={locale} themeId={themeId} mode="single" />
      <div
        class="theme-documentation-preview__configuration"
        data-preview-configuration
      >
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
      </div>
    </section>
  );
}
