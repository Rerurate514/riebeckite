---
publish: true
---

# Plugins

La puissance de Riebeckite vient de son écosystème de plugins — plus de cinquante paquets qui étendent Markdown, le rendu, la recherche, le SEO et plus encore. Voici des exemples représentatifs groupés par capacité ; chaque entrée renvoie vers son README complet.

## Ajouter un plugin

Installez le paquet :

```sh
npm install @riebeckite/plugin-mermaid
```

Enregistrez-le dans le tableau `plugins` de `riebeckite.config.ts` :

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

L'index complet des plugins se trouve dans le dépôt :

[Plugins Riebeckite sur GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## Markdown et notes

Prise de notes quotidienne pensée pour les coffres Obsidian.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Markdown façon Obsidian : wikilinks, embeds, callouts et tags. |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | Rend les fichiers joints et embarque les ressources via wikilinks. |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | Embeds audio et vidéo depuis de simples liens. |

## Diagrammes et présentation

Transformez des blocs de code en diagrammes, graphiques et diapositives.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | Diagrammes Mermaid depuis des blocs de code délimités. |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | Diagrammes DOT / Graphviz. |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | Diagrammes en langage D2. |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Rend les croquis Excalidraw. |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | Grilles de cartes pour vitrines de thèmes ou de projets. |

## Code et expérience de lecture

De meilleurs blocs de code et une lecture confortable.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | Coloration syntaxique, numéros de ligne et barres de code. |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | Blocs de code à onglets accessibles. |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | Une table des matières qui suit le défilement. |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | Liste les notes qui pointent vers la note courante. |

## Recherche et navigation

Retrouvez et parcourez vos notes rapidement.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Recherche plein texte côté client avec modal Ctrl+K. |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | Un explorateur interactif de graphe et de recherche. |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | Un graphe de liens autour de la note courante. |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | Permaliens stables et configurables. |

## Publication et SEO

Publiez un site que moteurs de recherche et lecteurs comprennent.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | Métadonnées SEO, sitemaps, flux RSS/Atom/JSON et robots.txt. |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | URLs localisées, sélecteur de langue et métadonnées hreflang — ce site repose dessus. |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | Cartes média construites à la compilation pour les liens externes. |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | Sortie de déploiement statique pour les services d'hébergement. |

## Contenu et expérience développeur

Requêter, organiser et garder votre contenu sain.

| Plugin | Rôle |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | Requêtes temps de build sur vos notes. |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Tableaux Kanban façon Obsidian depuis des listes Markdown. |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | Images responsives avec chargement différé. |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | Contrôle statique de qualité et d'accessibilité. |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.en.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md)

