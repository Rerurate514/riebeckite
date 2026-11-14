import type { LocalizedText } from "./content_pages_shared.js";

type PluginRow = {
  /** Package slug (after `@riebeckite/plugin-`) and README directory. */
  readonly slug: string;
  readonly desc: LocalizedText;
};

export type PluginCategory = {
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly plugins: readonly PluginRow[];
};

type PluginsCopy = {
  readonly title: LocalizedText;
  readonly intro: LocalizedText;
  readonly installHeading: LocalizedText;
  readonly installStep1: LocalizedText;
  readonly installStep2: LocalizedText;
  readonly fullList: LocalizedText;
  readonly fullListLabel: LocalizedText;
  readonly columnPlugin: LocalizedText;
  readonly columnDescription: LocalizedText;
};

export const PLUGINS_COPY: PluginsCopy = {
  title: {
    en: "Plugins",
    ja: "プラグイン",
    "zh-CN": "插件",
    es: "Plugins",
    de: "Plugins",
    fr: "Plugins",
    ko: "플러그인",
  },
  intro: {
    en: "Riebeckite's power comes from its plugin ecosystem — over fifty packages that extend Markdown, rendering, search, SEO, and more. Below are representative examples grouped by capability; every entry links to its full README.",
    ja: "Riebeckite の力はプラグインエコシステムにあります——50 以上のパッケージが Markdown・描画・検索・SEO などを拡張します。ここでは代表的なプラグインを機能別に紹介します。各項目のリンクから詳細な README を参照できます。",
    "zh-CN":
      "Riebeckite 的强大来自其插件生态——五十多个扩展 Markdown、渲染、搜索、SEO 等的包。下面按能力分组展示代表性示例，每一项都链接到完整 README。",
    es: "El poder de Riebeckite viene de su ecosistema de plugins — más de cincuenta paquetes que extienden Markdown, renderizado, búsqueda, SEO y más. Aquí tienes ejemplos representativos agrupados por capacidad; cada uno enlaza a su README completo.",
    de: "Riebeckites Stärke kommt aus seinem Plugin-Ökosystem — über fünfzig Pakete, die Markdown, Rendering, Suche, SEO und mehr erweitern. Hier finden sich repräsentative Beispiele nach Fähigkeit gruppiert; jeder Eintrag verlinkt auf sein volles README.",
    fr: "La puissance de Riebeckite vient de son écosystème de plugins — plus de cinquante paquets qui étendent Markdown, le rendu, la recherche, le SEO et plus encore. Voici des exemples représentatifs groupés par capacité ; chaque entrée renvoie vers son README complet.",
    ko: "Riebeckite의 힘은 플러그인 생태계에 있습니다 — Markdown·렌더링·검색·SEO 등을 확장하는 50개 이상의 패키지. 아래는 기능별로 대표적인 예를 소개하며, 각 항목은 전체 README로 연결됩니다.",
  },
  installHeading: {
    en: "Adding a plugin",
    ja: "プラグインの追加",
    "zh-CN": "添加插件",
    es: "Añadir un plugin",
    de: "Ein Plugin hinzufügen",
    fr: "Ajouter un plugin",
    ko: "플러그인 추가",
  },
  installStep1: {
    en: "Install the package:",
    ja: "パッケージをインストール：",
    "zh-CN": "安装该包：",
    es: "Instala el paquete:",
    de: "Installiere das Paket:",
    fr: "Installez le paquet :",
    ko: "패키지를 설치합니다:",
  },
  installStep2: {
    en: "Register it in the `plugins` array of `riebeckite.config.ts`:",
    ja: "`riebeckite.config.ts` の `plugins` 配列に登録：",
    "zh-CN": "在 `riebeckite.config.ts` 的 `plugins` 数组中注册：",
    es: "Regístralo en el array `plugins` de `riebeckite.config.ts`:",
    de: "Registriere es im `plugins`-Array der `riebeckite.config.ts`:",
    fr: "Enregistrez-le dans le tableau `plugins` de `riebeckite.config.ts` :",
    ko: "`riebeckite.config.ts`의 `plugins` 배열에 등록합니다:",
  },
  fullList: {
    en: "The complete plugin index lives in the repository:",
    ja: "全プラグインの一覧はリポジトリにあります：",
    "zh-CN": "完整的插件索引位于仓库中：",
    es: "El índice completo de plugins vive en el repositorio:",
    de: "Der vollständige Plugin-Index liegt im Repository:",
    fr: "L'index complet des plugins se trouve dans le dépôt :",
    ko: "전체 플러그인 목록은 저장소에 있습니다:",
  },
  fullListLabel: {
    en: "Riebeckite plugins on GitHub",
    ja: "GitHub の Riebeckite プラグイン",
    "zh-CN": "GitHub 上的 Riebeckite 插件",
    es: "Plugins de Riebeckite en GitHub",
    de: "Riebeckite-Plugins auf GitHub",
    fr: "Plugins Riebeckite sur GitHub",
    ko: "GitHub의 Riebeckite 플러그인",
  },
  columnPlugin: {
    en: "Plugin",
    ja: "プラグイン",
    "zh-CN": "插件",
    es: "Plugin",
    de: "Plugin",
    fr: "Plugin",
    ko: "플러그인",
  },
  columnDescription: {
    en: "What it does",
    ja: "できること",
    "zh-CN": "作用",
    es: "Qué hace",
    de: "Funktion",
    fr: "Rôle",
    ko: "기능",
  },
};
