---
title: Accessibility
sidebar:
  label: Accessibility
  order: 70
---
# Accessibility

Riebeckite aims to follow WCAG 2.2 AA guidance, but it does not make a blanket compliance claim. The accessibility of a published site depends on Riebeckite, the selected Theme, enabled Plugins, author content, and custom code.

## Framework contract

Riebeckite uses native HTML first and adds ARIA only when native HTML cannot express the needed behavior or state.

- The generated HonoX document shell sets `lang`, viewport metadata, page title, and theme attributes.
- Presets render normal landmarks such as `header`, `main`, `article`, `aside`, `footer`, and `nav` where those structures exist.
- The Starter and Showcase shells render one `<main id="main-content">` landmark and a "Skip to main content" link that appears on keyboard focus, so keyboard users can bypass the repeated header and navigation.
- Framework-generated links use real `<a href>` elements, and actions use real `<button type="button">` elements.
- Plugin page types are rendered inside the shared document shell so language, title, assets, and theme hooks apply consistently.
- Framework-generated controls are operable with a keyboard alone.
- Where the framework controls motion, it respects the user's reduced-motion preference.
- Riebeckite does not invent image descriptions. Authors and Plugins must provide meaningful `alt` text or mark decorative images with empty `alt`.

## Plugin author contract

When a Plugin renders UI:

- Prefer semantic HTML before ARIA.
- Use links for navigation and buttons for actions. Do not use clickable `div` or `span` elements.
- Every interactive control needs visible text or another accessible name.
- Keyboard users must be able to reach and operate the feature.
- Dialog-like UI must move focus on open, keep Tab navigation meaningful while open, close on `Escape`, and restore focus to the opener.
- Keep ARIA states such as `aria-expanded`, `aria-pressed`, `aria-current`, and `aria-selected` synchronized with the real state.
- Respect `prefers-reduced-motion` for motion that could distract or block understanding.
- Visualizations such as canvas, graphs, charts, maps, and diagrams should provide a useful text alternative, source representation, caption, or summary instead of a huge artificial ARIA tree.

## Theme author contract

Themes are responsible for visual accessibility:

- Do not remove focus indicators unless you replace them with an equally visible `:focus-visible` style.
- Keep body text, muted text, links, buttons, form controls, code, selected states, and focus rings readable in light and dark modes.
- Links should be recognizable without depending on color alone.
- Avoid color-only state. Combine color with text, shape, underline, icons, or semantic state.
- Let text scale naturally. Avoid fixed heights that clip content at narrow viewports or high zoom.
- Prefer reduced motion defaults or wrap non-essential animation in `prefers-reduced-motion` / `prefers-reduced-motion: no-preference`.

## Content author checklist

- Use one clear page title and a sensible heading order.
- Write link text that explains the destination.
- Provide `alt` text for meaningful images and empty `alt` for decorative images.
- Add captions or nearby explanations for charts, diagrams, embeds, and media.
- Check the site with keyboard navigation and at narrow widths before publishing.

## Audited surface

The official audit covers Core/HonoX rendering, generated scaffolds and presets, official Themes (`default`, `minimal`, `gruvbox`, `tokyonight`, `sakura`, `rerurate`), and official UI-generating Plugins including search, color mode, UX helpers, table of contents, lightbox, gallery, local graph, garden explorer, code tabs, code enhance, share, properties, recent/related posts, taxonomy, query/dataview/bases, flashcards, kanban, media, and diagram/visual Plugins.
