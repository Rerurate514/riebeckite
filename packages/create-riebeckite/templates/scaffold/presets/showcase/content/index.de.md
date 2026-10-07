---
publish: true
---

# {{title}}

Willkommen auf deiner Riebeckite-Seite. Dieses Preset ist ein Rundgang: Es registriert den vollständigen Plugin-Katalog von Riebeckite und legt Inhalte an, die jede Fähigkeit sichtbar machen.

## Weiter erkunden

- [Plugins — repräsentative Pakete nach Fähigkeit](/framework/plugins)
- [Themes — mitgelieferte Design-Pakete und wie man wechselt](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## Was ist Riebeckite?

Riebeckite ist ein erweiterbares, inhaltsorientiertes Framework, das schnelle statische Seiten aus einfachem Markdown baut — denselben Notizen, die du in Obsidian führst. Es enthält 50+ Plugins und sechs Themes; diese Seite demonstriert beides.

## Diese Seite bearbeiten

Inhalte liegen als einfaches Markdown in `content/`. Füge eine Datei hinzu, setze `publish: true` ins Frontmatter, und sie erscheint in der gebauten Seite. Die Notizen unter `content/Daily/` speisen das Daily-Notes-Widget auf dieser Seite.

Diese Seite ist in sieben Sprachen verfügbar: Startseite, examples und framework-Seiten sind übersetzt, während guide und die Plugin-/Theme-Referenzen auf Englisch bleiben. Wechsel mit dem Auswahlfeld unter dem Seitentitel.

Übersetzte Seiten folgen der Konvention `<base>.<lang>.md` neben der Standarddatei (z. B. `about.ja.md`). Das l10n-Plugin liefert sie unter `/lang/`-Pfaden und verlinkt sie automatisch.

Öffne `riebeckite.config.ts`, um jedes registrierte Plugin und seine Optionen zu sehen.
