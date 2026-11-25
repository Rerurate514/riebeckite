# Riebeckite promo video

A 28-second, silent, 1080p product demo for [Riebeckite](https://riebeckite.dev), built with [Remotion](https://remotion.dev). Every frame of the product is a real screenshot of the Riebeckite site: no invented UI, no stock footage, no audio.

- Video: `riebeckite-demo.mp4` — 1920×1080, 30 fps, 840 frames, H.264, 28.0 s, no audio track
- Thumbnail: `thumbnail.png` — 1920×1080 still (`RiebeckiteThumbnail` composition)
- Source: `src/` — `Root.tsx` registers `RiebeckitePromo` and `RiebeckiteThumbnail`
- Assets: `assets/` — captured site screenshots (served to Remotion through `Config.setPublicDir("assets")`)

## Storyboard

| Time | Scene | On screen | Caption |
| --- | --- | --- | --- |
| 0.0–3.4 s | Source | The real `obsidian-digital-garden.md` file: frontmatter, intro, heading | Your Obsidian notes. |
| 3.2–8.2 s | Result | Same post rendered at `riebeckite.dev/blog/obsidian-digital-garden`, slow scroll through the article | Your website. |
| 8.2–16.2 s | Search | Docs page, cursor opens search, types `syntax`, first result is selected | Search every note. |
| 16.2–23.4 s | Syntax | `/docs/plugins/showcase/obsidian-syntax`: rendered callouts and wikilink handling | Obsidian syntax, rendered. |
| 23.2–28.0 s | Close | Mark, framework line, tagline, GitHub URL | — |

The demo only shows features that were verified against the built site: blog rendering from Markdown/Obsidian content, full-text search with real results, and Obsidian syntax rendering (callouts, embeds).

## Regenerate

Requirements: Node.js 22.13+, and a local copy of the built Riebeckite site.

```bash
cd promo
npm install
```

The captures are taken from a static server on the built site. Either build it in the workspace (`pnpm --filter @riebeckite/web build`) or point the capture at the live site.

```bash
# terminal A: serve the prebuilt site at http://127.0.0.1:4321
npm run preview-site
# or: PROMO_SITE=https://riebeckite.dev npm run capture   (skips the local server)

# terminal B
npm run capture   # rewrites assets/*.png (Puppeteer, 1600px wide @2x; full-page shots use a full-height viewport)
npm run render    # riebeckite-demo.mp4
npm run thumb     # thumbnail.png
npm run verify    # opens the MP4 in Chrome and checks dimensions, duration, decode
```

`capture` needs Puppeteer, which comes from the repository root `node_modules`; `scripts/capture.mjs` resolves it through the root `package.json`. Remotion downloads its own Chrome Headless Shell on first render.

Studio preview: `npm run studio`.

## Assets

All files in `assets/` were captured for this video from the Riebeckite build in `website/dist` and describe the product as it is:

- `article.png` — full page `/blog/obsidian-digital-garden`
- `docs.png` — full page `/docs/getting-started/`
- `search-0.png` … `search-6.png` — search modal, real typing of `syntax`, one frame per keystroke
- `search-results.png` — final result list with the first hit selected
- `obsidian.png` — full page `/docs/plugins/showcase/obsidian-syntax`, reached by pressing Enter on the first search result
- `logo.png` — `website/dist/riebeckite-logo.png`

No third-party footage, music, or fonts are used. Typography is the site's own system font stack.

The browser chrome, cursor, and markdown card are drawn in Remotion around the real screenshots; no site pixels are altered.

## Implementation notes

- Scenes are separate compositions in `src/scenes.tsx`, sequenced in `Root.tsx`; captions live in `src/components/Caption.tsx`.
- All motion is frame-driven with `interpolate` and `Easing.bezier` (ease-out `0.23, 1, 0.32, 1`, ease-in-out `0.77, 0, 0.175, 1`). Entrances are opacity plus a few pixels of travel; no bounce, no scale-from-zero, no glow.
- The cursor is a drawn SVG moved along fixed paths; clicks only change the simulated press scale. The real interaction was recorded as screenshots and re-timed for readability.
- `scripts/verify.mjs` is the playback check used after rendering.

## Known limitations

- Silent by design; captions carry the narrative.
- Search typing is reconstructed from one screenshot per character, so the caret does not blink.
- The theme switcher and graph view are not shown; they were out of scope for a 28-second cut.
