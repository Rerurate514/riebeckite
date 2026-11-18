export type UiLabels = {
  documentation: string;
  tableOfContents: string;
  menu: string;
  navigation: string;
  primaryNavigation: string;
  secondaryNavigation: string;
  footerNavigation: string;
};

const en: UiLabels = {
  documentation: "Documentation",
  tableOfContents: "Table of contents",
  menu: "Menu",
  navigation: "Navigation",
  primaryNavigation: "Primary navigation",
  secondaryNavigation: "Secondary navigation",
  footerNavigation: "Footer navigation",
};

const ja: UiLabels = {
  documentation: "ドキュメント",
  tableOfContents: "目次",
  menu: "メニュー",
  navigation: "ナビゲーション",
  primaryNavigation: "主要ナビゲーション",
  secondaryNavigation: "補助ナビゲーション",
  footerNavigation: "フッターナビゲーション",
};

export function resolveUiLabels(
  language: string | undefined,
): UiLabels {
  return language && /^ja($|[-_])/i.test(language) ? ja : en;
}
