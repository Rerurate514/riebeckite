---
publish: true
---

# Plugins

Riebeckites Stärke kommt aus seinem Plugin-Ökosystem — über fünfzig Pakete, die Markdown, Rendering, Suche, SEO und mehr erweitern. Hier finden sich repräsentative Beispiele nach Fähigkeit gruppiert; jeder Eintrag verlinkt auf sein volles README.

## Ein Plugin hinzufügen

Installiere das Paket:

```sh
npm install @riebeckite/plugin-mermaid
```

Registriere es im `plugins`-Array der `riebeckite.config.ts`:

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],
});
```

Der vollständige Plugin-Index liegt im Repository:

[Riebeckite-Plugins auf GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## Markdown und Notizen

Alltägliche Notizfunktionen, optimiert für Obsidian-Vaults.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Obsidian-Markdown: Wikilinks, Einbettungen, Callouts und Tags. |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | Rendert Dateianhänge und bettet Assets per Wikilinks ein. |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | Audio- und Video-Embeds aus einfachen Links. |

## Diagramme und Präsentation

Verwandle fenced Code-Blöcke in Diagramme, Charts und Folien.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | Mermaid-Diagramme aus fenced Code-Blöcken. |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | DOT / Graphviz-Diagramme. |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | Diagramme in der Sprache D2. |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Rendert Excalidraw-Skizzen. |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | Kartenraster für Theme- oder Projekt-Showcases. |

## Code und Leseerlebnis

Bessere Code-Blöcke und ein angenehmes Leseerlebnis.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | Syntax-Highlighting, Zeilennummern und Code-Symbolleisten. |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | Barrierefreie Code-Blöcke mit Tabs. |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | Ein scrollgesteuertes Inhaltsverzeichnis. |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | Listet Notizen, die auf die aktuelle verlinken. |

## Suche und Navigation

Notizen schnell finden und durch sie navigieren.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Clientseitige Volltextsuche mit Ctrl+K-Modal. |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | Ein interaktiver Graph- und Such-Explorer. |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | Ein Link-Graph rund um die aktuelle Notiz. |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | Stabile, konfigurierbare Permalinks. |

## Veröffentlichung und SEO

Veröffentliche eine Seite, die Suchmaschinen und Leser gleichermaßen verstehen.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | SEO-Metadaten, Sitemaps, RSS/Atom/JSON-Feeds und robots.txt. |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | Lokalisierte URLs, Sprachumschalter und hreflang-Metadaten — diese Seite läuft darauf. |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | Rich-Media-Karten für externe Links zur Build-Zeit. |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | Statische Deployment-Ausgabe für Hosting-Dienste. |

## Content und Developer Experience

Content abfragen, organisieren und gesund halten.

| Plugin | Funktion |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | Build-Zeit-Abfragen über deine Notizen. |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Obsidian-ähnliche Kanban-Boards aus Markdown-Listen. |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | Responsive Bilder mit Lazy Loading. |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | Statische Qualitäts- und Barrierefreiheitsprüfung. |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.en.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md)

