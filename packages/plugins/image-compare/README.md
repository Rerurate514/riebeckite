# @riebeckite/plugin-image-compare

Before/after image comparison for Riebeckite. Write a fenced `image-compare` block and the plugin renders a slider with a static no-JavaScript fallback.

````markdown
```image-compare
before: ./before.png
after: ../assets/after.png
beforeAlt: Draft
afterAlt: Published
orientation: horizontal
label: Home page
```
````

Images resolve relative to the note, using the same rules as Markdown images. `orientation` is `horizontal` or `vertical`; `label` and the alt texts are optional. The slider supports mouse, touch, and keyboard through a native range input.

```ts
import { imageCompare } from "@riebeckite/plugin-image-compare";

plugins: [imageCompare()];
```

Options: `language` changes the fence language. Without JavaScript the two images are shown side by side (stacked vertically for narrow viewports). Styles use the existing `--rb-color-*` theme tokens.
