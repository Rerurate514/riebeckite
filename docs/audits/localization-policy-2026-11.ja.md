# Localization policy audit (2026-11)

闍ｱ隱樒沿: [English](./localization-policy-2026-11.md)

## 蟇ｾ雎｡

`packages/plugins` 驟堺ｸ九〒隗｣豎ｺ貂医∩繧ｳ繝ｳ繝・Φ繝・ｒ隱ｭ縺ｿ縲∽ｸ隕ｧ繧・函謌舌・繝ｼ繧ｸ繧貞・縺・縺吶∋縺ｦ縺ｮ繝励Λ繧ｰ繧､繝ｳ繧貞ｯｾ雎｡縺ｫ縺励∪縺励◆縲ゅΟ繧ｱ繝ｼ繝ｫ縺ｮ蜿門ｾ怜・縲∝､画峩蜑榊ｾ後・蜍穂ｽ懊∝次蝗縲・繝・せ繝医ｒ險倬鹸縺励∪縺吶・
蜈ｱ騾壹・繝ｪ繧ｷ繝ｼ縺ｯ Core 縺ｫ縺ゅｊ縺ｾ縺吶・
- `ContentManifest.localization` (`defaultLocale`縲～locales`縲～fallbackLocale`)
- `resolvePageLocale(manifest, pathname)`
- `selectLocalizedEntries(entries, { mode, locale, fallbackLocale })`
- `queryContentEntries({ filter: { locale } })`
- `localizedPagePath()` / `localizedPagePaths()`

荳隕ｧ繝励Λ繧ｰ繧､繝ｳ縺ｮ譌｢螳壹・ `current` 縺ｧ縺吶Ａfallback` 縺ｯ鄙ｻ險ｳ ID 蜊倅ｽ阪〒隗｣豎ｺ縺励・`all` 縺ｯ證鈴ｻ吶・驥崎､・賜髯､繧偵＠縺ｾ縺帙ｓ縲Ａmanifest.localization` 縺後↑縺・し繧､繝医・
蠕捺擂縺ｩ縺翫ｊ縺ｫ蜍穂ｽ懊＠縺ｾ縺吶・
## Timeline 縺ｮ驥崎､・＠縺溯｡後・蜴溷屏

`timeline/index.ts` 縺ｯ `manifest.discoverableEntries` 縺九ｉ1縺､縺ｮ
`/timeline` 縺縺代ｒ逕滓・縺励√・繝ｼ繧ｸ縺ｮ繝ｭ繧ｱ繝ｼ繝ｫ繧定ｪｭ繧薙〒縺・∪縺帙ｓ縺ｧ縺励◆縲・繝峨く繝･繝｡繝ｳ繝医し繧､繝医〒縺ｯ `docs/plugins/foo.md` 縺ｨ `docs/plugins/foo.ja.md` 縺・蜷後§ frontmatter date 繧呈戟縺｡縲∬恭隱槭ち繧､繝医Ν繧ょ酔縺倥％縺ｨ縺後≠繧九◆繧√∝酔縺俶律莉倥・
蜷後§繧ｿ繧､繝医Ν縺ｮ陦後′2縺､荳ｦ繧薙〒縺・∪縺励◆縲Ｍ10n 繝励Λ繧ｰ繧､繝ｳ縺ｯ險隱槭→ URL 繧定ｧ｣豎ｺ貂医∩
縺ｧ縺励◆縺後∽ｸ隕ｧ蛛ｴ縺後◎縺ｮ諠・ｱ繧剃ｽｿ縺｣縺ｦ縺・∪縺帙ｓ縺ｧ縺励◆縲・
Archive縲ヽelated Posts縲。acklinks縲ヽecent Posts縲ゝaxonomy縲ヾeries縲；lossary縲・Garden Explorer縲．ataview縲。ases 縺ｫ繧ょ酔縺倥・繝ｼ繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ縺ｮ谺關ｽ縺後≠繧翫∪縺励◆縲・Search 縺ｯ蜷・・岼縺ｫ `language` 繧呈戟縺｣縺ｦ縺・∪縺励◆縺後√Δ繝ｼ繝繝ｫ縺檎樟蝨ｨ縺ｮ譁・嶌險隱槭〒
邨槭ｊ霎ｼ繧薙〒縺・∪縺帙ｓ縺ｧ縺励◆縲・
## 繝励Λ繧ｰ繧､繝ｳ蛻･邨先棡

| 繝励Λ繧ｰ繧､繝ｳ | 繝ｭ繧ｱ繝ｼ繝ｫ蜿門ｾ怜・ | 螟画峩蠕・| 繝・せ繝・|
| --- | --- | --- | --- |
| Timeline | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･繝壹・繧ｸ縲～localeMode` 譌｢螳・`current`縲√ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ縺ｮ繝舌ャ繧ｸ | `packages/plugins/timeline/test/timeline.test.ts` |
| Archive | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･繧｢繝ｼ繧ｫ繧､繝悶∬ｨ倅ｺ九・邨槭ｊ霎ｼ縺ｿ | `packages/plugins/archive/test/archive.test.ts` |
| Recent Posts | `SiteProvider.language` | 迴ｾ蝨ｨ繝壹・繧ｸ縺ｮ險隱・| `packages/plugins/recent-posts/test/recent-posts.test.ts` |
| Related Posts | 險倅ｺ九・險隱・| 蛟呵｣懊ｒ `localeMode` 縺ｧ邨槭ｊ霎ｼ縺ｿ | Core のポリシーテスト + 既存の `related.test.ts` |
| Backlinks | 險倅ｺ九・險隱・| 迴ｾ蝨ｨ險隱槭・陲ｫ繝ｪ繝ｳ繧ｯ縺ｮ縺ｿ | `packages/plugins/backlinks/test/backlinks.test.ts` |
| Search | 譁・嶌縺ｮ `lang` + 鬆・岼縺ｮ `language` | 譌｢螳壹〒迴ｾ蝨ｨ險隱槭～lang:` 縺ｯ邯ｭ謖・| `packages/plugins/search/test/search.test.ts` |
| Taxonomy | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･繧ｿ繧ｰ繝ｻ繝輔か繝ｫ繝繝ｼ | `packages/plugins/taxonomy/test/taxonomy.test.ts` |
| Series | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･荳隕ｧ繝ｻ繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ | Core のポリシーテスト + 既存の `series.test.ts` |
| Glossary | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･逕ｨ隱樣寔 | Core のポリシーテスト + 既存の用語集テスト |
| Folder Pages | 險倅ｺ九・險隱・| 螟画峩縺ｪ縺暦ｼ域里縺ｫ豁｣縺励＞・・| 譌｢蟄倥ユ繧ｹ繝・|
| Navigation | `SiteProvider.language` | 螟画峩縺ｪ縺暦ｼ域里縺ｫ豁｣縺励＞・・| 譌｢蟄倥ユ繧ｹ繝・|
| Docs Navigation | 迴ｾ蝨ｨ險倅ｺ九・險隱・| 螟画峩縺ｪ縺暦ｼ域里縺ｫ豁｣縺励＞・・| 譌｢蟄倥ユ繧ｹ繝・|
| Garden Explorer | 繝壹・繧ｸ繝ｭ繧ｱ繝ｼ繝ｫ + `manifest.localization` | 繝ｭ繧ｱ繝ｼ繝ｫ蛻･ `/explore` | 譌｢蟄倥ユ繧ｹ繝・|
| Dataview | 險倅ｺ九・險隱・| 險倅ｺ九＃縺ｨ縺ｮ `localeMode` | 譌｢蟄倥ユ繧ｹ繝・|
| Bases | 險倅ｺ九・繝壹・繧ｸ縺ｮ險隱・| 險倅ｺ九＃縺ｨ縺ｮ `localeMode` | 譌｢蟄倥ユ繧ｹ繝・|
| Local Graph | 繧ｰ繝ｩ繝暮團謗･ | 螟画峩縺ｪ縺暦ｼ郁ｨ隱槭ｒ縺ｾ縺溘＄繝ｪ繝ｳ繧ｯ繧剃ｿ晄戟・・| 譌｢蟄倥ユ繧ｹ繝・|
| Breadcrumbs | 險倅ｺ九ヱ繧ｹ | 螟画峩縺ｪ縺暦ｼ郁ｨ隱樣撼萓晏ｭ假ｼ・| 譌｢蟄倥ユ繧ｹ繝・|
| Hover Preview | slug 蜿ら・ | 螟画峩縺ｪ縺暦ｼ郁ｨ隱樣撼萓晏ｭ假ｼ・| 譌｢蟄倥ユ繧ｹ繝・|
| Vault Heatmap | 譌･莉・| 螟画峩縺ｪ縺暦ｼ・ault 蜈ｨ菴薙・髮・ｨ茨ｼ・| 譌｢蟄倥ユ繧ｹ繝・|
| SEO | Public Location 縺ｮ險隱・| 螟画峩縺ｪ縺暦ｼ域里縺ｫ豁｣縺励＞・・| 譌｢蟄倥ユ繧ｹ繝・|

## 蟇ｾ雎｡螟・
謠冗判繝ｻ讒区枚繝ｻ繧｢繧ｻ繝・ヨ螟画鋤縺縺代ｒ陦後≧繝励Λ繧ｰ繧､繝ｳ縲∫樟蝨ｨ繝壹・繧ｸ縺縺代↓菴懃畑縺吶ｋ
繝励Λ繧ｰ繧､繝ｳ縲√さ繝ｳ繝・Φ繝・ｸ隕ｧ繧貞・縺輔↑縺・・繝ｩ繧ｰ繧､繝ｳ縺ｯ蟇ｾ雎｡螟悶→縺励∪縺励◆縲ょ・菴鍋噪縺ｫ縺ｯ
`alias`縲～attachment`縲～autocardlink`縲～calculator`縲～canvas`縲～chartjs`縲・`citations`縲～code-annotations`縲～code-enhance`縲～code-tabs`縲～d2`縲～diff`縲・`discord-embed`縲～excalidraw`縲～flashcards`縲～frontmatter-transformer`縲・`gallery`縲～graphviz`縲～hard-breaks`縲～highlight`縲～icons`縲～image-compare`縲・`image-optimizer`縲～kanban`縲～lightbox`縲～map`縲～markmap`縲～marp`縲～media`縲・`mermaid`縲～mermaid-pele`縲～meta-bind`縲～obsidian-markdown`縲～og-image`縲～pdf`縲・`permalink`縲～plantuml`縲～properties`縲～qr-code`縲～quality`縲～rename`縲・`responsive-image`縲～rich-embed`縲～share`縲～shortcodes`縲～sidenotes`縲・`source-files`縲～svg-optimizer`縲～text-fragment`縲～toc`縲～ux`縲～vega-lite`縲・`wavedrom`縲～webmention` 縺ｧ縺吶る°逕ｨ邉ｻ縺ｮ `analytics`縲～deploy`縲～diagnostics`縲・`article-metadata`縲～daily-notes`縲～excalibrain`縲～query` 繧ょｯｾ雎｡螟悶〒縺吶・
## 蜈ｬ髢句｢・阜

螟画峩縺励◆荳隕ｧ縺ｯ縺吶∋縺ｦ縲√Ο繧ｱ繝ｼ繝ｫ驕ｸ謚槭・蜑阪↓ `manifest.discoverableEntries` 繧・隱ｭ縺ｿ縺ｾ縺吶ＡselectLocalizedEntries` 縺ｯ蜈ｬ髢区ｸ医∩縺ｮ鬆・岼縺縺代ｒ邨槭ｊ霎ｼ繧縺溘ａ縲・`draft`縲∵悴譚･縺ｮ `scheduled`縲～private` 縺後Ο繧ｱ繝ｼ繝ｫ蛻･繝代せ縺九ｉ貍上ｌ繧九％縺ｨ縺ｯ
縺ゅｊ縺ｾ縺帙ｓ縲ゅヶ繝ｩ繧ｦ繧ｶ縺ｫ貂｡縺吶ン繝･繝ｼ縺ｯ蠑輔″邯壹″ `PublicContentView` 縺縺代〒縺吶・
## 繧ｭ繝｣繝・す繝･縺ｨ蠅怜・繝薙Ν繝・
譁ｰ縺励＞繧ｭ繝｣繝・す繝･繧ｭ繝ｼ縺ｯ霑ｽ蜉縺励※縺・∪縺帙ｓ縲ょ・繧ｨ繝ｳ繝医Μ縺ｫ萓晏ｭ倥☆繧・page type 縺ｯ
`{ type: "global" }` 繧堤ｶｭ謖√＠縺ｦ縺翫ｊ縲∫ｿｻ險ｳ縺ｮ霑ｽ蜉繝ｻ蜑企勁縺ｫ蟇ｾ縺励※螳牙・蛛ｴ縺ｧ縺吶・`manifest.localization` 縺ｯ譌｢蟄倥・繝槭ル繝輔ぉ繧ｹ繝域欠邏九↓蜷ｫ縺ｾ繧後∪縺吶ゅΟ繧ｱ繝ｼ繝ｫ蛻･
繝壹・繧ｸ縺ｯ繝代せ縺斐→縺ｫ迢ｬ遶九＠縺溷・蜉帙↑縺ｮ縺ｧ縲∬ｨ隱樣俣縺ｧ蜃ｺ蜉帙ｒ隱､縺｣縺ｦ蜀榊茜逕ｨ縺励∪縺帙ｓ縲・
