---
publish: true
---

# showcase-ja

Bienvenue sur votre site Riebeckite. Ce preset est une visite : il enregistre le catalogue complet des plugins fournis par Riebeckite et prépare du contenu pour montrer chaque capacité à l'écran.

## Explorer

- [Plugins — paquets représentatifs par capacité](/framework/plugins)
- [Thèmes — paquets de design inclus et comment changer](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## Qu'est-ce que Riebeckite ?

Riebeckite est un framework extensible et centré sur le contenu qui construit des sites statiques rapides à partir de Markdown simple — les mêmes notes que vous gardez dans Obsidian. Il fournit plus de 50 plugins et six thèmes ; ce site en démontre les deux.

## Éditer ce site

Le contenu vit dans `content/` en Markdown simple. Ajoutez un fichier, donnez-lui `publish: true` dans le frontmatter, et il apparaîtra dans le site construit. Les notes de `content/Daily/` alimentent le widget Daily Notes de cette page.

Ce site est disponible en sept langues : la page d'accueil, examples et les pages framework sont traduites, tandis que guide et les pages de référence des plugins et des thèmes restent en anglais. Changez avec le sélecteur sous le titre.

Les pages localisées suivent la convention `<base>.<lang>.md` à côté du fichier par défaut (ex. `about.ja.md`). Le plugin l10n les sert sous des chemins `/lang/` et les relie automatiquement.

Ouvrez `riebeckite.config.ts` pour voir chaque plugin enregistré et ses options.
