---
title: Analytics Demo
description: A published note used to verify provider analytics injection.
id: analytics-demo
publish: true
---

# Analytics Demo

This note exercises `@riebeckite/plugin-analytics`. Every built entry with a
stable content ID carries a hidden content-ID marker, and the browser
initializer sends one `page_view` to the configured collector URL.

RIEBECKITE_EXTERNAL_ANALYTICS_PAGE_MARKER
