---
publish: true
---

# Plugins

El poder de Riebeckite viene de su ecosistema de plugins — más de cincuenta paquetes que extienden Markdown, renderizado, búsqueda, SEO y más. Aquí tienes ejemplos representativos agrupados por capacidad; cada uno enlaza a su README completo.

## Añadir un plugin

Instala el paquete:

```sh
npm install @riebeckite/plugin-mermaid
```

Regístralo en el array `plugins` de `riebeckite.config.ts`:

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

El índice completo de plugins vive en el repositorio:

[Plugins de Riebeckite en GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## Markdown y notas

Toma de notas diaria afinada para bóvedas Obsidian.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Markdown estilo Obsidian: wikilinks, embeds, callouts y etiquetas. |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | Renderiza archivos adjuntos e incrusta assets con wikilinks. |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | Incrusta audio y vídeo desde enlaces simples. |

## Diagramas y presentación

Convierte bloques de código en diagramas, gráficas y diapositivas.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | Diagramas Mermaid desde bloques de código delimitados. |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | Diagramas DOT / Graphviz. |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | Diagramas en lenguaje D2. |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Renderiza bocetos de Excalidraw. |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | Cuadrículas de tarjetas para escaparates de temas o proyectos. |

## Código y experiencia de lectura

Mejores bloques de código y una lectura cómoda.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | Resaltado de sintaxis, números de línea y barras de código. |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | Bloques de código con pestañas accesibles. |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | Una tabla de contenidos que sigue el scroll. |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | Lista las notas que enlazan con la actual. |

## Búsqueda y navegación

Encuentra y recorre tus notas rápidamente.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Búsqueda de texto completo en el cliente con modal Ctrl+K. |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | Un explorador interactivo de grafo y búsqueda. |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | Un grafo de enlaces alrededor de la nota actual. |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | Permalinks estables y configurables. |

## Publicación y SEO

Publica un sitio que buscan buscadores y lectores por igual.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | Metadatos SEO, sitemaps, feeds RSS/Atom/JSON y robots.txt. |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | URLs localizadas, selector de idioma y metadatos hreflang — este sitio se ejecuta sobre él. |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | Tarjetas multimedia en build para enlaces externos. |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | Salida de despliegue estático para servicios de hosting. |

## Contenido y experiencia de desarrollo

Consulta, organiza y mantén sano tu contenido.

| Plugin | Qué hace |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | Consultas en build sobre tus notas. |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Tableros Kanban estilo Obsidian desde listas Markdown. |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | Imágenes responsive con carga diferida. |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | Inspección estática de calidad y accesibilidad. |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.ja.md)

