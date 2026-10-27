# Theme visual regression

This suite captures every official theme in explicit light and dark mode, checks the rendered fixture for contrast and layout problems, and compares the PNGs with the reviewed baseline.

The baseline captures are not an approval of visual quality. A passing comparison only means that nothing changed beyond the pixel tolerance. Human review is still required for readability, spacing, and aesthetic judgement.

## Fixed environment

- Chrome `155.0.8059.79`
- Desktop viewport `1440x1200`, mobile viewport `375x900`
- Device scale factor `1`
- Timezone `UTC`, locale `en-US`
- Reduced motion; animations, transitions, and carets disabled
- Theme fonts embedded as data URLs
- Color profile sRGB, LCD text disabled, font hinting disabled

The baseline manifest records the Chrome version, platform, viewports, and image hashes. A different Chrome version or platform fails before comparison instead of producing misleading diffs. System-font differences remain possible on another machine with the same platform, so regenerate and review the baseline only in the documented environment.

## Usage

Install Chrome 155 and point `PUPPETEER_EXECUTABLE_PATH` at the executable:

```powershell
npx puppeteer browsers install chrome@155.0.8059.79
$env:PUPPETEER_EXECUTABLE_PATH = "C:\path\to\chrome.exe"
pnpm test:visual
```

The default command captures to `tests/visual/report/actual`, compares against `tests/visual/baselines`, and writes `tests/visual/report/index.html`. Generated actual, diff, and report files are ignored by Git.

On a mismatch, review the side-by-side baseline, current, and diff images in the report. Update the baseline only after deciding that the change is intentional:

```powershell
pnpm test:visual:update
```

`test:visual:update` is the only operation that replaces baselines. A normal check never updates them. It also regenerates `tests/visual/baselines/report.html` for review.

## Baseline review

- `tests/visual/baselines/manifest.json`: fixed environment and image hashes.
- `tests/visual/baselines/report.html`: all desktop captures, representative mobile captures, and the automated checks.
- `tests/visual/report/index.html`: comparison result, actual images, and per-image diffs.

The comparison uses a per-channel tolerance of 8 and a maximum changed ratio of 0.05%. Keep both values fixed unless the rendering environment changes and the new tolerance is justified in review.
