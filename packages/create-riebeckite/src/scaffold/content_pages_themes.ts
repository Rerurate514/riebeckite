import {
  codeBlock,
  frontmatter,
  GALLERY_PACKAGE,
  heading,
  type LocalizedText,
  read,
  THEMES_INDEX_URL,
  themeReadmeUrl,
} from "./content_pages_shared.js";
import type { ScaffoldLanguage, ScaffoldPreset } from "./presets.js";
import { fence, hasPlugin } from "./readme_demos.js";

type ThemeRow = {
  /** Package slug (after `@riebeckite/theme-`) and README directory. */
  readonly slug: string;
  readonly factory: string;
  readonly desc: LocalizedText;
};

type ThemesCopy = {
  readonly title: LocalizedText;
  readonly intro: LocalizedText;
  readonly galleryHeading: LocalizedText;
  readonly switchHeading: LocalizedText;
  readonly switchCurrent: LocalizedText;
  readonly switchStep1: LocalizedText;
  readonly switchStep2: LocalizedText;
  readonly tableHeading: LocalizedText;
  readonly columnTheme: LocalizedText;
  readonly columnDescription: LocalizedText;
  readonly note: LocalizedText;
};

const THEMES_COPY: ThemesCopy = {
  title: {
    en: "Themes",
    ja: "テーマ",
    "zh-CN": "主题",
    es: "Temas",
    de: "Themen",
    fr: "Thèmes",
    ko: "테마",
  },
  intro: {
    en: "A theme changes the whole look and feel of a site — colors, typography, and layout — without touching your content or routes. Riebeckite ships with six themes; switch by installing a package and changing one line.",
    ja: "テーマを変えるだけで、色・文字組み・レイアウトといったサイト全体の見た目が変わります。コンテンツやルートには一切触れる必要はありません。Riebeckite には 6 つのテーマが用意されており、パッケージをインストールして 1 行書き換えるだけで切り替えられます。",
    "zh-CN":
      "主题能整体改变站点的观感——配色、排版与布局——而无需改动你的内容或路由。Riebeckite 内置六个主题，安装一个包、改一行配置即可切换。",
    es: "Un tema cambia toda la apariencia del sitio — colores, tipografía y diseño — sin tocar tu contenido ni tus rutas. Riebeckite incluye seis temas: instala un paquete y cambia una línea.",
    de: "Ein Theme verändert das gesamte Erscheinungsbild einer Seite — Farben, Typografie, Layout — ohne dass du Inhalte oder Routen anfasst. Riebeckite bringt sechs Themes mit; der Wechsel ist eine Paketinstallation plus eine Zeile.",
    fr: "Un thème change tout l'aspect d'un site — couleurs, typographie, mise en page — sans toucher au contenu ni aux routes. Riebeckite fournit six thèmes ; installez un paquet et changez une ligne.",
    ko: "테마를 바꾸면 색상·타이포그래피·레이아웃 등 사이트 전체 분위기가 달라집니다. 콘텐츠나 라우트는 건드릴 필요가 없습니다. Riebeckite는 6개 테마를 제공하며 패키지 설치 후 한 줄만 바꾸면 전환됩니다.",
  },
  galleryHeading: {
    en: "Theme gallery",
    ja: "テーマギャラリー",
    "zh-CN": "主题画廊",
    es: "Galería de temas",
    de: "Theme-Galerie",
    fr: "Galerie des thèmes",
    ko: "테마 갤러리",
  },
  switchHeading: {
    en: "Switching themes",
    ja: "テーマの切り替え",
    "zh-CN": "切换主题",
    es: "Cambiar de tema",
    de: "Theme wechseln",
    fr: "Changer de thème",
    ko: "테마 전환",
  },
  switchCurrent: {
    en: "This starter uses `@riebeckite/theme-default`. To try another theme:",
    ja: "このスターターは `@riebeckite/theme-default` を使っています。別のテーマを試すには：",
    "zh-CN": "本模板使用 `@riebeckite/theme-default`。想尝试其他主题：",
    es: "Este starter usa `@riebeckite/theme-default`. Para probar otro tema:",
    de: "Dieser Starter verwendet `@riebeckite/theme-default`. Um ein anderes Theme zu testen:",
    fr: "Ce starter utilise `@riebeckite/theme-default`. Pour essayer un autre thème :",
    ko: "이 스타터는 `@riebeckite/theme-default`를 사용합니다. 다른 테마를 시도하려면:",
  },
  switchStep1: {
    en: "Install the package:",
    ja: "パッケージをインストール：",
    "zh-CN": "安装该包：",
    es: "Instala el paquete:",
    de: "Installiere das Paket:",
    fr: "Installez le paquet :",
    ko: "패키지를 설치합니다:",
  },
  switchStep2: {
    en: "Point `theme` at the new factory in `riebeckite.config.ts`:",
    ja: "`riebeckite.config.ts` の `theme` を新しいファクトリに変更：",
    "zh-CN": "在 `riebeckite.config.ts` 中将 `theme` 指向新工厂函数：",
    es: "Apunta `theme` al nuevo factory en `riebeckite.config.ts`:",
    de: "Setze `theme` in `riebeckite.config.ts` auf den neuen Factory:",
    fr: "Pointez `theme` vers le nouveau factory dans `riebeckite.config.ts` :",
    ko: "`riebeckite.config.ts`의 `theme`를 새 팩토리로 변경합니다:",
  },
  tableHeading: {
    en: "The bundled themes",
    ja: "同梱テーマ一覧",
    "zh-CN": "内置主题一览",
    es: "Los temas incluidos",
    de: "Die mitgelieferten Themes",
    fr: "Les thèmes inclus",
    ko: "내장 테마 목록",
  },
  columnTheme: {
    en: "Theme",
    ja: "テーマ",
    "zh-CN": "主题",
    es: "Tema",
    de: "Theme",
    fr: "Thème",
    ko: "테마",
  },
  columnDescription: {
    en: "Description",
    ja: "説明",
    "zh-CN": "说明",
    es: "Descripción",
    de: "Beschreibung",
    fr: "Description",
    ko: "설명",
  },
  note: {
    en: "Every theme supports light/dark color modes, typography, and article layouts; see each README for the full option list.",
    ja: "すべてのテーマでライト/ダーク切り替え、文字組み、記事レイアウトをサポートしています。詳しいオプションは各 README を参照してください。",
    "zh-CN": "所有主题都支持明暗配色、排版与文章布局，完整选项请见各 README。",
    es: "Todos los temas admiten modos claro/oscuro, tipografía y diseño de artículo; consulta cada README para la lista completa de opciones.",
    de: "Jedes Theme unterstützt Hell/Dunkel-Modi, Typografie und Artikel-Layouts; die vollständige Optionsliste steht im jeweiligen README.",
    fr: "Chaque thème prend en charge les modes clair/sombre, la typographie et les mises en page d'article ; voir chaque README pour la liste complète des options.",
    ko: "모든 테마가 라이트/다크 모드, 타이포그래피, 아티클 레이아웃을 지원합니다. 전체 옵션은 각 README를 참조하세요.",
  },
};

const THEMES: readonly ThemeRow[] = [
  {
    slug: "default",
    factory: "defaultTheme()",
    desc: {
      en: "The default theme: clean design tokens, light/dark/system color modes, and article layouts.",
      ja: "デフォルトテーマ：クリーンなデザイントークン、ライト/ダーク/システムのカラーモード、記事レイアウト。",
      "zh-CN": "默认主题：简洁的设计令牌、浅色/深色/系统配色与文章布局。",
      es: "El tema por defecto: tokens limpios, modos claro/oscuro/sistema y distintos diseños de artículo.",
      de: "Das Standard-Theme: klare Design-Tokens, Licht/Dunkel/System-Modi und Artikel-Layouts.",
      fr: "Le thème par défaut : tokens épurés, modes clair/sombre/système et mises en page d'article.",
      ko: "기본 테마: 깔끔한 디자인 토큰, 라이트/다크/시스템 컬러 모드, 아티클 레이아웃.",
    },
  },
  {
    slug: "minimal",
    factory: "minimalTheme()",
    desc: {
      en: "A quiet, typography-first theme.",
      ja: "文字組みを重視した静かなテーマ。",
      "zh-CN": "以排版为先的简洁主题。",
      es: "Un tema sobrio, centrado en la tipografía.",
      de: "Ein ruhiges, typografieorientiertes Theme.",
      fr: "Un thème sobre, axé sur la typographie.",
      ko: "타이포그래피 우선의 차분한 테마.",
    },
  },
  {
    slug: "sakura",
    factory: "sakuraTheme()",
    desc: {
      en: "A soft pink palette with warm accents.",
      ja: "やわらかいピンクと温かみのあるアクセントのテーマ。",
      "zh-CN": "柔和的粉色配色与温暖点缀。",
      es: "Una paleta rosa suave con acentos cálidos.",
      de: "Eine weiche rosa Palette mit warmen Akzenten.",
      fr: "Une palette rose douce aux accents chaleureux.",
      ko: "부드러운 핑크 팔레트와 따뜻한 액센트.",
    },
  },
  {
    slug: "gruvbox",
    factory: "gruvboxTheme()",
    desc: {
      en: "A warm, retro palette inspired by Gruvbox.",
      ja: "Gruvbox 風の温かみのあるレトロパレット。",
      "zh-CN": "受 Gruvbox 启发的温暖复古配色。",
      es: "Una paleta retro cálida inspirada en Gruvbox.",
      de: "Eine warme, von Gruvbox inspirierte Retro-Palette.",
      fr: "Une palette rétro chaleureuse inspirée de Gruvbox.",
      ko: "Gruvbox에서 영감을 받은 따뜻한 레트로 팔레트.",
    },
  },
  {
    slug: "tokyonight",
    factory: "tokyonightTheme()",
    desc: {
      en: "A modern night palette with an optional neon accent.",
      ja: "ネオンオプション付きのモダンなナイトパレット。",
      "zh-CN": "现代夜间配色，可选霓虹点缀。",
      es: "Una paleta nocturna moderna con acento neón opcional.",
      de: "Eine moderne Night-Palette mit optionalem Neon-Akzent.",
      fr: "Une palette nocturne moderne avec accent néon optionnel.",
      ko: "네온 액센트를 선택할 수 있는 모던한 나이트 팔레트.",
    },
  },
  {
    slug: "rerurate",
    factory: "rerurateTheme()",
    desc: {
      en: "The author's personal design language.",
      ja: "作者自身のデザインをテーマにしたテーマ。",
      "zh-CN": "作者个人的设计风格主题。",
      es: "El lenguaje de diseño personal del autor.",
      de: "Die persönliche Designsprache des Autors.",
      fr: "Le langage de design personnel de l'auteur.",
      ko: "저자의 개인 디자인 언어 테마.",
    },
  },
];

const THEME_LABELS: Readonly<Record<string, string>> = {
  default: "Default",
  minimal: "Minimal",
  sakura: "Sakura",
  gruvbox: "Gruvbox",
  tokyonight: "Tokyo Night",
  rerurate: "Rerurate",
};

function themeGalleryFence(description: (theme: ThemeRow) => string): string {
  const items: string[] = ["columns: 3", "items:"];
  for (const theme of THEMES) {
    const label = THEME_LABELS[theme.slug] ?? theme.slug;
    items.push(`  - title: ${JSON.stringify(label)}`);
    items.push(`    description: ${JSON.stringify(description(theme))}`);
    items.push(`    meta: ${JSON.stringify(theme.factory)}`);
    items.push(`    href: ${JSON.stringify(themeReadmeUrl(theme.slug))}`);
  }
  return fence("gallery", items.join("\n"));
}

export function themesContent(
  language: ScaffoldLanguage,
  preset: ScaffoldPreset,
): string {
  const copy = THEMES_COPY;
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, read(copy.title, language)), "");
  lines.push(read(copy.intro, language), "");
  if (hasPlugin(preset, GALLERY_PACKAGE)) {
    lines.push(heading(2, read(copy.galleryHeading, language)), "");
    lines.push(
      themeGalleryFence((theme) => read(theme.desc, language)),
      "",
    );
  }
  lines.push(heading(2, read(copy.switchHeading, language)), "");
  lines.push(read(copy.switchCurrent, language), "");
  lines.push(read(copy.switchStep1, language), "");
  lines.push(codeBlock("sh", "npm install @riebeckite/theme-sakura"));
  lines.push(read(copy.switchStep2, language), "");
  lines.push(
    codeBlock(
      "ts",
      [
        'import { sakuraTheme } from "@riebeckite/theme-sakura";',
        "",
        "export default defineConfig({",
        "  theme: sakuraTheme(),",
        "});",
      ].join("\n"),
    ),
  );
  lines.push(heading(2, read(copy.tableHeading, language)), "");
  lines.push(
    `| ${read(copy.columnTheme, language)} | ${read(copy.columnDescription, language)} |`,
  );
  lines.push("| --- | --- |");
  for (const theme of THEMES) {
    const packageName = `@riebeckite/theme-${theme.slug}`;
    lines.push(
      `| [\`${packageName}\`](${themeReadmeUrl(theme.slug)}) · \`${theme.factory}\` | ${read(theme.desc, language)} |`,
    );
  }
  lines.push("");
  lines.push(heading(2, read(copy.note, language)), "");
  lines.push("");
  lines.push(`[Riebeckite themes on GitHub](${THEMES_INDEX_URL})`, "");
  lines.push("");
  return lines.join("\n");
}

export { THEMES, themeGalleryFence };
