# SPA performance benchmark

Date: 2026-10-21

## Method

`pnpm benchmark:spa` packs the 51 public packages, installs them into an isolated temporary copy of `tests/external-site/fixture`, and measures production builds and a local static server with Puppeteer. Every mode has five cold builds and five browser trials. The server sends `Cache-Control: no-store` so browser HTTP cache does not hide a navigation request.

The initial metric is `navigationStart` to `DOMContentLoaded` after `main#main-content` is present. Traditional navigation ends at the same document marker. SPA navigation ends at the `riebeckite:navigation` event, after lifecycle work and page commit; no `networkidle` timing is used. Hover prefetch records target-page requests before and after the click. Outliers are retained; median, minimum, maximum, and spread are reported.

Memory is `JSHeapUsedSize` after 0, 10, 25, and 50 forward/back transitions in a fresh page for each point. Chromium was not launched with exposed GC, so the measurements are uncontrolled and do not establish a leak verdict.

## Environment

| Item | Value |
| --- | --- |
| Node | v24.22.0 |
| pnpm | 11.5.3 |
| OS | Windows x64 |
| CPU | Intel Core i7-14700KF |
| RAM | 31.8 GiB |
| Browser | HeadlessChrome 153.0.8010.36 |
| Fixture | external-site fixture, packed public tarballs |
| Samples | 5 per mode |

## Results

| Mode | Cold build median (min–max) | Initial median (min–max) | Navigation median (min–max) | JS raw / gzip / brotli |
| --- | ---: | ---: | ---: | ---: |
| SPA off | 10,333 ms (9,119–12,396) | 9.2 ms (8.9–43.2) | 37.8 ms (35.9–39.6) | 1,298,033 / 408,482 / 350,567 B |
| SPA on, no prefetch | 10,345 ms (9,944–12,837) | 10.4 ms (8.9–34.8) | 91.9 ms (86.9–187.7) | 1,303,603 / 410,197 / 352,039 B |
| SPA on, hover prefetch | 10,511 ms (10,101–12,299) | 9.6 ms (9.1–34.7) | 55.5 ms (47.5–841.0) | 1,303,608 / 410,198 / 352,068 B |

| Mode | Target requests before click | Target requests after click | Target bytes before click | Heap at 0 / 10 / 25 / 50 transitions |
| --- | ---: | ---: | ---: | ---: |
| SPA off | 0 | 5 | 0 B | 1.0 / 12.4 / 27.7 / 40.3 MiB |
| SPA on, no prefetch | 0 | 5 | 0 B | 1.0 / 2.9 / 2.9 / 3.8 MiB |
| SPA on, hover prefetch | 5 | 5 | 60,365 B | 1.0 / 4.4 / 5.0 / 6.1 MiB |

Hover mode fetched the target once per trial before click and did not request it again after click: five useful prefetches, no measured duplicate target fetches. This harness does not exercise abandoned hovers, so unnecessary-prefetch volume is not available.

## Interpretation

SPA adds 5,570 B raw, 1,715 B gzip, and 1,472 B brotli to this fixture’s unique JavaScript assets. The SPA-off build is smaller, which confirms the SPA runtime is not present in that mode. Initial load medians are effectively unchanged. On this local no-store fixture, the no-prefetch SPA completion median is slower than a full document marker; hover prefetch reduces the SPA completion median by 36.4 ms. The large SPA maxima are retained rather than discarded.

No optimization was applied: this benchmark alone does not demonstrate a serious regression, and the isolated production E2E verifies both navigation modes and Island behavior.

Raw machine-specific trials are written to ignored `benchmarks/results/<timestamp>-spa.json`.
